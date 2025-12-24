#!/bin/bash
#
# TerminaI Installer Script
# AI-Powered Terminal: Governed Autonomy for Systems and Servers
#
# Usage: curl -sSL https://install.terminai.org | sh
#

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║          TerminaI - AI-Powered Terminal                     ║${NC}"
echo -e "${BOLD}║    Governed Autonomy for Systems and Servers               ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Detect OS
OS=$(uname -s)
ARCH=$(uname -m)

echo -e "${GREEN}→${NC} Detected: ${BOLD}${OS}${NC} / ${BOLD}${ARCH}${NC}"

# Check for Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js found: ${NODE_VERSION}"
    
    # Check Node version (need >= 20)
    NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')
    if [ "$NODE_MAJOR" -lt 20 ]; then
        echo -e "${RED}✗${NC} Node.js version 20+ required. Found: ${NODE_VERSION}"
        echo "  Please upgrade Node.js: https://nodejs.org/"
        exit 1
    fi
else
    echo -e "${RED}✗${NC} Node.js not found."
    echo ""
    echo "Please install Node.js 20+ first:"
    echo "  https://nodejs.org/"
    echo ""
    echo "Or use a version manager:"
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "  nvm install 20"
    exit 1
fi

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗${NC} npm not found. Please install Node.js with npm."
    exit 1
fi

echo ""
echo -e "${GREEN}→${NC} Installing TerminaI via npm..."
echo ""

# Install globally
npm install -g @terminai/cli

echo ""
echo -e "${GREEN}✓${NC} TerminaI installed successfully!"
echo ""

# Verify installation
if command -v terminai &> /dev/null; then
    echo -e "${GREEN}→${NC} Version installed:"
    terminai --version
else
    echo -e "${YELLOW}⚠${NC} 'terminai' command not found in PATH."
    echo "  You may need to add npm global bin to your PATH."
    echo "  Run: npm bin -g"
fi

echo ""
echo -e "${BOLD}Quick Start:${NC}"
echo "  terminai              # Start interactive mode"
echo "  terminai \"fix wifi\"   # Run a system task"
echo ""
echo -e "${BOLD}Optional:${NC} Add a short alias to your shell:"
echo "  echo 'alias t=terminai' >> ~/.bashrc  # or ~/.zshrc"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Documentation: ${BOLD}https://terminai.org${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
