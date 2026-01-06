<#
.SYNOPSIS
    Development environment setup script for TerminaI (Windows)
.DESCRIPTION
    Checks for and installs required dependencies for building the Tauri desktop app.
    Run this script before your first build to ensure all prerequisites are met.
.NOTES
    Requires: Windows 10/11, PowerShell 5.1+, winget
    Run as Administrator for automatic installation
#>

$ErrorActionPreference = "Stop"

function Write-Status {
    param([string]$Message, [string]$Status = "INFO")
    $color = switch ($Status) {
        "OK"    { "Green" }
        "WARN"  { "Yellow" }
        "ERROR" { "Red" }
        "INSTALL" { "Cyan" }
        default { "White" }
    }
    Write-Host "[$Status] " -ForegroundColor $color -NoNewline
    Write-Host $Message
}

function Test-Command {
    param([string]$Command)
    return [bool](Get-Command $Command -ErrorAction SilentlyContinue)
}

function Test-VsBuildTools {
    # Check common installation paths for VS Build Tools
    $paths = @(
        "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2022\BuildTools\VC",
        "${env:ProgramFiles}\Microsoft Visual Studio\2022\BuildTools\VC",
        "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2022\Community\VC",
        "${env:ProgramFiles}\Microsoft Visual Studio\2022\Community\VC",
        "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2022\Professional\VC",
        "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2022\Enterprise\VC"
    )
    foreach ($path in $paths) {
        if (Test-Path $path) {
            return $true
        }
    }
    # Also check if link.exe is in PATH (set by VS Developer Command Prompt)
    return Test-Command "link"
}

function Test-AdminPrivileges {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TerminaI Development Setup (Windows) " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$missingDeps = @()
$isAdmin = Test-AdminPrivileges

# Check for winget
Write-Host "Checking dependencies..." -ForegroundColor Gray
Write-Host ""

if (-not (Test-Command "winget")) {
    Write-Status "winget not found. Please install App Installer from Microsoft Store." "ERROR"
    Write-Host "   https://apps.microsoft.com/store/detail/app-installer/9NBLGGH4NNS1"
    exit 1
}
Write-Status "winget" "OK"

# Check Node.js
if (Test-Command "node") {
    $nodeVersion = (node --version)
    Write-Status "Node.js $nodeVersion" "OK"
} else {
    Write-Status "Node.js not found" "WARN"
    $missingDeps += "node"
}

# Check Rust
if (Test-Command "rustc") {
    $rustVersion = (rustc --version)
    Write-Status "Rust ($rustVersion)" "OK"
} else {
    Write-Status "Rust not found" "WARN"
    $missingDeps += "rust"
}

# Check Visual Studio Build Tools (required for Tauri on Windows)
if (Test-VsBuildTools) {
    Write-Status "Visual Studio Build Tools (C++ workload)" "OK"
} else {
    Write-Status "Visual Studio Build Tools not found" "WARN"
    $missingDeps += "vsbuildtools"
}

# Check WebView2 (usually pre-installed on Windows 10/11)
$webview2Key = "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
if (Test-Path $webview2Key) {
    Write-Status "WebView2 Runtime" "OK"
} else {
    Write-Status "WebView2 Runtime not found (usually pre-installed)" "WARN"
    $missingDeps += "webview2"
}

Write-Host ""

# Install missing dependencies
if ($missingDeps.Count -gt 0) {
    Write-Host "Missing dependencies: $($missingDeps -join ', ')" -ForegroundColor Yellow
    Write-Host ""
    
    if (-not $isAdmin) {
        Write-Status "Some installations require Administrator privileges." "WARN"
        Write-Host "   Re-run this script as Administrator for automatic installation," -ForegroundColor Gray
        Write-Host "   or install manually using the commands below:" -ForegroundColor Gray
        Write-Host ""
    }

    foreach ($dep in $missingDeps) {
        switch ($dep) {
            "node" {
                $cmd = "winget install OpenJS.NodeJS.LTS"
                if ($isAdmin) {
                    Write-Status "Installing Node.js LTS..." "INSTALL"
                    Invoke-Expression $cmd
                } else {
                    Write-Host "   Node.js:  $cmd" -ForegroundColor Gray
                }
            }
            "rust" {
                $cmd = "winget install Rustlang.Rustup"
                if ($isAdmin) {
                    Write-Status "Installing Rust via rustup..." "INSTALL"
                    Invoke-Expression $cmd
                    # Initialize rustup
                    & "$env:USERPROFILE\.cargo\bin\rustup.exe" default stable
                } else {
                    Write-Host "   Rust:     $cmd" -ForegroundColor Gray
                }
            }
            "vsbuildtools" {
                $cmd = 'winget install Microsoft.VisualStudio.2022.BuildTools --override "--passive --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"'
                if ($isAdmin) {
                    Write-Status "Installing Visual Studio Build Tools (this may take a while)..." "INSTALL"
                    Invoke-Expression $cmd
                } else {
                    Write-Host "   VS Build Tools:" -ForegroundColor Gray
                    Write-Host "   $cmd" -ForegroundColor Gray
                }
            }
            "webview2" {
                $cmd = "winget install Microsoft.EdgeWebView2Runtime"
                if ($isAdmin) {
                    Write-Status "Installing WebView2 Runtime..." "INSTALL"
                    Invoke-Expression $cmd
                } else {
                    Write-Host "   WebView2: $cmd" -ForegroundColor Gray
                }
            }
        }
    }

    Write-Host ""
    if (-not $isAdmin) {
        Write-Host "After installing dependencies, restart your terminal and run this script again." -ForegroundColor Yellow
    } else {
        Write-Host "Dependencies installed. Please restart your terminal to apply changes." -ForegroundColor Green
    }
} else {
    Write-Host "All dependencies are installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now build the desktop app:" -ForegroundColor Gray
    Write-Host "   cd packages\desktop" -ForegroundColor White
    Write-Host "   npm run tauri dev" -ForegroundColor White
}

Write-Host ""
