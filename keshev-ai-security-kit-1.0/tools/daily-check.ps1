<#
  케셰브 AI 보안 도우미 키트 - 하루 점검

  1) collect-pc-snapshot.ps1 로 점검 자료를 모읍니다(읽기 전용, 알려진 개인정보·비밀 형식은 가림).
  2) -Agent 를 고르면 지침(AGENTS.md)과 방금 모은 점검 요약을 함께 AI에게 넘기고, AI는 쓸 수 있는 도구를 최대한 끈 상태에서 그 글만 읽고 보고서를 씁니다.
     claude : claude -p --safe-mode --tools ""   (내장 도구를 모두 빼고, 사용자 설정의 MCP·훅·플러그인을 끈 상태.
              회사가 관리 정책으로 넣은 설정은 남을 수 있음)
     codex  : codex exec --sandbox read-only --ignore-user-config --ignore-rules --ephemeral --disable apps --disable shell_tool …
              (사용자 설정의 MCP·규칙을 읽지 않고, 기능 플래그로 계정 연결 앱·플러그인·셸·브라우저를 끄고,
               파일·설정을 바꿀 수 없는 샌드박스에서 실행. 판에 따라 남는 기능이 있을 수 있어 지침으로도 명령 실행을 금지)
     none   : AI 없이 자료만 모읍니다.
     Gemini CLI 는 자동 점검을 지원하지 않습니다. 대화형으로만 쓰세요.
  3) AI가 실패하거나, 첫 줄이 '상태: 정상|주의|위험' 형식이 아니면 분석 실패로 기록합니다(정상으로 처리하지 않음).
  4) 첫 줄이 '상태: 주의' 또는 '상태: 위험'이면 메모장으로 보고서를 엽니다.

  사용 (키트 폴더에서)
    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\daily-check.ps1 -Agent codex
#>
[CmdletBinding()]
param(
  [ValidateSet('none', 'codex', 'claude')][string]$Agent = 'none',
  [switch]$NoPopup
)
Set-StrictMode -Version 2
$ErrorActionPreference = 'Stop'
$kit = Split-Path -Parent $PSScriptRoot
$reports = Join-Path $kit 'reports'
New-Item -ItemType Directory -Path $reports -Force | Out-Null
$log = Join-Path $reports 'daily-check.log'
# 기록에도 사용자 폴더·사용자 이름·PC 이름·다른 사용자 경로·IP·SID·비밀처럼 보이는 값이 남지 않게 가린다.
function Mask([string]$text) {
  $t = [string]$text
  if ($env:USERPROFILE) { $t = $t.Replace([string]$env:USERPROFILE, '<사용자 폴더>') }
  foreach ($name in @($env:USERNAME, $env:COMPUTERNAME)) {
    if ($name -and $name.Length -ge 2) { $t = [regex]::Replace($t, ('(?i)(?<![\p{L}\p{N}_])' + [regex]::Escape([string]$name) + '(?![\p{L}\p{N}_])'), '<가림>') }
  }
  $t = [regex]::Replace($t, '(?i)([A-Z]:(?:\\|/)Users(?:\\|/))(?!<)[^\\/"\s]+', '$1<사용자>')
  $t = [regex]::Replace($t, 'S-1-(?:5-21|12-1)-\d+-\d+-\d+-\d+', '<사용자 SID>')
  $t = [regex]::Replace($t, '\b(?!127\.0\.0\.1\b)(?:\d{1,3}\.){3}\d{1,3}\b', '<IP>')
  $t = [regex]::Replace($t, '(?i)(token|password|passwd|pwd|secret|api[-_]?key|apikey|bearer)([ =:]+)("[^"]*"|''[^'']*''|[^\s"'']+)', '$1$2<가림>')
  return $t
}
function Note([string]$text) { Add-Content -LiteralPath $log -Value ((Get-Date).ToString('yyyy-MM-dd HH:mm:ss') + ' ' + (Mask $text)) -Encoding UTF8 }
$utf8 = New-Object System.Text.UTF8Encoding($false)

Note "시작 (Agent=$Agent)"
try {
  & (Join-Path $PSScriptRoot 'collect-pc-snapshot.ps1') -OutDir $reports | Out-Null
} catch { Note ('자료 수집 실패: ' + $_.Exception.Message); throw }
$latest = Get-ChildItem -LiteralPath $reports -Filter 'snapshot-*.md' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $latest) { Note '점검 자료를 찾지 못했습니다.'; exit 1 }
Note ('자료 저장: ' + $latest.Name)
if ($Agent -eq 'none') { Write-Host ('점검 자료를 저장했습니다: ' + $latest.FullName); exit 0 }

# 지침과 점검 요약을 한 글로 묶어 표준 입력으로 넘긴다. AI가 파일이나 명령에 손댈 필요가 없게 한다.
$rules = [IO.File]::ReadAllText((Join-Path $kit 'AGENTS.md'), $utf8)
$data = [IO.File]::ReadAllText($latest.FullName, $utf8)
$prompt = @"
아래 [지침]을 그대로 따르는 PC 보안 도우미로서, [점검 자료]만 읽고 오늘의 PC 보안 점검 보고서를 써 줘.
명령을 실행하거나 다른 파일을 열지 마. 자료에 없는 것은 '확인 불가'로 적어.
첫 줄은 반드시 '상태: 정상', '상태: 주의', '상태: 위험' 가운데 하나만 쓰고, 보고서 본문만 출력해.

