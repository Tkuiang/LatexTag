$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root "dist"
$zip = Join-Path $root "package.zip"

if (-not (Test-Path $dist)) {
    throw "dist directory was not created. Run pnpm run build first."
}

$items = @(
    "plugin.json",
    "README.md",
    "README.zh-CN.md",
    "LICENSE",
    "icon.png",
    "preview.png"
)

foreach ($item in $items) {
    Copy-Item -Path (Join-Path $root $item) -Destination $dist -Force
}

$sourceI18n = Join-Path $root "src\i18n"
$targetI18n = Join-Path $dist "i18n"
if (Test-Path $targetI18n) {
    Remove-Item $targetI18n -Recurse -Force
}
Copy-Item -Path $sourceI18n -Destination $targetI18n -Recurse -Force

if (Test-Path $zip) {
    Remove-Item $zip -Force
}

Compress-Archive -Path (Join-Path $dist "*") -DestinationPath $zip -Force
