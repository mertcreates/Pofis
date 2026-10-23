param([Parameter(Mandatory = $true)][string]$Source, [Parameter(Mandatory = $true)][string]$Destination)
$ErrorActionPreference = 'Stop'
if ([IO.File]::Exists($Destination)) { throw 'Dağıtım ZIP hedefi zaten var.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($Source, $Destination, [IO.Compression.CompressionLevel]::Fastest, $false)
