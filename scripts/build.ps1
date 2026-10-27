$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$source = Join-Path $repo 'plugin'
$manifest = Get-Content -LiteralPath (Join-Path $source 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($name in @('entry.js','diagnostics.js')) {
    & node --check (Join-Path $source $name)
    if ($LASTEXITCODE -ne 0) { throw "Syntax check failed: $name" }
}
$dist = Join-Path $repo 'dist'
New-Item -ItemType Directory -Force -Path $dist | Out-Null
$basename = "Aozora剧情罗盘_v$($manifest.version)"
$zip = Join-Path $dist "$basename.zip"
$tpg = Join-Path $dist "$basename.tpg"
Compress-Archive -Path (Join-Path $source '*') -DestinationPath $zip -Force
Copy-Item -LiteralPath $zip -Destination $tpg -Force
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($zip)
try {
    $entries = @($archive.Entries | Where-Object { $_.Name })
    if ($entries.Count -ne 7) { throw 'Unexpected package file count' }
    foreach ($entry in $entries) {
        $stream = $entry.Open()
        $buffer = New-Object IO.MemoryStream
        try {
            $stream.CopyTo($buffer)
            $disk = [IO.File]::ReadAllBytes((Join-Path $source $entry.FullName))
            if ([Convert]::ToBase64String($disk) -cne [Convert]::ToBase64String($buffer.ToArray())) { throw "Package mismatch: $($entry.FullName)" }
        } finally { $stream.Dispose(); $buffer.Dispose() }
    }
} finally { $archive.Dispose() }
$hash = (Get-FileHash -LiteralPath $tpg -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath (Join-Path $dist 'SHA256SUMS.txt') -Value "$hash  $basename.tpg" -Encoding utf8
Write-Output "Verified package: $tpg"

