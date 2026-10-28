<#
  케셰브 AI 보안 도우미 키트 - PC 점검 자료 수집기 (읽기 전용)

  하는 일
   - 백신·방화벽·열린 포트·시작 프로그램·디스크·업데이트·최근 오류 기록·네트워크 상태를 읽어
     reports 폴더에 snapshot-날짜-시각.json 과 .md 로 저장합니다.
   - 과정에서 만든 케셰브 앱이 켜져 있으면 앱의 「내 PC 상태」 값도 함께 담습니다.
   - 사용자 폴더·사용자 이름·PC 이름·계정 번호(SID)·IP 주소·비밀처럼 보이는 값은 <…> 로 가려서 저장합니다(알려진 형식만).

  하지 않는 일
   - 설정을 바꾸거나 프로그램을 설치·삭제·종료하지 않습니다.
   - 문서·사진·브라우저 기록·비밀번호 저장소를 읽지 않습니다.
   - 수집한 자료를 어디에도 보내지 않습니다. AI에게 보여 줄지는 사용자가 정합니다.

  사용 (키트 폴더에서)
    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\collect-pc-snapshot.ps1
#>
[CmdletBinding()]
param(
  [string]$OutDir,
  [ValidateRange(1024, 65535)][int]$KeshevPort = 5189,
  [ValidateRange(1, 14)][int]$EventDays = 3,
  [switch]$SelfTest
)
Set-StrictMode -Version 2
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$kit = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($OutDir)) { $OutDir = Join-Path $kit 'reports' }
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

