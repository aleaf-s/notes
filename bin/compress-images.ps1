# Losslessly compress pasted screenshots and optionally convert them to WebP.
#
# Defaults: PNG screenshots >= 100 KB become lossless WebP only when this
# saves at least 8%. Otherwise the PNG is optimized losslessly. JPEG files are
# untouched unless -LossyPhotos is explicitly supplied. Source references are
# updated after successful format conversion.
#
# Preview: powershell -ExecutionPolicy Bypass -File bin/compress-images.ps1 -WhatIf
# Apply:   powershell -ExecutionPolicy Bypass -File bin/compress-images.ps1

param(
  [string]$Path = "assets",
  [int]$MinKB = 100,
  [ValidateRange(1, 90)]
  [int]$MinSavingsPercent = 8,
  [switch]$WhatIf,
  [switch]$KeepOriginals,
  [switch]$Backup,
  [switch]$LossyPhotos,
  [string]$Python
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$target = Join-Path $repoRoot $Path
$worker = Join-Path $PSScriptRoot 'compress_images.py'

if (-not (Test-Path -LiteralPath $target -PathType Container)) {
  throw "Image directory not found: $target"
}

function Test-PillowPython {
  param([string]$Executable)
  if (-not $Executable -or -not (Test-Path -LiteralPath $Executable -PathType Leaf)) {
    return $false
  }
  & $Executable -c "import PIL" 2>$null
  return $LASTEXITCODE -eq 0
}

if (-not $Python) {
  $command = Get-Command python -ErrorAction SilentlyContinue
  if ($command -and (Test-PillowPython $command.Source)) {
    $Python = $command.Source
  } else {
    $userProfile = [Environment]::GetFolderPath('UserProfile')
    $runtimeRoot = Join-Path $userProfile '.cache\codex-runtimes'
    $candidate = Get-ChildItem $runtimeRoot -Recurse -Filter python.exe -File -ErrorAction SilentlyContinue |
      Where-Object { Test-PillowPython $_.FullName } |
      Select-Object -First 1
    if ($candidate) {
      $Python = $candidate.FullName
    }
  }
}

if (-not (Test-PillowPython $Python)) {
  throw "Python with Pillow was not found. Pass its path with -Python."
}

$arguments = @(
  $worker, $repoRoot, $target, $MinKB, $MinSavingsPercent,
  [int][bool]$WhatIf, [int][bool]$KeepOriginals, [int][bool]$Backup, [int][bool]$LossyPhotos
)
$output = & $Python @arguments
if ($LASTEXITCODE -ne 0) {
  throw "Image compressor failed with exit code $LASTEXITCODE."
}

$converted = @($output | Where-Object { $_ -like 'CONVERTED|*' })
$planned = @($output | Where-Object { $_ -like 'PLAN|*' })
$optimized = @($output | Where-Object { $_ -like 'OPTIMIZED|*' -or $_ -like 'PLAN_PNG|*' })
$errors = @($output | Where-Object { $_ -like 'ERROR|*' })

if (-not $WhatIf -and $converted.Count -gt 0) {
  $extensions = @('*.md', '*.html', '*.yml', '*.yaml', '*.css', '*.scss', '*.js', '*.json')
  $sourceFiles = Get-ChildItem $repoRoot -Recurse -File -Include $extensions |
    Where-Object { $_.FullName -notmatch '[\\/](?:_site|ruby31|tmp|vendor|\.git|\.jekyll-cache)[\\/]' }
  $utf8NoBom = [System.Text.UTF8Encoding]::new($false)

  foreach ($line in $converted) {
    $parts = $line -split '\|', 5
    $oldPath = $parts[1]
    $newPath = $parts[2]
    $oldEncoded = $oldPath.Replace(' ', '%20')
    $newEncoded = $newPath.Replace(' ', '%20')

    foreach ($file in $sourceFiles) {
      $text = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
      $updated = $text.Replace($oldPath, $newPath).Replace($oldEncoded, $newEncoded)
      if ($updated -cne $text) {
        [System.IO.File]::WriteAllText($file.FullName, $updated, $utf8NoBom)
      }
    }
  }
}

$records = @($output | ForEach-Object {
  $parts = $_ -split '\|', 5
  if ($parts.Count -ge 4) {
    [PSCustomObject]@{
      Result = $parts[0]
      File = $parts[1]
      BeforeKB = [math]::Round([double]$parts[3] / 1KB)
      AfterKB = if ($parts[0] -eq 'ERROR') { '-' } else { [math]::Round([double]$parts[4] / 1KB) }
    }
  }
})
$records | Where-Object { $_.Result -notlike 'SKIPPED*' } | Format-Table -AutoSize

$effective = @($records | Where-Object { $_.Result -match '^(?:CONVERTED|PLAN|OPTIMIZED|PLAN_PNG)$' })
$before = ($effective | Measure-Object BeforeKB -Sum).Sum
$after = ($effective | ForEach-Object { [double]$_.AfterKB } | Measure-Object -Sum).Sum
$saved = if ($before) { [math]::Round(($before - $after) / 1024, 1) } else { 0 }
Write-Host "Converted/planned: $($converted.Count + $planned.Count); optimized PNG: $($optimized.Count); errors: $($errors.Count); estimated savings: $saved MB."

if ($errors.Count -gt 0) {
  exit 1
}
