# Збирає встановлюваний APK без Android Studio і Gradle.
# Використання (з кореня репозиторію):
#   powershell -ExecutionPolicy Bypass -File android\build-apk.ps1
# Перший запуск завантажує інструменти (~310 МБ) у %LOCALAPPDATA%\WaterTrackerAndroidTools:
#   - Eclipse Temurin JDK 17 (github.com/adoptium)
#   - Android build-tools 34 і платформу android-34 (dl.google.com)
param(
    [string]$Tools = (Join-Path $env:LOCALAPPDATA "WaterTrackerAndroidTools"),
    [string]$VersionName = "1.5",
    [int]$VersionCode = 7,
    # Мінімальний versionCode APK для веб-оновлень (APK 1.4 — перший, що їх підтримує)
    [int]$MinWebNative = 6
)
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$Root    = Split-Path $PSScriptRoot
$AppDir  = Join-Path $PSScriptRoot "app\src\main"
$Build   = Join-Path $PSScriptRoot "build"
$OutApk  = Join-Path $Root "dist\AquaTamagotchi.apk"
$KeyStore = Join-Path $PSScriptRoot "release.keystore"
$KeyPass = "aquatamagotchi"   # ключ для самопідписаного APK (для встановлення вручну)

function Fetch($url, $zip, $dest) {
    if (Test-Path $dest) { return }
    New-Item -ItemType Directory -Force $Tools | Out-Null
    $tmp = Join-Path $Tools $zip
    Write-Host "Завантаження $zip ..."
    Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing
    $x = Join-Path $Tools ("_x_" + [IO.Path]::GetFileNameWithoutExtension($zip))
    if (Test-Path $x) { Remove-Item -Recurse -Force $x }
    Expand-Archive $tmp -DestinationPath $x
    $inner = Get-ChildItem $x | Select-Object -First 1
    Move-Item $inner.FullName $dest
    Remove-Item -Recurse -Force $x, $tmp
}

Fetch "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse" "jdk17.zip" (Join-Path $Tools "jdk")
Fetch "https://dl.google.com/android/repository/build-tools_r34-windows.zip" "build-tools.zip" (Join-Path $Tools "build-tools")
Fetch "https://dl.google.com/android/repository/platform-34-ext7_r03.zip" "platform.zip" (Join-Path $Tools "platform")

$env:JAVA_HOME = Join-Path $Tools "jdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
$BT = Join-Path $Tools "build-tools"
$AndroidJar = Join-Path $Tools "platform\android.jar"

function Run($exe) {
    & $exe @args
    if ($LASTEXITCODE -ne 0) { throw "Помилка: $exe $args" }
}

# --- 1. Чиста папка збирання та веб-файли гри в assets/www ---
if (Test-Path $Build) { Remove-Item -Recurse -Force $Build }
$www = Join-Path $Build "assets\www"
# Список файлів і їхні хеші — з web-version.json (оновлюється web-release.ps1)
powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root "web-release.ps1") -MinNativeCode $MinWebNative
if ($LASTEXITCODE -ne 0) { throw "web-release.ps1 завершився з помилкою" }
$webManifest = Get-Content (Join-Path $Root "web-version.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$utf8 = New-Object Text.UTF8Encoding $false
foreach ($rel in @($webManifest.files.PSObject.Properties.Name) + "web-version.json") {
    $dest = Join-Path $www $rel
    New-Item -ItemType Directory -Force (Split-Path $dest) | Out-Null
    $src = Join-Path $Root $rel
    if ($rel -match '\.(html|css|js|json)$') {
        # як у git: LF, щоб хеші збігались з файлами на GitHub
        [IO.File]::WriteAllText($dest, [IO.File]::ReadAllText($src, $utf8).Replace("`r`n", "`n"), $utf8)
    } else {
        Copy-Item $src $dest
    }
}

# --- 2. Ресурси ---
Run "$BT\aapt2.exe" compile --dir "$AppDir\res" -o "$Build\res.zip"
New-Item -ItemType Directory -Force "$Build\gen", "$Build\classes", "$Build\dex" | Out-Null
Run "$BT\aapt2.exe" link -o "$Build\unsigned.apk" -I $AndroidJar `
    --manifest "$AppDir\AndroidManifest.xml" --java "$Build\gen" `
    --min-sdk-version 24 --target-sdk-version 34 `
    --version-code $VersionCode --version-name $VersionName "$Build\res.zip"

# --- 3. Java -> dex ---
$sources = @(Get-ChildItem -Recurse "$AppDir\java", "$Build\gen" -Filter *.java | ForEach-Object FullName)
Run javac -nowarn "-Xlint:-options" -source 8 -target 8 -encoding UTF-8 -bootclasspath $AndroidJar -d "$Build\classes" @sources
$classes = @(Get-ChildItem -Recurse "$Build\classes" -Filter *.class | ForEach-Object FullName)
Run "$BT\d8.bat" --release --min-api 24 --lib $AndroidJar --output "$Build\dex" @classes

# assets додаємо через jar: aapt2 -A на Windows записує шляхи з '\'
Run jar uf "$Build\unsigned.apk" -C "$Build" assets -C "$Build\dex" classes.dex

# --- 4. Вирівнювання та підпис ---
if (-not (Test-Path $KeyStore)) {
    Run keytool -genkeypair -keystore $KeyStore -storepass $KeyPass -keypass $KeyPass -alias app `
        -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Aqua Tamagotchi"
}
Run "$BT\zipalign.exe" -p -f 4 "$Build\unsigned.apk" "$Build\aligned.apk"
New-Item -ItemType Directory -Force (Split-Path $OutApk) | Out-Null
Run "$BT\apksigner.bat" sign --ks $KeyStore --ks-pass "pass:$KeyPass" --ks-key-alias app --out $OutApk "$Build\aligned.apk"
Run "$BT\apksigner.bat" verify $OutApk

$size = [math]::Round((Get-Item $OutApk).Length / 1KB)
Write-Host "Готово: $OutApk ($size КБ)"