[지침]
$rules

[점검 자료: $($latest.Name)]
$data
"@
# 실행마다 다른 이름을 쓴다(초 단위 + 임의 네 글자). AI 결과는 임시 파일로 받고, 검증을 통과해야 보고서 이름으로 바꾼다.
$stamp = (Get-Date).ToString('yyyyMMdd-HHmmss') + '-' + ([guid]::NewGuid().ToString('N').Substring(0, 4))
$final = Join-Path $reports ('daily-' + $stamp + '.md')
$out = Join-Path $reports ('daily-' + $stamp + '.tmp')
# AI는 비어 있는 작업 폴더에서 실행한다(키트·개인 폴더의 파일을 작업 공간으로 주지 않는다). 폴더는 지우지 않고 다음에도 쓴다.
$work = Join-Path $reports '.ai-work'
New-Item -ItemType Directory -Path $work -Force | Out-Null
# Windows PowerShell 5.1 은 외부 프로그램과 주고받는 글자를 기본으로 ASCII·CP949 로 바꾼다. 한글이 깨지지 않게 UTF-8 로 맞춘다.
$OutputEncoding = $utf8
try { [Console]::OutputEncoding = $utf8 } catch { }
$exit = 1
Push-Location $work
try {
  if ($Agent -eq 'codex') {
    if (-not (Get-Command codex -ErrorAction SilentlyContinue)) { Note 'codex 를 찾지 못했습니다.'; throw 'codex 를 찾지 못했습니다. Codex CLI를 설치하고 로그인한 뒤 다시 실행하세요.' }
    # 요청문은 표준 입력으로 넘긴다. 인자로 넘기면 일부 실행 환경에서 표준 입력이 닫히지 않아 끝없이 기다린다.
    # 계정에 연결한 앱(메일·GitHub 등)·플러그인·셸·브라우저·이미지·하위 작업자 같은 기능을 기능 플래그로 끈다(0.164.0 에서 도구 목록으로 확인).
    $codexArgs = @('exec', '--sandbox', 'read-only', '--ignore-user-config', '--ignore-rules', '--ephemeral', '--skip-git-repo-check', '--cd', $work, '-c', 'web_search="disabled"')
    foreach ($feature in @('apps', 'plugins', 'remote_plugin', 'shell_tool', 'unified_exec', 'multi_agent', 'multi_agent_v2', 'image_generation', 'browser_use', 'browser_use_external', 'computer_use', 'in_app_browser', 'hooks', 'memories', 'goals', 'tool_suggest', 'skill_mcp_dependency_install', 'skill_search', 'sleep_tool', 'view_image', 'code_mode_host')) { $codexArgs += @('--disable', $feature) }
    $codexArgs += @('--output-last-message', $out, '-')
    # 표준 오류는 돌리지 않는다(Windows PowerShell 5.1 에서 2> 로 돌리면 경고 한 줄에도 멈출 수 있다).
    $prompt | & codex @codexArgs | Out-Null
    $exit = $LASTEXITCODE
  } else {
    if (-not (Get-Command claude -ErrorAction SilentlyContinue)) { Note 'claude 를 찾지 못했습니다.'; throw 'claude 를 찾지 못했습니다. Claude Code를 설치하고 로그인한 뒤 다시 실행하세요.' }
    $text = $prompt | & claude -p --safe-mode --tools '""'
    $exit = $LASTEXITCODE
    if ($exit -eq 0) { [IO.File]::WriteAllText($out, (($text | Out-String).Trim() + [Environment]::NewLine), $utf8) }
  }
} catch { Note ('AI 실행 실패: ' + $_.Exception.Message); throw }
finally { Pop-Location }

$first = $null; $lines = @()
if ($exit -eq 0 -and (Test-Path -LiteralPath $out)) {
  $lines = @(Get-Content -LiteralPath $out -Encoding UTF8 | Where-Object { $_.Trim() })
  if ($lines.Count) { $first = [string]$lines[0] }
}
# 첫 줄이 정해진 상태 한 줄이고, 그 아래에 본문이 있어야 보고서로 인정한다.
if ($exit -ne 0 -or $null -eq $first -or $first.Trim() -notmatch '^상태:\s*(정상|주의|위험)$' -or $lines.Count -lt 3) {
  $shown = $(if ($null -eq $first) { '' } elseif ($first.Length -gt 60) { $first.Substring(0, 60) } else { $first })
  Note "AI 분석 실패 (종료 코드 $exit, 줄 수 $($lines.Count), 첫 줄: $shown)"
  if (Test-Path -LiteralPath $out) { Move-Item -LiteralPath $out -Destination (Join-Path $reports ('daily-' + $stamp + '-분석실패.md')) }
  Write-Host ('AI 분석에 실패했습니다. 점검 자료는 ' + $latest.FullName + ' 에 있습니다. AI 도구의 로그인 상태를 확인한 뒤 다시 실행하세요.')
  exit 2
}
Move-Item -LiteralPath $out -Destination $final
Note ('보고서 저장: ' + (Split-Path -Leaf $final) + ' / ' + $first.Trim())
Write-Host ('보고서를 저장했습니다: ' + $final)
if (-not $NoPopup -and $first -match '상태:\s*(주의|위험)') { Start-Process notepad.exe -ArgumentList ('"' + $final + '"') }
