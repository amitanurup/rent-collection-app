$ErrorActionPreference = "Stop"

$WrapperRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $WrapperRoot
$ToolchainRoot = Join-Path $ProjectRoot "_apk-toolchain"
$JavaHome = Join-Path $ToolchainRoot "jdk"
$AndroidSdk = Join-Path $ToolchainRoot "android-sdk"
$BuildTools = Join-Path $AndroidSdk "build-tools\35.0.0"
$AndroidJar = Join-Path $AndroidSdk "platforms\android-35\android.jar"
$BuildRoot = Join-Path $WrapperRoot "build"
$ApkRoot = Join-Path $BuildRoot "apk-root"
$AssetsRoot = Join-Path $ApkRoot "assets"
$GenRoot = Join-Path $BuildRoot "gen"
$ClassesRoot = Join-Path $BuildRoot "classes"
$DexRoot = Join-Path $BuildRoot "dex"
$DistRoot = Join-Path $WrapperRoot "dist"
$UnsignedApk = Join-Path $BuildRoot "rent-ledger-unsigned.apk"
$UnsignedWithDexApk = Join-Path $BuildRoot "rent-ledger-unsigned-dex.apk"
$AlignedApk = Join-Path $BuildRoot "rent-ledger-aligned.apk"
$FinalApk = Join-Path $DistRoot "rent-ledger-debug.apk"
$Keystore = Join-Path $WrapperRoot "debug.keystore"

function Assert-Tool {
    param([string] $Path)
    if (!(Test-Path $Path)) {
        throw "Required tool not found: $Path"
    }
}

function Invoke-Tool {
    param(
        [string] $FilePath,
        [string[]] $Arguments
    )

    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed ($LASTEXITCODE): $FilePath $($Arguments -join ' ')"
    }
}

Assert-Tool (Join-Path $JavaHome "bin\javac.exe")
Assert-Tool (Join-Path $JavaHome "bin\jar.exe")
Assert-Tool (Join-Path $JavaHome "bin\keytool.exe")
Assert-Tool (Join-Path $BuildTools "aapt2.exe")
Assert-Tool (Join-Path $BuildTools "d8.bat")
Assert-Tool (Join-Path $BuildTools "zipalign.exe")
Assert-Tool (Join-Path $BuildTools "apksigner.bat")
Assert-Tool $AndroidJar

$resolvedBuildRoot = [System.IO.Path]::GetFullPath($BuildRoot)
$resolvedWrapperRoot = [System.IO.Path]::GetFullPath($WrapperRoot)
if (!$resolvedBuildRoot.StartsWith($resolvedWrapperRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to clean build directory outside wrapper root: $resolvedBuildRoot"
}

Remove-Item -Recurse -Force $BuildRoot -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $AssetsRoot, $GenRoot, $ClassesRoot, $DexRoot, $DistRoot | Out-Null

Copy-Item -Path (Join-Path $ProjectRoot "index.html") -Destination $AssetsRoot -Force
Copy-Item -Path (Join-Path $ProjectRoot "rent-collection.webmanifest") -Destination $AssetsRoot -Force
Copy-Item -Path (Join-Path $ProjectRoot "rent-collection-sw.js") -Destination $AssetsRoot -Force
Copy-Item -Path (Join-Path $ProjectRoot "assets") -Destination $AssetsRoot -Recurse -Force

$env:JAVA_HOME = $JavaHome
$env:ANDROID_HOME = $AndroidSdk
$env:ANDROID_SDK_ROOT = $AndroidSdk
$env:Path = "$JavaHome\bin;$BuildTools;$env:Path"

$CompiledResources = Join-Path $BuildRoot "compiled-resources.zip"
Invoke-Tool (Join-Path $BuildTools "aapt2.exe") @("compile", "--dir", (Join-Path $WrapperRoot "res"), "-o", $CompiledResources)
Invoke-Tool (Join-Path $BuildTools "aapt2.exe") @(
    "link",
    "-I", $AndroidJar,
    "--manifest", (Join-Path $WrapperRoot "AndroidManifest.xml"),
    "--java", $GenRoot,
    "--min-sdk-version", "23",
    "--target-sdk-version", "35",
    "--version-code", "1",
    "--version-name", "1.0",
    "--auto-add-overlay",
    "-R", $CompiledResources,
    "-o", $UnsignedApk
)

$JavaSources = @()
$JavaSources += Get-ChildItem -Path (Join-Path $WrapperRoot "src") -Recurse -Filter "*.java" | ForEach-Object { $_.FullName }
$JavaSources += Get-ChildItem -Path $GenRoot -Recurse -Filter "*.java" | ForEach-Object { $_.FullName }
Invoke-Tool (Join-Path $JavaHome "bin\javac.exe") (@("-encoding", "UTF-8", "-source", "8", "-target", "8", "-classpath", $AndroidJar, "-d", $ClassesRoot) + $JavaSources)
$ClassFiles = Get-ChildItem -Path $ClassesRoot -Recurse -Filter "*.class" | ForEach-Object { $_.FullName }
Invoke-Tool (Join-Path $BuildTools "d8.bat") (@("--min-api", "23", "--lib", $AndroidJar, "--output", $DexRoot) + $ClassFiles)

Copy-Item $UnsignedApk $UnsignedWithDexApk -Force
Invoke-Tool (Join-Path $JavaHome "bin\jar.exe") @("uf", $UnsignedWithDexApk, "-C", $DexRoot, "classes.dex", "-C", $ApkRoot, "assets")
Invoke-Tool (Join-Path $BuildTools "zipalign.exe") @("-p", "-f", "4", $UnsignedWithDexApk, $AlignedApk)

if (!(Test-Path $Keystore)) {
    Invoke-Tool (Join-Path $JavaHome "bin\keytool.exe") @(
        "-genkeypair", "-v",
        "-keystore", $Keystore,
        "-storepass", "android",
        "-alias", "androiddebugkey",
        "-keypass", "android",
        "-keyalg", "RSA",
        "-keysize", "2048",
        "-validity", "10000",
        "-dname", "CN=Android Debug,O=Codex,C=US"
    )
}

Invoke-Tool (Join-Path $BuildTools "apksigner.bat") @(
    "sign",
    "--ks", $Keystore,
    "--ks-pass", "pass:android",
    "--key-pass", "pass:android",
    "--out", $FinalApk,
    $AlignedApk
)

Invoke-Tool (Join-Path $BuildTools "apksigner.bat") @("verify", "--verbose", "--print-certs", $FinalApk)
Get-Item $FinalApk | Select-Object FullName,Length,LastWriteTime
