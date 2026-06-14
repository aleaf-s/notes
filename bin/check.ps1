Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$failed = $false

function Invoke-Check {
  param(
    [string] $Name,
    [string] $Pattern,
    [string[]] $Paths
  )

  $matches = & rg --pcre2 -n $Pattern @Paths
  if ($LASTEXITCODE -eq 0) {
    Write-Host "[warn] $Name" -ForegroundColor Yellow
    $matches | ForEach-Object { Write-Host "  $_" }
    $script:failed = $true
  } elseif ($LASTEXITCODE -gt 1) {
    throw "ripgrep failed while running: $Name"
  } else {
    Write-Host "[ok] $Name" -ForegroundColor Green
  }
}

Invoke-Check `
  -Name "No hard-coded root asset links in templates" `
  -Pattern 'href="/|src="/' `
  -Paths @("_includes", "_layouts", "blog.html", "about.md", "index.md")

Invoke-Check `
  -Name "No inline/block math with raw pipe characters" `
  -Pattern '\$[^\r\n$]*(?<!\\)\|[^\r\n$]*\$|\$\$[^\r\n$]*(?<!\\)\|[^\r\n$]*\$\$' `
  -Paths @("_posts")

Invoke-Check `
  -Name "No unused pagination config" `
  -Pattern '^paginate:|^paginate_path:' `
  -Paths @("_config.yml")

if (Test-Path "_site") {
  Invoke-Check `
    -Name "No Markdown-emphasis fragments inside generated math" `
    -Pattern '<em>\{|</em>\{' `
    -Paths @("_site")

  Invoke-Check `
    -Name "No smart-prime subscripts inside generated inline math" `
    -Pattern '\$[^\r\n$]*[A-Za-z0-9]’[_A-Za-z0-9]|\$[^\r\n$]*[A-Za-z0-9]''_[^\r\n$]*\$' `
    -Paths @("_site")
}

if ($failed) {
  Write-Host "Checks finished with warnings." -ForegroundColor Yellow
  exit 1
}

Write-Host "All checks passed." -ForegroundColor Green
