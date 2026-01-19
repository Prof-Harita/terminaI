<#
.SYNOPSIS
    Safely simulates a first-user experience by backing up and removing config files (Windows Version).
    NUCLEAR RESET: Completely wipes all TerminaI/Gemini config and credentials.
    Does a fresh build and runs the app.

.DESCRIPTION
    Run this script in PowerShell to reset your environment for testing the "First Run" wizard.
#>

$ErrorActionPreference = "Stop"

$TerminaiDir = Join-Path $env:USERPROFILE ".terminai"
$TermaiDir = Join-Path $env:USERPROFILE ".termai"
$GeminiDir = Join-Path $env:USERPROFILE ".gemini"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = Join-Path $env:USERPROFILE ".terminai-backup-$Timestamp"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

Write-Host "🔥 TerminaI NUCLEAR RESET Script (Windows)" -ForegroundColor Red
Write-Host "========================================"
Write-Host "This will completely wipe ALL credentials and config."
Write-Host ""

# Step 1: Create backup
Write-Host "📦 Step 1: Creating backup at $BackupDir..."
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

if (Test-Path $TerminaiDir) {
    Copy-Item -Path $TerminaiDir -Destination (Join-Path $BackupDir "terminai") -Recurse
    Write-Host "   ✅ Backed up .terminai" -ForegroundColor Green
}

if (Test-Path $TermaiDir) {
    Copy-Item -Path $TermaiDir -Destination (Join-Path $BackupDir "termai") -Recurse
    Write-Host "   ✅ Backed up .termai" -ForegroundColor Green
}

if (Test-Path $GeminiDir) {
    Copy-Item -Path $GeminiDir -Destination (Join-Path $BackupDir "gemini") -Recurse
    Write-Host "   ✅ Backed up .gemini" -ForegroundColor Green
}

Write-Host "   📁 Backup complete: $BackupDir"

# Step 2: NUKE everything
Write-Host ""
Write-Host "💣 Step 2: Removing ALL config directories..."
if (Test-Path $TerminaiDir) { Remove-Item -Path $TerminaiDir -Recurse -Force; Write-Host "   ✅ Removed .terminai" -ForegroundColor Green }
if (Test-Path $TermaiDir) { Remove-Item -Path $TermaiDir -Recurse -Force; Write-Host "   ✅ Removed .termai" -ForegroundColor Green }
if (Test-Path $GeminiDir) { Remove-Item -Path $GeminiDir -Recurse -Force; Write-Host "   ✅ Removed .gemini" -ForegroundColor Green }

# Step 3: Clean build artifacts
Write-Host ""
Write-Host "🧹 Step 3: Cleaning build artifacts..."
Set-Location $ProjectDir
if (Test-Path "node_modules/.cache") { Remove-Item -Path "node_modules/.cache" -Recurse -Force; Write-Host "   ✅ Cleared node_modules cache" -ForegroundColor Green }
# Cleaning dist folders specifically
Get-ChildItem -Path "packages" -Directory | ForEach-Object {
    $DistPath = Join-Path $_.FullName "dist"
    if (Test-Path $DistPath) {
        Remove-Item -Path $DistPath -Recurse -Force
    }
}
Write-Host "   ✅ Cleared package dist folders" -ForegroundColor Green

# Step 4: Fresh install and build
Write-Host ""
Write-Host "🔨 Step 4: Fresh install and build..."
npm install
npm run build

# Step 5: Run the app
Write-Host ""
Write-Host "=========================================="
Write-Host "✅ NUCLEAR RESET COMPLETE!"
Write-Host ""
Write-Host "🚀 Launching TerminaI as first-time user..."
Write-Host "=========================================="
Write-Host ""

npm start

# After user exits, show restore instructions
Write-Host ""
Write-Host "=========================================="
Write-Host "To restore your original config:"
Write-Host "  Copy-Item -Path '$BackupDir\terminai' -Destination '$env:USERPROFILE\.terminai' -Recurse -Force"
Write-Host "  Copy-Item -Path '$BackupDir\gemini' -Destination '$env:USERPROFILE\.gemini' -Recurse -Force"
Write-Host "=========================================="
