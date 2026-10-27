<#
  케셰브 기본 폴더 패키지 생성기
  - 앱을 dist\Keshev 에 복사하고 그 안에 Windows 바로가기를 만듭니다.
  - 기존 프로젝트 폴더, Git 기록, 로컬 설정·비밀 파일은 복사하거나 변경하지 않습니다.
  - 출력 폴더가 이미 있으면 덮어쓰지 않고 중단합니다.
#>
[CmdletBinding()]
param()
Set-StrictMode -Version 3
$ErrorActionPreference = 'Stop'

if ($env:OS -ne 'Windows_NT') {
  throw 'Windows 바로가기를 만드는 패키징은 Windows PowerShell 환경에서 실행하세요.'
}

$root = Split-Path -Parent $PSScriptRoot
$distRoot = Join-Path $root 'dist'
$packageRoot = Join-Path $distRoot 'Keshev'
if (Test-Path -LiteralPath $packageRoot) {
  throw 'dist\Keshev 폴더가 이미 있습니다. 기존 결과를 보존했습니다. 이동·삭제하지 말고 다른 출력 위치를 담당자와 확인하세요.'
}

$excludedDirectories = @('.git', 'node_modules', 'dist', 'coverage', '.cache', '.alekov-data', 'secrets', 'credentials')
$excludedExtensions = @('.pem', '.key', '.pfx', '.p12', '.p7b', '.sqlite', '.sqlite3', '.db')
$copied = 0
$completed = $false

try {
  New-Item -ItemType Directory -Path $packageRoot -Force:$false | Out-Null
  $pending = [System.Collections.Generic.Stack[string]]::new()
  $pending.Push($root)

  while ($pending.Count -gt 0) {
    $current = $pending.Pop()
    foreach ($item in Get-ChildItem -LiteralPath $current -Force) {
      if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { continue }
      if ($item.PSIsContainer) {
        if ($excludedDirectories -contains $item.Name) { continue }
        $pending.Push($item.FullName)
        continue
      }

      $name = $item.Name
      $extension = $item.Extension.ToLowerInvariant()
      if ($name -match '^\.env(?:\..*)?$' -or $excludedExtensions -contains $extension -or $name -match '\.local\.(?:json|ya?ml|toml)$') { continue }

      $relative = $item.FullName.Substring($root.Length).TrimStart([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
      $destination = Join-Path $packageRoot $relative
      $destinationDirectory = Split-Path -Parent $destination
      if (-not (Test-Path -LiteralPath $destinationDirectory)) {
        New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
      }
      Copy-Item -LiteralPath $item.FullName -Destination $destination
      $copied += 1
    }
  }

  $startScript = Join-Path $packageRoot 'tools\start-alekov.ps1'
  if (-not (Test-Path -LiteralPath $startScript -PathType Leaf)) {
    throw '패키지 안에서 tools\start-alekov.ps1을 찾을 수 없습니다.'
  }

  $shell = New-Object -ComObject WScript.Shell
  $shortcutPath = Join-Path $packageRoot '케셰브 시작.lnk'
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe')
  $shortcut.Arguments = '-NoProfile -ExecutionPolicy Bypass -File "' + $startScript + '"'
  $shortcut.WorkingDirectory = $packageRoot
  $shortcut.Description = '케셰브 로컬 앱 서버 시작'
  $shortcut.Save()

  $batPath = Join-Path $packageRoot '케셰브 시작.bat'
  $batContent = "@echo off`r`nchcp 65001 >nul`r`necho [케셰브 앱 시작 중...]`r`npowershell.exe -NoProfile -ExecutionPolicy Bypass -File `"%~dp0tools\start-alekov.ps1`"`r`npause"
  [System.IO.File]::WriteAllText($batPath, $batContent, (New-Object System.Text.UTF8Encoding $false))

  $completed = $true
  Write-Host '기본 패키지를 만들었습니다.'
  Write-Host "패키지 폴더: $packageRoot"
  Write-Host "포함 파일 수: $copied"
  Write-Host "바로가기: $shortcutPath"
  Write-Host "원클릭 실행 배치: $batPath"
  Write-Host '바로가기는 로컬 앱 서버를 시작합니다. 외부 계정·AI·SDP/XDR 연결 성공을 뜻하지 않습니다.'
} finally {
  if (-not $completed -and (Test-Path -LiteralPath $packageRoot)) {
    Remove-Item -LiteralPath $packageRoot -Recurse -Force
  }
}
