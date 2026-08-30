Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$genericAlt = '^(?:alt\s*text|all\s*text|image)?$'
$changedFiles = 0
$changedImageCounter = @{ Value = 0 }
$dash = [char]0x2014
$figureCharacter = [char]0x56FE

Get-ChildItem (Join-Path $repoRoot "_posts") -Recurse -Filter *.md -File | ForEach-Object {
  $file = $_
  $source = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
  $titleMatch = [regex]::Match($source, '(?m)^title:\s*["'']?(?<title>.+?)["'']?\s*$')
  $title = if ($titleMatch.Success) { $titleMatch.Groups['title'].Value } else { $file.BaseName }
  $figureCounter = @{ Value = 0 }

  $updated = [regex]::Replace(
    $source,
    '!\[(?<alt>[^\]]*)\]\((?<url>[^)\r\n]+)\)',
    {
      param($match)
      $figureCounter.Value++
      $alt = $match.Groups['alt'].Value.Trim()
      $url = $match.Groups['url'].Value.Trim()
      $generatedAlt = '^' + [regex]::Escape($title) + '\s+.*\d+$'

      if ($alt -match $genericAlt -or $alt -match $generatedAlt) {
        $alt = "$title $dash $figureCharacter $($figureCounter.Value)"
      }

      if ($url -match '^\{\{\s*site\.baseurl\s*\}\}(?<path>/assets/.+)$') {
        $url = "{{ '$($Matches['path'])' | relative_url }}"
      } elseif ($url -match '^/notes(?<path>/assets/.+)$') {
        $url = "{{ '$($Matches['path'])' | relative_url }}"
      }

      $changedImageCounter.Value++
      "![$alt]($url)"
    }
  )

  if ($updated -cne $source) {
    [System.IO.File]::WriteAllText($file.FullName, $updated, $utf8NoBom)
    $changedFiles++
  }
}

Write-Host "Normalized image Markdown in $changedFiles file(s); inspected $($changedImageCounter.Value) image(s)."
