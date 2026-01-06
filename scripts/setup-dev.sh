#!/usr/bin/env bash
#
# Development environment setup script for TerminaI (Linux/macOS)
# Checks for and installs required dependencies for building the Tauri desktop app.
# Run this script before your first build to ensure all prerequisites are met.
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_status() {
    local status=$1
    local message=$2
    case $status in
        "OK")    echo -e "[${GREEN}OK${NC}] $message" ;;
        "WARN")  echo -e "[${YELLOW}WARN${NC}] $message" ;;
        "ERROR") echo -e "[${RED}ERROR${NC}] $message" ;;
        "INSTALL") echo -e "[${CYAN}INSTALL${NC}] $message" ;;
        *)       echo -e "[INFO] $message" ;;
    esac
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command_exists apt-get; then
            echo "debian"
        elif command_exists dnf; then
            echo "fedora"
        elif command_exists pacman; then
            echo "arch"
        else
            echo "linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    else
        echo "unknown"
    fi
}

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  TerminaI Development Setup (Unix)    ${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

OS=$(detect_os)
MISSING_DEPS=()

echo -e "Detected OS: ${CYAN}$OS${NC}"
echo ""
echo "Checking dependencies..."
echo ""

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_status "OK" "Node.js $NODE_VERSION"
else
    print_status "WARN" "Node.js not found"
    MISSING_DEPS+=("node")
fi

# Check Rust
if command_exists rustc; then
    RUST_VERSION=$(rustc --version)
    print_status "OK" "Rust ($RUST_VERSION)"
else
    print_status "WARN" "Rust not found"
    MISSING_DEPS+=("rust")
fi

# Check platform-specific build dependencies
case $OS in
    "debian")
        # Check for essential build packages
        if dpkg -s build-essential >/dev/null 2>&1; then
            print_status "OK" "build-essential"
        else
            print_status "WARN" "build-essential not found"
            MISSING_DEPS+=("build-essential")
        fi
        
        # Tauri dependencies
        TAURI_DEPS="libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf"
        for dep in $TAURI_DEPS; do
            if dpkg -s "$dep" >/dev/null 2>&1; then
                print_status "OK" "$dep"
            else
                print_status "WARN" "$dep not found"
                MISSING_DEPS+=("$dep")
            fi
        done
        ;;
    "fedora")
        if rpm -q gcc >/dev/null 2>&1; then
            print_status "OK" "gcc"
        else
            print_status "WARN" "gcc not found"
            MISSING_DEPS+=("gcc")
        fi
        
        TAURI_DEPS="webkit2gtk4.1-devel libappindicator-gtk3-devel librsvg2-devel"
        for dep in $TAURI_DEPS; do
            if rpm -q "$dep" >/dev/null 2>&1; then
                print_status "OK" "$dep"
            else
                print_status "WARN" "$dep not found"
                MISSING_DEPS+=("$dep")
            fi
        done
        ;;
    "arch")
        if pacman -Q base-devel >/dev/null 2>&1; then
            print_status "OK" "base-devel"
        else
            print_status "WARN" "base-devel not found"
            MISSING_DEPS+=("base-devel")
        fi
        
        TAURI_DEPS="webkit2gtk-4.1 libappindicator-gtk3 librsvg"
        for dep in $TAURI_DEPS; do
            if pacman -Q "$dep" >/dev/null 2>&1; then
                print_status "OK" "$dep"
            else
                print_status "WARN" "$dep not found"
                MISSING_DEPS+=("$dep")
            fi
        done
        ;;
    "macos")
        # Check Xcode Command Line Tools
        if xcode-select -p >/dev/null 2>&1; then
            print_status "OK" "Xcode Command Line Tools"
        else
            print_status "WARN" "Xcode Command Line Tools not found"
            MISSING_DEPS+=("xcode-cli")
        fi
        ;;
esac

echo ""

# Handle missing dependencies
if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo -e "${YELLOW}Missing dependencies: ${MISSING_DEPS[*]}${NC}"
    echo ""
    
    read -p "Would you like to install missing dependencies? [y/N] " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        case $OS in
            "debian")
                echo "Installing system dependencies..."
                sudo apt-get update
                sudo apt-get install -y build-essential libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf curl wget
                ;;
            "fedora")
                echo "Installing system dependencies..."
                sudo dnf install -y gcc webkit2gtk4.1-devel libappindicator-gtk3-devel librsvg2-devel curl wget
                ;;
            "arch")
                echo "Installing system dependencies..."
                sudo pacman -S --needed base-devel webkit2gtk-4.1 libappindicator-gtk3 librsvg curl wget
                ;;
            "macos")
                echo "Installing Xcode Command Line Tools..."
                xcode-select --install 2>/dev/null || true
                ;;
        esac
        
        # Install Node.js if missing
        if [[ " ${MISSING_DEPS[*]} " =~ " node " ]]; then
            echo ""
            print_status "INSTALL" "Installing Node.js via nvm..."
            curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
            nvm install --lts
            nvm use --lts
        fi
        
        # Install Rust if missing
        if [[ " ${MISSING_DEPS[*]} " =~ " rust " ]]; then
            echo ""
            print_status "INSTALL" "Installing Rust via rustup..."
            curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
            source "$HOME/.cargo/env"
        fi
        
        echo ""
        echo -e "${GREEN}Dependencies installed!${NC}"
        echo "Please restart your terminal to apply changes, then run:"
    else
        echo ""
        echo "To install manually, run:"
        case $OS in
            "debian")
                echo "  sudo apt-get install build-essential libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf"
                ;;
            "fedora")
                echo "  sudo dnf install gcc webkit2gtk4.1-devel libappindicator-gtk3-devel librsvg2-devel"
                ;;
            "arch")
                echo "  sudo pacman -S base-devel webkit2gtk-4.1 libappindicator-gtk3 librsvg"
                ;;
            "macos")
                echo "  xcode-select --install"
                ;;
        esac
        echo ""
        echo "For Rust:"
        echo "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
        echo ""
        echo "For Node.js (via nvm):"
        echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
        echo "  nvm install --lts"
    fi
else
    echo -e "${GREEN}All dependencies are installed!${NC}"
fi

echo ""
echo "You can now build the desktop app:"
echo "  cd packages/desktop"
echo "  npm run tauri dev"
echo ""
