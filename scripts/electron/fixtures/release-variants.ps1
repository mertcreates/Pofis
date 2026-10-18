param([string]$SourceArchive, [string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
foreach ($version in @('1.0.1', '1.0.2', '1.0.3')) {
    $path = Join-Path $OutputDirectory "$version.zip"
    Copy-Item -LiteralPath $SourceArchive -Destination $path
    $zip = [IO.Compression.ZipFile]::Open($path, [IO.Compression.ZipArchiveMode]::Update)
    try {
        $entry = $zip.GetEntry('resources\app\package.json')
        $reader = [IO.StreamReader]::new($entry.Open())
        $app = $reader.ReadToEnd() | ConvertFrom-Json
        $reader.Dispose()
        $entry.Delete()
        $app.version = $version
        $replacement = $zip.CreateEntry('resources\app\package.json')
        $writer = [IO.StreamWriter]::new($replacement.Open(), [Text.UTF8Encoding]::new($false))
        $writer.Write(($app | ConvertTo-Json -Depth 8)); $writer.Dispose()
        $zip.GetEntry('release.json').Delete()
        $replacement = $zip.CreateEntry('release.json')
        $writer = [IO.StreamWriter]::new($replacement.Open(), [Text.UTF8Encoding]::new($false))
        $writer.Write((@{ schemaVersion = 1; version = $version; platform = 'win32'; arch = 'x64' } | ConvertTo-Json)); $writer.Dispose()
        if ($version -eq '1.0.2') {
            # A real executable whose owned Node utility process deliberately fails at startup.
            $zip.GetEntry('resources\app\electron\server-entry.cjs').Delete()
            $entry = $zip.CreateEntry('resources\app\electron\server-entry.cjs')
            $writer = [IO.StreamWriter]::new($entry.Open())
            $writer.Write('process.exit(42);'); $writer.Dispose()
        }
    } finally { $zip.Dispose() }
    @{ schemaVersion = 1; version = $version; platform = 'win32'; arch = 'x64'; url = "$version.zip";
        sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant(); size = (Get-Item -LiteralPath $path).Length } |
        ConvertTo-Json | Set-Content -LiteralPath (Join-Path $OutputDirectory "$version.json") -Encoding UTF8
}
