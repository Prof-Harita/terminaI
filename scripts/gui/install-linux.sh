#!/bin/bash
# Install dependencies for Linux GUI Automation (AT-SPI / Sidecar)

set -e

echo "Installing Linux GUI Automation dependencies..."

if [ -f /etc/debian_version ]; then
  sudo apt-get update
  sudo apt-get install -y python3-gi python3-dbus python3-pyatspi gir1.2-atspi-2.0
elif [ -f /etc/redhat-release ]; then
  sudo dnf install -y python3-gobject python3-dbus python3-pyatspi at-spi2-core
else
  echo "Unsupported distribution. Please install python3-pyatspi and dependencies manually."
  exit 1
fi

echo "Dependencies installed successfully."
