<#
  케셰브 AI 보안 도우미 키트 - 매일 자동 점검 끄기

  register-daily-check.ps1 이 등록한 「케셰브 AI 보안 점검」 작업만 지웁니다.
  reports 폴더의 기존 보고서는 그대로 둡니다.
#>
Set-StrictMode -Version 2
$ErrorActionPreference = 'Stop'
$taskName = '케셰브 AI 보안 점검'
$task = Get-ScheduledTask -TaskPath '\' -TaskName $taskName -ErrorAction SilentlyContinue
if (-not $task) { Write-Host "「${taskName}」 작업이 없습니다. 이미 꺼져 있습니다."; exit 0 }
if ($task.Description -notlike '케셰브 AI 보안 도우미 키트*') { Write-Host '같은 이름이지만 이 키트가 만든 작업이 아닙니다. 작업 스케줄러에서 직접 확인하세요.'; exit 1 }
Unregister-ScheduledTask -TaskPath '\' -TaskName $taskName -Confirm:$false
Write-Host "「${taskName}」 작업을 지웠습니다. reports 폴더의 보고서는 그대로 남아 있습니다."
