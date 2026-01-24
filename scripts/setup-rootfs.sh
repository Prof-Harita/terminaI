#!/bin/sh
set -e

# Mount the ext4 image
mkdir -p /mnt/rootfs
mount -o loop /work/rootfs.ext4 /mnt/rootfs

# Extract tar
echo 'Extracting filesystem...'
tar -xf /work/rootfs.tar -C /mnt/rootfs

# Inject Guest Agent
echo 'Injecting Guest Agent...'
mkdir -p /mnt/rootfs/opt/terminai
cp /opt/guest_agent/guest_agent.py /mnt/rootfs/opt/terminai/guest_agent.py

# Create essential device nodes (Docker export excludes them)
echo 'Creating device nodes...'
mkdir -p /mnt/rootfs/dev
rm -f /mnt/rootfs/dev/console /mnt/rootfs/dev/null /mnt/rootfs/dev/zero /mnt/rootfs/dev/ptmx /mnt/rootfs/dev/tty /mnt/rootfs/dev/ttyS0 /mnt/rootfs/dev/random /mnt/rootfs/dev/urandom
mknod -m 600 /mnt/rootfs/dev/console c 5 1
mknod -m 666 /mnt/rootfs/dev/null c 1 3
mknod -m 666 /mnt/rootfs/dev/zero c 1 5
mknod -m 666 /mnt/rootfs/dev/ptmx c 5 2
mknod -m 666 /mnt/rootfs/dev/tty c 5 0
mknod -m 600 /mnt/rootfs/dev/ttyS0 c 4 64
mknod -m 666 /mnt/rootfs/dev/random c 1 8
mknod -m 666 /mnt/rootfs/dev/urandom c 1 9

# Inject Init Script
echo 'Creating /sbin/init...'
cat > /mnt/rootfs/sbin/init << 'EOF'
#!/bin/sh
mount -t proc proc /proc
mount -t sysfs sys /sys
mount -t devtmpfs dev /dev

# Try all consoles
echo 'INIT: Started (stdout)'
echo 'INIT: Started (ttyS0)' > /dev/ttyS0
echo 'INIT: Started (console)' > /dev/console

# Setup Network (Loopback)
ip link set lo up

# Check Python
echo 'Checking python...' > /dev/ttyS0
which python3 > /dev/ttyS0 2>&1
python3 --version > /dev/ttyS0 2>&1

# Start Agent
echo 'Starting Agent...' > /dev/ttyS0
exec python3 -u /opt/terminai/guest_agent.py > /dev/ttyS0 2>&1
EOF

echo "DEBUG: Fixing init permissions..."
chmod 0755 /mnt/rootfs/sbin/init
# Explicitly target usr/sbin if it exists
if [ -f /mnt/rootfs/usr/sbin/init ]; then
    chmod 0755 /mnt/rootfs/usr/sbin/init
fi

echo "DEBUG: init permissions:"
ls -l /mnt/rootfs/sbin/init
ls -l /mnt/rootfs/usr/sbin/init || true

# Cleanup
umount /mnt/rootfs
echo 'Rootfs ready.'
