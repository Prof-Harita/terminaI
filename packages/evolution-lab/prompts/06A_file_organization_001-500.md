# Prompt 06A: File Organization (Questions 1-500)

Generate **500 realistic Linux user questions** for the **File Organization**
category.

## Bucket Details

- **Name:** File Organization
- **Persona:** Everyday Consumer
- **Focus Areas:** Permissions, external drives, backups, deduplication, cloud
  sync
- **ID Range:** FILE_ORG_001 to FILE_ORG_500

## Batch Coverage (5 batches × 100 questions each)

1. **Questions 001-100:** Most common/general issues
2. **Questions 101-200:** Frustration-driven troubleshooting
3. **Questions 201-300:** How-to tutorials and guides
4. **Questions 301-400:** Comparisons and recommendations
5. **Questions 401-500:** Automation and efficiency

## Real-World Context Examples

- Read-only external NTFS drives (unclean unmount)
- Permission denied errors on own files
- Trash behavior on external drives (.Trash-1000 folders)
- Duplicate file finding (fdupes, czkawka)
- Backup confusion (Timeshift vs Deja Dup)
- Cloud sync (Nextcloud, rclone, Dropbox)
- File ownership issues (root vs user)

## Requirements

1. **Sound like real forum posts** - frustrated about file access issues
2. **Vary context:**
   - Distros: Ubuntu 22.04, Ubuntu 24.04, Fedora 40, Arch Linux, Debian 12,
     Linux Mint 21
   - File managers: Nautilus, Dolphin, Thunar, Nemo
   - Filesystems: ext4, NTFS, exFAT, Btrfs
3. **Specific answers** - exact commands, permission syntax, mount options
4. **Friction types:** user_error, config_issue
5. **Complexity mix:** Beginner (60%), Intermediate (30%), Advanced (10%)

## Output Format (JSON array of exactly 500 entries)

````json
[
  {
    "id": "FILE_ORG_001",
    "bucket": "File Organization",
    "sub_category": "External Drives",
    "complexity": "Beginner",
    "user_persona": "Everyday Consumer",
    "system_context": {
      "distro": "Ubuntu 24.04",
      "app_version": "Nautilus 46"
    },
    "interaction": {
      "user_query": "My USB drive is read-only. I can't delete or add files. It worked fine on Windows yesterday!",
      "ai_response": "The drive wasn't unmounted cleanly from Windows. Linux mounts it read-only to prevent corruption.\n\n**Fix:**\n```bash\n# Find your drive (look for /dev/sdX1)\nlsblk\n\n# Fix the NTFS filesystem (replace sdX1 with your drive)\nsudo ntfsfix /dev/sdX1\n\n# Unplug and replug the drive\n```\n\nIt should now mount as read-write. Always use 'Safely Remove' in Windows before unplugging."
    },
    "technical_tags": ["ntfs", "read-only", "external-drive", "ntfsfix"],
    "friction_type": "user_error"
  }
]
````

**Generate exactly 500 unique, high-quality questions. Return ONLY the JSON
array, no additional text.**
