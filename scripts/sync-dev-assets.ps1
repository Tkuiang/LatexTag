$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$sourceI18n = Join-Path $root "src\i18n"
$targetI18n = Join-Path $root "i18n"

if (Test-Path $targetI18n) {
    Remove-Item $targetI18n -Recurse -Force
}

Copy-Item -Path $sourceI18n -Destination $targetI18n -Recurse -Force
