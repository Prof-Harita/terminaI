#!/bin/bash
set -e

# Configuration
IMAGE_NAME="terminai-sandbox:latest"
OUTPUT_DIR="packages/microvm/resources"
ROOTFS_FILE="${OUTPUT_DIR}/rootfs.ext4"
SIZE_MB=2048 # 2GB
MOUNT_POINT="/tmp/terminai-rootfs-mount"

echo "=== Building MicroVM Rootfs ==="
echo "Source Image: ${IMAGE_NAME}"
echo "Output: ${ROOTFS_FILE}"

# Ensure output directory
mkdir -p "${OUTPUT_DIR}"

# 1. Ensure Docker image exists
if ! docker image inspect "${IMAGE_NAME}" > /dev/null 2>&1; then
    echo "Image ${IMAGE_NAME} not found. Please run 'npm run build:sandbox' first."
    exit 1
fi

# 2. Create empty ext4 file
echo "Creating empty ext4 image (${SIZE_MB}MB)..."
dd if=/dev/zero of="${ROOTFS_FILE}" bs=1M count="${SIZE_MB}" status=progress
mkfs.ext4 "${ROOTFS_FILE}"

# 3. Export Docker container filesystem
echo "Exporting Docker filesystem..."
CONTAINER_ID=$(docker create "${IMAGE_NAME}")
docker export "${CONTAINER_ID}" > "${OUTPUT_DIR}/rootfs.tar"
docker rm "${CONTAINER_ID}"

# 4. Extract to mountpoint (Using fakeroot/proot or docker to avoid sudo on host if possible)
# Since we are often running as non-root user and mounting loop devices requires sudo,
# we will use a trick: execute a privileged docker container to populate the image file.
# This avoids needing sudo on the host directly for mounting.

echo "Populating rootfs using builder container..."

# We mount the current directory into the builder
# We use an alpine container to do the extraction and setup
# We mount the current directory into the builder
# We use an alpine container to do the extraction and setup
docker run --rm --privileged \
    -v "$(pwd)/${OUTPUT_DIR}:/work" \
    -v "$(pwd)/packages/sandbox-image/python:/opt/guest_agent:ro" \
    -v "$(pwd)/scripts/setup-rootfs.sh:/setup.sh:ro" \
    alpine:latest sh /setup.sh

# Cleanup tar
rm "${OUTPUT_DIR}/rootfs.tar"

echo "Build complete: ${ROOTFS_FILE}"
ls -lh "${ROOTFS_FILE}"
