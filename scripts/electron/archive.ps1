param([Parameter(Mandatory = $true)][string]$Source, [Parameter(Mandatory = $true)][string]$Destination)
$ErrorActionPreference = 'Stop'
if ([IO.File]::Exists($Destination)) { throw 'Dağıtım ZIP hedefi zaten var.' }
$tar = Join-Path $env:SystemRoot 'System32\tar.exe'
$names = @([IO.Directory]::EnumerateFileSystemEntries($Source) | ForEach-Object { [IO.Path]::GetFileName($_) })
if ([IO.File]::Exists($tar) -and $names.Count) {
    # Explicit ZIP format also covers release.cjs's .zip.partial destination.
    # Enumerate the root entries so the ZIP has no ./ root entry.
    & $tar -c -f $Destination --format=zip --options zip:compression=deflate,zip:compression-level=1 -C $Source -- @names
    if ($LASTEXITCODE -ne 0) { throw "Dağıtım ZIP'i oluşturulamadı (tar: $LASTEXITCODE)." }
    return
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($Source, $Destination, [IO.Compression.CompressionLevel]::Fastest, $false)
