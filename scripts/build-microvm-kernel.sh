#!/bin/bash
set -e

# Configuration
KERNEL_VERSION="6.1.100"
KERNEL_URL="https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-${KERNEL_VERSION}.tar.xz"
WORK_DIR="/tmp/terminai-kernel-build"
OUTPUT_DIR="$(pwd)/packages/microvm/resources"
OUTPUT_FILE="${OUTPUT_DIR}/vmlinux-x86_64.bin"

echo "=== Building Minimal Linux Kernel for Firecracker ==="
echo "Version: ${KERNEL_VERSION}"
echo "Output: ${OUTPUT_FILE}"

# Ensure output directory exists
mkdir -p "${OUTPUT_DIR}"

# Prepare working directory
mkdir -p "${WORK_DIR}"
cd "${WORK_DIR}"

# Download kernel if not already present
if [ ! -f "linux-${KERNEL_VERSION}.tar.xz" ]; then
    echo "Downloading kernel source..."
    curl -L -o "linux-${KERNEL_VERSION}.tar.xz" "${KERNEL_URL}"
fi

# Extract
if [ ! -d "linux-${KERNEL_VERSION}" ]; then
    echo "Extracting kernel source..."
    tar -xf "linux-${KERNEL_VERSION}.tar.xz"
fi

cd "linux-${KERNEL_VERSION}"

echo "Configuring kernel..."
# Start with default x86_64 config
make x86_64_defconfig

# Apply Firecracker-optimized configuration
# Based on: https://github.com/firecracker-microvm/firecracker/blob/main/resources/guest_configs/microvm-kernel-x86_64.config
# We use script commands to modify .config directly for simplicity

# Enable KVM guest support
./scripts/config --enable CONFIG_PVH
./scripts/config --enable CONFIG_PARAVIRT

# Firecracker supports ACPI
./scripts/config --enable CONFIG_ACPI
./scripts/config --enable CONFIG_ACPI_REV_OVERRIDE_OR_QUIRKS
# ./scripts/config --enable CONFIG_X86_MPPARSE
./scripts/config --enable CONFIG_X86_IO_APIC
./scripts/config --enable CONFIG_X86_LOCAL_APIC
./scripts/config --enable CONFIG_PCI_MSI

# Serial (for console)
./scripts/config --set-val CONFIG_SERIAL_8250 y
./scripts/config --set-val CONFIG_SERIAL_8250_CONSOLE y
./scripts/config --set-val CONFIG_SERIAL_8250_EXTENDED y
./scripts/config --set-val CONFIG_SERIAL_8250_SHARE_IRQ y
./scripts/config --set-val CONFIG_SERIAL_OF_PLATFORM y
./scripts/config --set-val CONFIG_VIRTIO y
./scripts/config --set-val CONFIG_VIRTIO_MENU y
# Firecracker is MMIO on x86, PCI causes noise/scan
./scripts/config --disable CONFIG_VIRTIO_PCI
./scripts/config --set-val CONFIG_VIRTIO_MMIO y
./scripts/config --set-val CONFIG_VIRTIO_MMIO_CMDLINE_DEVICES y
./scripts/config --set-val CONFIG_VIRTIO_NET y
./scripts/config --set-val CONFIG_VIRTIO_BLK y
./scripts/config --set-val CONFIG_VIRTIO_BALLOON y
./scripts/config --set-val CONFIG_VIRTIO_CONSOLE y
./scripts/config --set-val CONFIG_HW_RANDOM_VIRTIO y
./scripts/config --enable CONFIG_RANDOM_TRUST_CPU

# Vsock support (Host-Guest Communication)
# ./scripts/config --set-val CONFIG_VSOCKETS y
# ./scripts/config --set-val CONFIG_VIRTIO_VSOCKETS y
# ./scripts/config --set-val CONFIG_VIRTIO_VSOCKETS_COMMON y

# Filesystem support
./scripts/config --enable CONFIG_EXT4_FS
./scripts/config --set-val CONFIG_DEVTMPFS y
./scripts/config --set-val CONFIG_DEVTMPFS_MOUNT y
./scripts/config --enable CONFIG_OVERLAY_FS

# Optimization / Size reduction
./scripts/config --disable CONFIG_USB_SUPPORT
./scripts/config --disable CONFIG_SOUND
./scripts/config --disable CONFIG_PCCARD
./scripts/config --disable CONFIG_PCI_QUIRKS
./scripts/config --disable CONFIG_HIBERNATION
./scripts/config --disable CONFIG_ACPI

# Resolve dependencies and set defaults for new options
make olddefconfig

# Build
echo "Building kernel (this may take a while)..."
make -j$(nproc) vmlinux

# Copy output
cp vmlinux "${OUTPUT_FILE}"
echo "Build complete! Kernel saved to ${OUTPUT_FILE}"
ls -lh "${OUTPUT_FILE}"

# Cleanup
# rm -rf "${WORK_DIR}" # Keep for now for debugging
