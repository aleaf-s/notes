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

  $ripgrep = Get-Command rg -ErrorAction SilentlyContinue
  if ($null -ne $ripgrep) {
    $matches = & $ripgrep.Source --pcre2 -n $Pattern @Paths
    $searchExitCode = $LASTEXITCODE
  } else {
    # PCRE2 and .NET spell braced Unicode escapes differently.
    $dotNetPattern = $Pattern.Replace('\x{2019}', '\u2019').Replace('\x{27}', '\u0027')
    $textExtensions = @(
      ".css", ".htm", ".html", ".js", ".json", ".md", ".scss",
      ".svg", ".txt", ".xml", ".yaml", ".yml"
    )
    $files = foreach ($path in $Paths) {
      if (Test-Path -LiteralPath $path -PathType Container) {
        Get-ChildItem -LiteralPath $path -Recurse -File |
          Where-Object { $textExtensions -contains $_.Extension.ToLowerInvariant() }
      } elseif (Test-Path -LiteralPath $path -PathType Leaf) {
        Get-Item -LiteralPath $path
      }
    }

    $matches = @(
      foreach ($file in $files) {
        Select-String -LiteralPath $file.FullName -Pattern $dotNetPattern | ForEach-Object {
          $relativePath = [System.IO.Path]::GetRelativePath($root, $_.Path)
          "${relativePath}:$($_.LineNumber):$($_.Line)"
        }
      }
    )
    $searchExitCode = if ($matches.Count -gt 0) { 0 } else { 1 }
  }

  if ($searchExitCode -eq 0) {
    Write-Host "[warn] $Name" -ForegroundColor Yellow
    $matches | ForEach-Object { Write-Host "  $_" }
    $script:failed = $true
  } elseif ($searchExitCode -gt 1) {
    throw "Search failed while running: $Name"
  } else {
    Write-Host "[ok] $Name" -ForegroundColor Green
  }
}

Invoke-Check `
  -Name "No hard-coded root asset links in templates" `
  -Pattern 'href="/|src="/' `
  -Paths @("_includes", "_layouts", "blog.html", "about.md", "index.md")

Invoke-Check `
  -Name "No repository-name-coupled image paths" `
  -Pattern '\]\(/notes/' `
  -Paths @("_posts", ".vscode")

Invoke-Check `
  -Name "No empty or placeholder image alt text" `
  -Pattern '!\[(?:alt\s*text|all\s*text|image)?\]\(' `
  -Paths @("_posts")

Invoke-Check `
  -Name "No fragile bare relative image paths" `
  -Pattern '!\[[^\]]*\]\((?!https?:|/|\{\{|data:|#)[^)]+\)' `
  -Paths @("_posts")

Invoke-Check `
  -Name "No inline/block math with raw pipe characters" `
  -Pattern '\$[^\r\n$]*(?<!\\)\|[^\r\n$]*\$|\$\$[^\r\n$]*(?<!\\)\|[^\r\n$]*\$\$' `
  -Paths @("_posts")

Invoke-Check `
  -Name "No unused pagination config" `
  -Pattern '^paginate:|^paginate_path:' `
  -Paths @("_config.yml")

if (Test-Path "_site") {
  & ruby (Join-Path $PSScriptRoot "check-images.rb")
  if ($LASTEXITCODE -ne 0) {
    $script:failed = $true
  }

  Invoke-Check `
    -Name "No Markdown-emphasis fragments inside generated math" `
    -Pattern '<em>\{|</em>\{' `
    -Paths @("_site")

  Invoke-Check `
    -Name "No smart-prime subscripts inside generated inline math" `
    -Pattern '\$[^\r\n$]*[A-Za-z0-9]\x{2019}[_A-Za-z0-9]|\$[^\r\n$]*[A-Za-z0-9]\x{27}_[^\r\n$]*\$' `
    -Paths @("_site")
}

if ($failed) {
  Write-Host "Checks finished with warnings." -ForegroundColor Yellow
  exit 1
}

Write-Host "All checks passed." -ForegroundColor Green
