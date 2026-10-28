<#
  케셰브 AI 보안 도우미 키트 - 매일 자동 점검 등록 (선택)

  내 계정의 작업 스케줄러에 「케셰브 AI 보안 점검」 작업 하나를 등록합니다.
   - 관리자 권한이 필요 없습니다. 내가 로그인해 있을 때만 실행됩니다.
   - 같은 이름의 작업이 이미 있으면 바꾸지 않고 멈춥니다. 바꾸려면 unregister-daily-check.ps1 로 먼저 지웁니다.
   - 끄기: powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\unregister-daily-check.ps1

  사용 (키트 폴더에서)
    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\register-daily-check.ps1 -Agent codex -Time 12:30
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][ValidateSet('codex', 'claude', 'none')][string]$Agent,
  [ValidatePattern('^([01]\d|2[0-3]):[0-5]\d$')][string]$Time = '12:30'
)
Set-StrictMode -Version 2
$ErrorActionPreference = 'Stop'
$taskName = '케셰브 AI 보안 점검'
$script = Join-Path $PSScriptRoot 'daily-check.ps1'
if (-not (Test-Path -LiteralPath $script -PathType Leaf)) { throw 'daily-check.ps1 을 찾지 못했습니다. 키트 폴더 구성을 확인하세요.' }
if ($script -match '"') { throw '키트 폴더 경로에 큰따옴표가 있으면 등록할 수 없습니다.' }
if (Get-ScheduledTask -TaskPath '\' -TaskName $taskName -ErrorAction SilentlyContinue) {
  Write-Host "이미 「${taskName}」 작업이 있습니다. 바꾸려면 unregister-daily-check.ps1 을 먼저 실행하세요."
  exit 1
}
$powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $script + '" -Agent ' + $Agent
$action = New-ScheduledTaskAction -Execute $powershell -Argument $arguments -WorkingDirectory (Split-Path -Parent $PSScriptRoot)
$at = [datetime]::ParseExact($Time, 'HH:mm', [Globalization.CultureInfo]::InvariantCulture)
$trigger = New-ScheduledTaskTrigger -Daily -At $at
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 20) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskPath '\' -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description '케셰브 AI 보안 도우미 키트: 읽기 전용 PC 점검과 AI 보고서' | Out-Null
Write-Host "「${taskName}」 작업을 등록했습니다. 매일 $Time 에 실행합니다(AI: $Agent)."
Write-Host '보고서는 키트의 reports 폴더에 쌓이고, 상태가 주의·위험일 때만 메모장으로 열립니다.'
Write-Host ('지금 한 번 시험하려면: powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\daily-check.ps1 -Agent ' + $Agent)
