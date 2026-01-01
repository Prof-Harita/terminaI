# Prompt 08A: System Troubleshooting (Questions 1-500)

Generate **500 realistic Linux user questions** for the **System
Troubleshooting** category.

## Bucket Details

- **Name:** System Troubleshooting
- **Persona:** Power User
- **Focus Areas:** Kernel panic, OOM killer, boot performance, drivers, system
  logs
- **ID Range:** SYS_TROUBLE_001 to SYS_TROUBLE_500

## Batch Coverage (5 batches × 100 questions each)

1. **Questions 001-100:** Most common/general issues
2. **Questions 101-200:** Frustration-driven troubleshooting
3. **Questions 201-300:** How-to tutorials and guides
4. **Questions 301-400:** Comparisons and recommendations
5. **Questions 401-500:** Automation and efficiency

## Real-World Context Examples

- Kernel panic "not syncing: Attempted to kill init"
- OOM Killer terminating processes randomly
- systemd-analyze boot performance
- NetworkManager-wait-online delays
- Driver conflicts (NVIDIA, WiFi)
- Disk full issues (/boot partition)
- Journal log size management
- GRUB bootloader issues

## Requirements

1. **Sound like technical forum posts** - power users describing system issues
2. **Vary context:**
   - Distros: Ubuntu 22.04, Ubuntu 24.04, Fedora 40, Arch Linux, Debian 12
   - Kernels: 5.15, 6.2, 6.5, 6.8
   - Hardware: Various GPUs, WiFi chips, storage controllers
3. **Specific answers** - log analysis, kernel parameters, systemd commands
4. **Friction types:** config_issue, legacy_dependency
5. **Complexity mix:** Intermediate (40%), Advanced (60%)

## Output Format (JSON array of exactly 500 entries)

````json
[
  {
    "id": "SYS_TROUBLE_001",
    "bucket": "System Troubleshooting",
    "sub_category": "Kernel Panic",
    "complexity": "Advanced",
    "user_persona": "Power User",
    "system_context": {
      "distro": "Ubuntu 24.04",
      "app_version": "Kernel 6.8"
    },
    "interaction": {
      "user_query": "System won't boot. I get 'Kernel panic - not syncing: Attempted to kill init exitcode=0x00000100'. Caps Lock is blinking.",
      "ai_response": "This indicates the init process (systemd) crashed during boot. Common causes:\n\n**Boot from Live USB and check:**\n```bash\n# Mount your root partition\nsudo mount /dev/sdXY /mnt\nsudo mount --bind /dev /mnt/dev\nsudo mount --bind /proc /mnt/proc\nsudo mount --bind /sys /mnt/sys\nsudo chroot /mnt\n\n# Check for filesystem errors\nfsck -f /dev/sdXY\n\n# Rebuild initramfs\nupdate-initramfs -u -k all\n\n# Update GRUB\nupdate-grub\n```\n\n**Blinking Caps Lock** = kernel panic code. This is recoverable via chroot."
    },
    "technical_tags": ["kernel-panic", "init", "boot-failure", "chroot"],
    "friction_type": "config_issue"
  }
]
````

**Generate exactly 500 unique, high-quality questions. Return ONLY the JSON
array, no additional text.**
