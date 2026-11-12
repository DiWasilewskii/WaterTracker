# Готує непомітне оновлення гри для застосунку Android.
# Рахує SHA-256 файлів гри і записує web-version.json. Якщо файли змінились —
# збільшує номер версії. Після цього достатньо закомітити й запушити в main:
# застосунки самі завантажать оновлення з GitHub (без нового APK).
#
#   powershell -ExecutionPolicy Bypass -File web-release.ps1
#
# -MinNativeCode — мінімальний versionCode APK, якому підходить ця версія гри
# (збільшуйте, коли гра починає використовувати нові можливості AndroidBridge).
param([int]$MinNativeCode = 0)
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$JsonPath = Join-Path $Root "web-version.json"

# Файли, які входять у гру (і в APK, і в оновлення)
$Files = @(
    "index.html",
    "manifest.json",
    "css/style.css",
    "js/app.js",
    "js/weather.js",
    "js/lines.js",
    "js/women.js",
    "js/schedule.js",
    "js/chart.js",
    "js/firebase-config.js",
    "js/cloud.js",
    "img/button/glass.png",
    "img/charachter/regular_water.png",
    "img/charachter/drink_water.png",
    "img/charachter/sick_water.png",
    "img/charachter/death_water.png",
    "img/icon-192.png"
)

# Текстові файли в git зберігаються з LF — рахуємо хеш саме для такого вмісту,
# бо застосунок завантажує їх із GitHub
function Get-ReleaseBytes([string]$rel) {
    $bytes = [IO.File]::ReadAllBytes((Join-Path $Root $rel))
    if ($rel -match '\.(html|css|js|json)$') {
        $text = [Text.Encoding]::UTF8.GetString($bytes).Replace("`r`n", "`n")
        $bytes = (New-Object Text.UTF8Encoding $false).GetBytes($text)
    }
    return ,$bytes
}

$sha = [Security.Cryptography.SHA256]::Create()
$hashes = [ordered]@{}
foreach ($f in $Files) {
    $hashes[$f] = -join ($sha.ComputeHash((Get-ReleaseBytes $f)) | ForEach-Object { $_.ToString("x2") })
}

$old = $null
if (Test-Path $JsonPath) { $old = Get-Content $JsonPath -Raw -Encoding UTF8 | ConvertFrom-Json }
$version = 1
$minNative = $MinNativeCode
if ($old) {
    $changed = $false
    foreach ($f in $Files) { if ($old.files.$f -ne $hashes[$f]) { $changed = $true } }
    if (@($old.files.PSObject.Properties).Count -ne $Files.Count) { $changed = $true }
    if ($MinNativeCode -eq 0) { $minNative = [int]$old.minNativeCode }
    elseif ($MinNativeCode -ne [int]$old.minNativeCode) { $changed = $true }
    $version = if ($changed) { [int]$old.version + 1 } else { [int]$old.version }
}

$lines = @("{", "  `"version`": $version,", "  `"minNativeCode`": $minNative,", "  `"files`": {")
$i = 0
foreach ($f in $Files) {
    $i++
    $comma = if ($i -lt $Files.Count) { "," } else { "" }
    $lines += "    `"$f`": `"$($hashes[$f])`"$comma"
}
$lines += @("  }", "}")
[IO.File]::WriteAllText($JsonPath, ($lines -join "`n") + "`n", (New-Object Text.UTF8Encoding $false))

if ($old -and $version -eq [int]$old.version) {
    Write-Host "Файли гри не змінились — web-version.json лишається версії $version"
} else {
    Write-Host "web-version.json: версія гри $version (мін. APK versionCode $minNative)"
}
