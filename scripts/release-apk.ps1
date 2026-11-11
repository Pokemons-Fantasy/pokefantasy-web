# APK de release firmada: `npm run release:apk`.
#
# Compila la web contra producción (`cap:sync`), genera la variante release sin firmar con Gradle y la firma con
# apksigner usando las dos claves y el linaje de rotación (ver vault `40 Frontend/App Android.md`):
# - la antigua (clave de depuración original) firma v2: Android 7-8 siguen actualizando encima;
# - la nueva firma v3 con el linaje: Android 9+ actualiza encima y desde entonces confía solo en la nueva.
# Gradle no sabe firmar con linaje, por eso la firma se hace aquí.
#
# Las claves viven fuera del repo, en `../../keys` (o en `$env:PF_KEYS_DIR`), con un `keystore.properties`.
# Sale `android/app/build/outputs/apk/release/PokeFantasy-<versión>.apk`.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$keysDir = if ($env:PF_KEYS_DIR) { $env:PF_KEYS_DIR } else { Join-Path (Split-Path -Parent $root) 'keys' }
$propsFile = Join-Path $keysDir 'keystore.properties'
if (-not (Test-Path $propsFile)) { throw "No encuentro $propsFile (claves de firma). Define PF_KEYS_DIR." }

$props = @{}
Get-Content $propsFile | Where-Object { $_ -match '^\s*[^#].*=' } | ForEach-Object {
  $k, $v = $_ -split '=', 2
  $props[$k.Trim()] = $v.Trim()
}

# El JDK de Android Studio (Capacitor 8 compila con Java 21); el JAVA_HOME del sistema puede ser más antiguo
$studioJbr = 'C:\Program Files\Android\Android Studio\jbr'
if (Test-Path $studioJbr) { $env:JAVA_HOME = $studioJbr }
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
$sdkLine = Get-Content (Join-Path $root 'android\local.properties') | Where-Object { $_ -match '^sdk\.dir=' }
$sdk = ($sdkLine -replace '^sdk\.dir=', '') -replace '\\:', ':' -replace '\\\\', '\'
$buildTools = Get-ChildItem (Join-Path $sdk 'build-tools') -Directory | Sort-Object { [version]$_.Name } | Select-Object -Last 1
$apksigner = Join-Path $buildTools.FullName 'apksigner.bat'
$zipalign = Join-Path $buildTools.FullName 'zipalign.exe'

$version = (Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version

Push-Location $root
try {
  npm run cap:sync
  if ($LASTEXITCODE -ne 0) { throw 'cap:sync ha fallado' }
  Push-Location android
  try {
    .\gradlew.bat assembleRelease --console=plain
    if ($LASTEXITCODE -ne 0) { throw 'assembleRelease ha fallado' }
  } finally { Pop-Location }

  $outDir = Join-Path $root 'android\app\build\outputs\apk\release'
  $unsigned = Join-Path $outDir 'app-release-unsigned.apk'
  $aligned = Join-Path $outDir 'app-release-aligned.apk'
  $final = Join-Path $outDir "PokeFantasy-$version.apk"
  & $zipalign -f -p 4 $unsigned $aligned
  if ($LASTEXITCODE -ne 0) { throw 'zipalign ha fallado' }

  # Contraseñas por variable de entorno, no en la línea de comandos
  $env:PF_LEGACY_PASS = $props['legacy.password']
  $env:PF_RELEASE_PASS = $props['release.password']
  try {
    & $apksigner sign `
      --ks $props['legacy.store'] --ks-key-alias $props['legacy.alias'] --ks-pass env:PF_LEGACY_PASS `
      --next-signer --ks $props['release.store'] --ks-key-alias $props['release.alias'] --ks-pass env:PF_RELEASE_PASS `
      --lineage $props['lineage'] --rotation-min-sdk-version 28 `
      --out $final $aligned
    if ($LASTEXITCODE -ne 0) { throw 'apksigner sign ha fallado' }
  } finally {
    Remove-Item Env:PF_LEGACY_PASS, Env:PF_RELEASE_PASS -ErrorAction SilentlyContinue
  }
  Remove-Item $aligned

  & $apksigner verify --verbose --print-certs $final
  if ($LASTEXITCODE -ne 0) { throw 'La firma no verifica' }
  Write-Host "APK firmada: $final"
} finally { Pop-Location }