# 개인 식별 정보와 비밀처럼 보이는 값 가리기.
# 사용자 폴더 경로 → 사용자 이름 → PC 이름 → 계정 번호(SID) → IP 주소 → 비밀 인자·긴 값 순서로 바꿉니다.
# 알려진 형식만 가리므로 완전한 비식별을 보장하지는 않습니다. AI에게 보이기 전에 reports 파일을 직접 확인하세요.
$maskRules = New-Object System.Collections.Generic.List[object]
$profilePath = [string]$env:USERPROFILE
foreach ($value in @($profilePath, $profilePath.Replace('\', '\\'), $profilePath.Replace('\', '/'))) {
  if ($value.Length -ge 4) { $maskRules.Add(@([regex]::Escape($value), '<사용자 폴더>')) }
}
# 계정 이름·PC 이름은 앞뒤가 글자·숫자가 아닐 때만 가린다(이름이 'on'이어도 caption·version 같은 낱말은 그대로 둔다).
# 한국에서 흔한 두 글자 이름도 가린다. 한 글자 이름은 경로 규칙(Users 아래 폴더)에만 맡긴다.
foreach ($pair in @(@([string]$env:USERNAME, '<사용자>'), @([string]$env:COMPUTERNAME, '<PC>'))) {
  if ($pair[0].Length -ge 2) { $maskRules.Add(@(('(?<![\p{L}\p{N}_])' + [regex]::Escape($pair[0]) + '(?![\p{L}\p{N}_])'), $pair[1])) }
}
function Hide([object]$text) {
  if ($null -eq $text) { return $null }
  $s = [string]$text
  foreach ($rule in $maskRules) { $s = [regex]::Replace($s, $rule[0], $rule[1], 'IgnoreCase') }
  # 이름이 짧거나 다른 사용자의 폴더여도 Users 아래 폴더 이름은 가립니다(JSON 의 \\ 표기 포함).
  $s = [regex]::Replace($s, '(?i)([A-Z]:(?:\\|\\\\|/)Users(?:\\|\\\\|/))(?!<)[^\\/"\s]+', '$1<사용자>')
  $s = [regex]::Replace($s, 'S-1-(?:5-21|12-1)-\d+-\d+-\d+-\d+', '<사용자 SID>')
  # IP 주소(각 자리 0~255). 'Version=4.0.0.0' 같은 버전 표기는 그대로 둔다.
  $s = [regex]::Replace($s, '(?<![\d.])(?<!(?i:version)[\s=:]{1,3})(?!127\.0\.0\.1(?![\d.]))(?!0\.0\.0\.0(?![\d.]))(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)(?![\d.])', '<IP>')
  $s = [regex]::Replace($s, '(?i)\bBearer\s+[A-Za-z0-9._~+/=-]+', 'Bearer <가림>')
  # 명령 인자 형태(--token 값, /password:값)만 본다. 'public-key infrastructure' 같은 낱말은 앞이 공백·따옴표·괄호가 아니면 건드리지 않는다.
  $s = [regex]::Replace($s, '(?i)(?<=^|[\s"''(])(--?|/)(token|access[-_]?token|password|passwd|pwd|secret|api[-_]?key|apikey|auth|key)([ =:]+)(?!<가림>)("[^"]*"|''[^'']*''|[^\s"''}\]]+)', '$1$2$3<가림>')
  $s = [regex]::Replace($s, '(?i)\b(token|password|passwd|pwd|secret|api[-_]?key|apikey|access[-_]?key)(\s*[=:]\s*)("[^"]*"|''[^'']*''|[^\s;,&"''}\]]+)', '$1$2<가림>')
  $s = [regex]::Replace($s, '(?<![A-Za-z0-9])[A-Za-z0-9+/_-]{40,}={0,2}(?![A-Za-z0-9])', '<긴 값 가림>')
  return $s
}
# 시작 프로그램은 실행 파일 위치만 남기고 뒤의 인자(토큰·주소가 들어갈 수 있음)는 버립니다.
function Exe-Path([object]$command) {
  $c = ([string]$command).Trim()
  if ($c -eq '') { return '' }
  if ($c.StartsWith('"')) { $end = $c.IndexOf('"', 1); if ($end -gt 0) { return $c.Substring(1, $end - 1) } else { return $c.Trim('"') } }
  # 드라이브 경로로 시작할 때만 확장자까지(공백이 든 폴더 이름 포함) 잡고, 옵션( -x, /x) 앞에서 멈춘다. 그 밖에는 첫 낱말만 남긴다.
  $m = [regex]::Match($c, '(?i)^[A-Z]:[\\/](?:(?! -| /)[^"\r\n])*?\.(exe|lnk|dll|bat|cmd|ps1|vbs|js|msc|cpl)\b')
  if ($m.Success) { return $m.Value }
  return ($c -split '\s+')[0]
}
# 객체의 문자열 값과 속성 이름을 가린다(비밀 이름의 값은 통째로 가림).
$secretKey = '(?i)^(password|passwd|pwd|secret|token|access[-_]?token|api[-_]?key|apikey|access[-_]?key|authorization|cookie)$'
function Clean-Value([object]$v, [int]$depth) {
  if ($null -eq $v -or $depth -gt 12) { return $v }
  if ($v -is [string]) { return (Hide $v) }
  if ($v -is [System.ValueType]) { return $v }
  if ($v -is [System.Collections.IDictionary]) {
    $o = [ordered]@{}
    foreach ($k in @($v.Keys)) {
      $key = [string](Hide ([string]$k)); $n = 2; $baseKey = $key
      while ($o.Contains($key)) { $key = $baseKey + '#' + $n; $n++ }
      $o[$key] = $(if ([string]$k -match $secretKey) { '<가림>' } else { Clean-Value $v[$k] ($depth + 1) })
    }
    return [pscustomobject]$o
  }
  if ($v -is [System.Collections.IEnumerable]) { return ,@(@($v) | ForEach-Object { Clean-Value $_ ($depth + 1) }) }
  $o = [ordered]@{}
  # 이름이 정확히 version·Version 이거나 starterVersion·DisplayVersion 처럼 대문자 Version 으로 끝나는 속성의 숫자 값만 IP로 오인하지 않게 그대로 둔다.
  # (대소문자를 구분하므로 conversion 같은 이름은 해당하지 않는다.)
  # 속성 이름(키)에도 IP·사용자 이름·PC 이름이 들어올 수 있어 키도 가린다. 가린 뒤 이름이 겹치면 번호를 붙인다.
  foreach ($prop in $v.PSObject.Properties) {
    $key = [string](Hide $prop.Name); $n = 2; $baseKey = $key
    while ($o.Contains($key)) { $key = $baseKey + '#' + $n; $n++ }
    $o[$key] = $(if ($prop.Name -match $secretKey) { '<가림>' } elseif ($prop.Name -cmatch '^(?:[Vv]ersion|[A-Za-z]*[a-z]Version)$' -and $prop.Value -is [string] -and $prop.Value -match '^\d+(\.\d+){1,3}$') { $prop.Value } else { Clean-Value $prop.Value ($depth + 1) })
  }
  return [pscustomobject]$o
}
$limits = @{}
if ($SelfTest) {
  $cases = @(
    @('C:\Users\ab\AppData\x.exe --token SAMPLE_TOKEN_123', '<사용자>', 'SAMPLE_TOKEN'),
    @('connect https://192.0.2.10:8443/api password=hunter2;', '<IP>', 'hunter2'),
    @('Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc.def', 'Bearer <가림>', 'eyJhbGci'),
    @('api_key: sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcd', '<가림>', 'ABCDEFGHIJKLMNOP'),
    @('owner S-1-5-21-111-222-333-1001 logged', '<사용자 SID>', 'S-1-5-21-111'),
    @('entra S-1-12-1-111-222-333-444 user', '<사용자 SID>', 'S-1-12-1-111'),
    @('C:/Users/ab/AppData/x.exe', '<사용자>', '/ab/'),
    @('"C:\\Users\\ab\\x.exe"', '<사용자>', '\\ab\\'),
    @('loopback 127.0.0.1 stays', '127.0.0.1', 'NONE_EXPECTED'),
    @('{"detail":"failed password=hunter2"}', 'password=<가림>"}', 'hunter2'),
    @('public-key infrastructure ok', 'public-key infrastructure', '<가림>'),
    @('Version=4.0.0.0 loaded', 'Version=4.0.0.0', '<IP>'),
    @('Version = 4.0.0.0 loaded', 'Version = 4.0.0.0', '<IP>'),
    @('failed password=''hunter2'' and --token ''SAMPLE_TOKEN''', 'password=<가림>', 'hunter2'),
    @('request --token ''SAMPLE_TOKEN'' sent', '--token <가림>', 'SAMPLE_TOKEN')
  )
  $fail = 0
  foreach ($c in $cases) {
    $out = Hide $c[0]
    $ok = $out.Contains($c[1]) -and -not $out.Contains($c[2])
    if (-not $ok) { $fail++ }
    Write-Host ($(if ($ok) { 'PASS ' } else { 'FAIL ' }) + $out)
  }
  # 객체 가림: 버전 이름의 숫자 값만 보존, 비슷한 이름(conversion)·속성 이름에 든 IP 는 가림, 비밀 이름의 값은 통째로 가림.
  $cv = (Clean-Value ([pscustomobject]@{ version = '4.0.0.0'; starterVersion = '10.0.0.1'; conversion = '192.0.2.10'; '192.0.2.11' = 'ok'; token = 'abc' }) 0) | ConvertTo-Json -Compress
  # Windows PowerShell 5.1 의 ConvertTo-Json 은 < > 를 \u003c \u003e 로 적는다. 비교 전에 되돌린다.
  $cv = $cv.Replace('\u003c', '<').Replace('\u003e', '>')
  foreach ($c in @(@('"version":"4.0.0.0"', $true), @('"starterVersion":"10.0.0.1"', $true), @('192.0.2.10', $false), @('192.0.2.11', $false), @('abc', $false), @('"token":"<가림>"', $true))) {
    $ok = ($cv.Contains($c[0]) -eq $c[1]); if (-not $ok) { $fail++ }
    Write-Host ($(if ($ok) { 'PASS ' } else { 'FAIL ' }) + 'Clean-Value ' + $c[0])
  }
  foreach ($c in @(@('"C:\Program Files\A\a.exe" --token X', 'C:\Program Files\A\a.exe'), @('C:\Windows\system32\rundll32.exe C:\x.dll,Run', 'C:\Windows\system32\rundll32.exe'), @('Ollama.lnk', 'Ollama.lnk'), @('powershell -WindowStyle Hidden -Token SECRET -File C:\a\run.ps1', 'powershell'), @('C:\Program Files\B\b.exe -k x', 'C:\Program Files\B\b.exe'))) {
    $got = Exe-Path $c[0]; $ok = ($got -eq $c[1]); if (-not $ok) { $fail++ }
    Write-Host ($(if ($ok) { 'PASS ' } else { 'FAIL ' }) + $got)
  }
  if ($fail) { Write-Host "자체 시험 실패 ${fail}건"; exit 1 }
  Write-Host '자체 시험을 모두 통과했습니다.'; exit 0
}
function Read-Part([scriptblock]$block) {
  # 빈 목록도 '없음'으로 남기기 위해 결과를 감싸서 돌려준다(PowerShell 은 함수 결과의 빈 배열을 $null 로 풀어 버린다).
  try { $result = & $block; return ,$result }
  catch { return [pscustomobject]@{ unavailable = $true; reason = (Hide $_.Exception.Message) } }
}
function Round1([object]$v) { if ($null -eq $v) { return $null }; return [math]::Round([double]$v, 1) }

Write-Host '점검 자료를 모으는 중입니다. 1분 안쪽으로 끝납니다.'
$now = Get-Date

$os = Read-Part {
  $o = Get-CimInstance Win32_OperatingSystem
  $cs = Get-CimInstance Win32_ComputerSystem
  [pscustomobject]@{
    caption = $o.Caption; version = $o.Version; build = $o.BuildNumber
    lastBoot = $o.LastBootUpTime.ToString('o'); uptimeHours = Round1 (($now - $o.LastBootUpTime).TotalHours)
    domainJoined = [bool]$cs.PartOfDomain
    memoryTotalGB = Round1 ($o.TotalVisibleMemorySize / 1MB); memoryFreeGB = Round1 ($o.FreePhysicalMemory / 1MB)
    memoryUsedPercent = Round1 ((1 - $o.FreePhysicalMemory / $o.TotalVisibleMemorySize) * 100)
  }
}
$cpu = Read-Part {
  $p = @(Get-CimInstance Win32_Processor)
  [pscustomobject]@{ name = ([string]($p | Select-Object -First 1).Name).Trim(); loadPercent = Round1 (($p | Measure-Object -Property LoadPercentage -Average).Average) }
}
$disks = Read-Part {
  ,@(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object {
    [pscustomobject]@{ drive = $_.DeviceID; sizeGB = Round1 ($_.Size / 1GB); freeGB = Round1 ($_.FreeSpace / 1GB); freePercent = $(if ($_.Size) { Round1 ($_.FreeSpace / $_.Size * 100) } else { $null }) }
  })
}
$processes = Read-Part {
  $all = @(Get-Process | Where-Object { $_.Id -ne 0 })
  [pscustomobject]@{
    count = $all.Count
    byCpu = @($all | Sort-Object { [double]($_.CPU -as [double]) } -Descending | Select-Object -First 8 | ForEach-Object { [pscustomobject]@{ name = $_.ProcessName; cpuSeconds = Round1 ($_.CPU -as [double]); memoryMB = Round1 ($_.WorkingSet64 / 1MB) } })
    byMemory = @($all | Sort-Object WorkingSet64 -Descending | Select-Object -First 8 | ForEach-Object { [pscustomobject]@{ name = $_.ProcessName; memoryMB = Round1 ($_.WorkingSet64 / 1MB) } })
  }
}
$defender = Read-Part {
  $m = Get-MpComputerStatus
  [pscustomobject]@{
    serviceEnabled = [bool]$m.AMServiceEnabled; antivirusEnabled = [bool]$m.AntivirusEnabled; realTimeProtection = [bool]$m.RealTimeProtectionEnabled
    # 다른 백신을 쓰면 정의 업데이트 시각이 비어 있거나 0001년으로 나온다. 그때는 경과일을 계산하지 않는다.
    signatureUpdated = $(if ($m.AntivirusSignatureLastUpdated -and $m.AntivirusSignatureLastUpdated.Year -ge 2000) { $m.AntivirusSignatureLastUpdated.ToString('o') } else { $null })
    signatureAgeDays = $(if ($m.AntivirusSignatureLastUpdated -and $m.AntivirusSignatureLastUpdated.Year -ge 2000) { Round1 (($now - $m.AntivirusSignatureLastUpdated).TotalDays) } else { $null })
    quickScanAgeDays = $m.QuickScanAge
  }
}
$antivirusProducts = Read-Part {
  ,@(Get-CimInstance -Namespace 'root/SecurityCenter2' -ClassName AntiVirusProduct | ForEach-Object { [pscustomobject]@{ name = $_.displayName; productState = $_.productState } })
}
$firewall = Read-Part { ,@(Get-NetFirewallProfile | ForEach-Object { [pscustomobject]@{ profile = [string]$_.Name; enabled = [bool]$_.Enabled } }) }
$listening = Read-Part {
  $names = @{}
  $every = @(Get-NetTCPConnection -State Listen | Sort-Object LocalPort, LocalAddress -Unique)
  $limits['listening'] = [pscustomobject]@{ total = $every.Count; shown = [math]::Min($every.Count, 60); truncated = ($every.Count -gt 60) }
  ,@($every | Select-Object -First 60 | ForEach-Object {
    $procId = [int]$_.OwningProcess
    if (-not $names.ContainsKey($procId)) { $names[$procId] = $(try { (Get-Process -Id $procId -ErrorAction Stop).ProcessName } catch { '확인 불가' }) }
    $addr = [string]$_.LocalAddress
    $all = ($addr -eq '0.0.0.0' -or $addr -eq '::')
    $shown = $(if ($all -or $addr -eq '127.0.0.1' -or $addr -eq '::1') { $addr } else { '<이 PC 주소>' })
    [pscustomobject]@{ address = $shown; port = $_.LocalPort; allInterfaces = $all; process = $names[$procId] }
  })
}
$startup = Read-Part {
  $every = @(Get-CimInstance Win32_StartupCommand)
  $limits['startup'] = [pscustomobject]@{ total = $every.Count; shown = [math]::Min($every.Count, 40); truncated = ($every.Count -gt 40) }
  ,@($every | Select-Object -First 40 | ForEach-Object {
    $cmd = [string]$_.Command
    [pscustomobject]@{ name = Hide $_.Name; executable = Hide (Exe-Path $cmd); hasArguments = ((Exe-Path $cmd).Length -lt $cmd.Trim().Trim('"').Length - 1); location = Hide $_.Location }
  })
}
$updates = Read-Part {
  $fixes = @(Get-HotFix | Where-Object { $_.InstalledOn } | Sort-Object InstalledOn -Descending | Select-Object -First 5)
  [pscustomobject]@{
    latest = @($fixes | ForEach-Object { [pscustomobject]@{ id = $_.HotFixID; kind = $_.Description; installedOn = $_.InstalledOn.ToString('yyyy-MM-dd') } })
    daysSinceLatest = $(if ($fixes.Count) { Round1 (($now - $fixes[0].InstalledOn).TotalDays) } else { $null })
  }
}
function Read-Events([string]$log, [int]$max) {
  Read-Part {
    $since = $now.AddDays(-$EventDays)
    # 조건에 맞는 기록이 0건이면 Get-WinEvent 는 빈 목록 대신 오류를 낸다. 그 경우만 '없음'으로 보고, 권한 부족 같은 다른 오류는 확인 불가로 남긴다.
    $found = @(try { Get-WinEvent -FilterHashtable @{ LogName = $log; Level = 1, 2; StartTime = $since } -MaxEvents $max -ErrorAction Stop } catch { if ([string]$_.FullyQualifiedErrorId -like 'NoMatchingEventsFound*') { } else { throw } })
    $limits['events-' + $log] = [pscustomobject]@{ shown = $found.Count; max = $max; truncated = ($found.Count -ge $max) }
    ,@($found | ForEach-Object {
      $first = ([string]$_.Message -split "`r?`n" | Select-Object -First 1)
      if ($first.Length -gt 200) { $first = $first.Substring(0, 200) + '…' }
      [pscustomobject]@{ time = $_.TimeCreated.ToString('o'); id = $_.Id; source = $_.ProviderName; level = $_.LevelDisplayName; message = Hide $first }
    })
  }
}
$events = [pscustomobject]@{ days = $EventDays; system = (Read-Events 'System' 30); application = (Read-Events 'Application' 20) }
$network = Read-Part {
  $adapters = @(Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | ForEach-Object { [pscustomobject]@{ name = Hide $_.Name; description = $_.InterfaceDescription; linkSpeed = [string]$_.LinkSpeed } })
  $dns = $(try { [bool](Resolve-DnsName -Name 'www.microsoft.com' -DnsOnly -QuickTimeout -ErrorAction Stop) } catch { $false })
  $https = $(try { [bool](Test-NetConnection -ComputerName 'www.microsoft.com' -Port 443 -InformationLevel Quiet -WarningAction SilentlyContinue) } catch { $false })
  [pscustomobject]@{ adaptersUp = $adapters; dnsLookupOk = $dns; httpsReachable = $https }
}
$keshev = $(try {
  $r = Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/api/pc/status" -f $KeshevPort) -TimeoutSec 5 -UseBasicParsing
  $names = @($r.PSObject.Properties.Name)
  if (($names -contains 'ok') -and $r.ok -eq $true -and ($names -contains 'data')) { [pscustomobject]@{ running = $true; port = $KeshevPort; data = $r.data } }
  else { [pscustomobject]@{ running = $true; port = $KeshevPort; error = $(if ($names -contains 'error') { $r.error } else { '응답 형식이 다릅니다.' }) } }
} catch { [pscustomobject]@{ running = $false; port = $KeshevPort; note = '케셰브 앱이 켜져 있지 않거나 「내 PC 상태」를 지원하지 않는 버전입니다.' } })

$snapshot = [pscustomobject]@{
  schema = 'keshev.ai-security-kit.snapshot.v1'; kitVersion = '1.0'; collectedAt = $now.ToString('o'); readOnly = $true
  os = $os; cpu = $cpu; disks = $disks; processes = $processes
  defender = $defender; antivirusProducts = $antivirusProducts; firewall = $firewall
  listening = $listening; startup = $startup; updates = $updates; events = $events; network = $network; keshevApp = $keshev
  limits = [pscustomobject]$limits
}

$utf8 = New-Object System.Text.UTF8Encoding($false)
$base = Join-Path $OutDir ('snapshot-' + $now.ToString('yyyyMMdd-HHmmss'))
# JSON 글자에 정규식을 바로 적용하면 따옴표·괄호가 지워져 JSON 이 깨진다. 객체의 문자열 값을 먼저 가린 뒤 JSON 으로 바꾼다.
$json = (Clean-Value $snapshot 0) | ConvertTo-Json -Depth 12
[IO.File]::WriteAllText($base + '.json', $json, $utf8)

# 사람이 읽고 AI에게 보여 주기 쉬운 요약본
function Cell([object]$v) { if ($null -eq $v) { return '확인 불가' }; return ([string]$v).Replace('|', '/') }
function Is-Missing([object]$part) { return ($null -eq $part) -or (($part -is [psobject]) -and ($part.PSObject.Properties.Name -contains 'unavailable')) }
$md = New-Object System.Text.StringBuilder
[void]$md.AppendLine('# PC 점검 자료 (' + $now.ToString('yyyy-MM-dd HH:mm') + ')')
[void]$md.AppendLine('')
[void]$md.AppendLine('읽기 전용으로 모은 자료입니다. 원래 값은 같은 이름의 .json 파일에 있습니다.')
[void]$md.AppendLine('')
[void]$md.AppendLine('## 기본 정보')
if (Is-Missing $os) { [void]$md.AppendLine('- 운영체제: 확인 불가') } else {
  [void]$md.AppendLine("- 운영체제: $($os.caption) (빌드 $($os.build))")
  [void]$md.AppendLine("- 마지막 부팅: $($os.lastBoot) · 켜진 지 $($os.uptimeHours)시간")
  [void]$md.AppendLine("- 회사 도메인 가입: $(if ($os.domainJoined) { '예 (회사 PC일 수 있음)' } else { '아니요' })")
  [void]$md.AppendLine("- 메모리: 전체 $($os.memoryTotalGB)GB · 사용 $($os.memoryUsedPercent)%")
}
if (-not (Is-Missing $cpu)) { [void]$md.AppendLine("- CPU: $($cpu.name) · 지금 사용률 $($cpu.loadPercent)%") }
[void]$md.AppendLine('')
[void]$md.AppendLine('## 백신과 방화벽')
if (Is-Missing $defender) { [void]$md.AppendLine('- Windows 보안(Defender): 확인 불가 (다른 백신을 쓰거나 권한이 없을 수 있음)') } else {
  [void]$md.AppendLine("- Defender 실시간 보호: $(if ($defender.realTimeProtection) { '켜짐' } else { '꺼짐' }) · 정의 업데이트 $(if ($null -eq $defender.signatureAgeDays) { '확인 불가' } else { [string]$defender.signatureAgeDays + '일 전' })")
}
if (-not (Is-Missing $antivirusProducts)) { [void]$md.AppendLine("- 등록된 백신: $((@($antivirusProducts) | ForEach-Object { $_.name }) -join ', ')") }
if (Is-Missing $firewall) { [void]$md.AppendLine('- 방화벽: 확인 불가') } else {
  [void]$md.AppendLine("- 방화벽: $((@($firewall) | ForEach-Object { $_.profile + ' ' + $(if ($_.enabled) { '켜짐' } else { '꺼짐' }) }) -join ' · ')")
}
[void]$md.AppendLine('')
[void]$md.AppendLine('## 디스크')
if (Is-Missing $disks) { [void]$md.AppendLine('- 확인 불가') } else { foreach ($d in @($disks)) { [void]$md.AppendLine("- $($d.drive) 전체 $($d.sizeGB)GB · 남은 공간 $($d.freeGB)GB ($($d.freePercent)%)") } }
[void]$md.AppendLine('')
[void]$md.AppendLine('## 업데이트')
if (Is-Missing $updates) { [void]$md.AppendLine('- 확인 불가') } else {
  [void]$md.AppendLine("- 가장 최근 설치: $(Cell $updates.daysSinceLatest)일 전")
  foreach ($u in @($updates.latest)) { [void]$md.AppendLine("- $($u.installedOn) $($u.id) $($u.kind)") }
}
[void]$md.AppendLine('')
[void]$md.AppendLine('## 열린 포트 (대기 중)')
if (Is-Missing $listening) { [void]$md.AppendLine('- 확인 불가') } else {
  [void]$md.AppendLine('| 포트 | 주소 | 모든 주소에서 대기 | 프로그램 |'); [void]$md.AppendLine('|---|---|---|---|')
  foreach ($l in @($listening)) { [void]$md.AppendLine("| $($l.port) | $(Cell $l.address) | $(if ($l.allInterfaces) { '예' } else { '아니요' }) | $(Cell $l.process) |") }
}
[void]$md.AppendLine('')
[void]$md.AppendLine('## 시작 프로그램')
if (Is-Missing $startup) { [void]$md.AppendLine('- 확인 불가') } elseif (@($startup).Count -eq 0) { [void]$md.AppendLine('- 없음') } else {
  [void]$md.AppendLine('| 이름 | 실행 파일 | 인자 있음 | 등록 위치 |'); [void]$md.AppendLine('|---|---|---|---|')
  foreach ($s in @($startup)) { [void]$md.AppendLine("| $(Cell $s.name) | $(Cell $s.executable) | $(if ($s.hasArguments) { '예(내용은 저장하지 않음)' } else { '아니요' }) | $(Cell $s.location) |") }
}
[void]$md.AppendLine('')
[void]$md.AppendLine('## 자원을 많이 쓰는 프로그램')
if (Is-Missing $processes) { [void]$md.AppendLine('- 확인 불가') } else {
  [void]$md.AppendLine("- 실행 중인 프로그램 수: $($processes.count)")
  [void]$md.AppendLine("- CPU 누적 상위: $((@($processes.byCpu) | ForEach-Object { "$($_.name)($($_.cpuSeconds)초)" }) -join ', ')")
  [void]$md.AppendLine("- 메모리 상위: $((@($processes.byMemory) | ForEach-Object { "$($_.name)($($_.memoryMB)MB)" }) -join ', ')")
}
[void]$md.AppendLine('')
[void]$md.AppendLine("## 최근 ${EventDays}일 오류 기록")
foreach ($pair in @(@('시스템', $events.system), @('응용 프로그램', $events.application))) {
  $list = $pair[1]
  if (Is-Missing $list) { [void]$md.AppendLine("- $($pair[0]): 확인 불가 또는 기록 없음"); continue }
  $items = @($list)
  if ($items.Count -eq 0) { [void]$md.AppendLine("- $($pair[0]): 없음"); continue }
  [void]$md.AppendLine("### $($pair[0]) ($($items.Count)건)")
  foreach ($group in ($items | Group-Object source, id | Sort-Object Count -Descending)) {
    $sample = $group.Group[0]
    [void]$md.AppendLine("- $($group.Count)회 · 원본 $($sample.source) · 이벤트 $($sample.id) · $(Cell $sample.message)")
  }
}
[void]$md.AppendLine('')
[void]$md.AppendLine('## 네트워크')
if (Is-Missing $network) { [void]$md.AppendLine('- 확인 불가') } else {
  [void]$md.AppendLine("- 연결된 네트워크 장치: $((@($network.adaptersUp) | ForEach-Object { $_.name + ' ' + $_.linkSpeed }) -join ', ')")
  [void]$md.AppendLine("- 이름 확인(DNS): $(if ($network.dnsLookupOk) { '정상' } else { '실패' }) · HTTPS 연결: $(if ($network.httpsReachable) { '정상' } else { '실패' })")
}
[void]$md.AppendLine('')
[void]$md.AppendLine('## 수집 범위')
$cut = @($limits.GetEnumerator() | Where-Object { $_.Value.truncated } | ForEach-Object { $_.Key })
if ($cut.Count) { [void]$md.AppendLine("- 일부만 수집한 항목: $($cut -join ', '). 이 항목은 전체가 아니므로 '모두 정상'으로 판단하지 마세요.") } else { [void]$md.AppendLine('- 상한에 걸려 잘린 항목은 없습니다.') }
foreach ($k in @($limits.Keys | Sort-Object)) { $v = $limits[$k]; [void]$md.AppendLine("- ${k}: 표시 $($v.shown)$(if ($v.PSObject.Properties.Name -contains 'total') { ' / 전체 ' + $v.total } else { ' / 상한 ' + $v.max })") }
[void]$md.AppendLine('- 사용자 폴더·사용자 이름·PC 이름·SID·IP 주소·비밀처럼 보이는 값은 <…> 로 가렸습니다. 알려진 형식만 가리므로 AI에게 보이기 전에 파일을 한 번 확인하세요.')
[void]$md.AppendLine('')
[void]$md.AppendLine('## 케셰브 앱')
$appBlock = ''
if ($keshev.running -and ($keshev.PSObject.Properties.Name -contains 'data')) {
  [void]$md.AppendLine("- 켜져 있음 (포트 $KeshevPort). 아래는 앱의 「내 PC 상태」 값입니다(가린 뒤 앞부분 2,000자).")
  # 이미 객체 단계에서 가린 값이므로, 아래 마지막 Hide 를 다시 거치지 않게 따로 붙인다(버전 값 보존).
  $kText = (Clean-Value $keshev.data 0) | ConvertTo-Json -Depth 8 -Compress
  if ($kText.Length -gt 2000) { $kText = $kText.Substring(0, 2000) + '…' }
  $appBlock = '```json' + [Environment]::NewLine + $kText + [Environment]::NewLine + '```' + [Environment]::NewLine
}
elseif ($keshev.running) { [void]$md.AppendLine("- 켜져 있지만 「내 PC 상태」를 읽지 못했습니다.") }
else { [void]$md.AppendLine("- 꺼져 있음. 앱 값까지 비교하려면 앱을 켠 뒤 다시 수집하세요.") }

[IO.File]::WriteAllText($base + '.md', ((Hide $md.ToString()) + $appBlock), $utf8)
Write-Host ('점검 자료를 저장했습니다: ' + $base + '.md')
Write-Host '이 폴더에서 claude, codex, gemini 가운데 쓰는 도구를 실행하고 prompts 폴더의 요청문을 붙여 넣으세요.'
