# Prompt 06B: File Organization (Questions 501-1000)

Generate **500 realistic Linux user questions** for the **File Organization**
category.

## Bucket Details

- **Name:** File Organization
- **Persona:** Everyday Consumer
- **Focus Areas:** Permissions, external drives, backups, deduplication, cloud
  sync
- **ID Range:** FILE_ORG_501 to FILE_ORG_1000

## Batch Coverage (5 batches × 100 questions each)

6. **Questions 501-600:** Privacy and security concerns
7. **Questions 601-700:** Multi-device and sync scenarios
8. **Questions 701-800:** Work/professional context
9. **Questions 801-900:** Personal/home context
10. **Questions 901-1000:** Edge cases and niche scenarios

## Real-World Context Examples

- Encrypted folders/drives (LUKS, eCryptfs)
- Network shares (SMB, NFS)
- Symbolic links and hard links
- File compression and archives
- Disk usage analysis
- Partition management
- File recovery after deletion
- Metadata and EXIF data

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
    "id": "FILE_ORG_501",
    "bucket": "File Organization",
    "sub_category": "Backups",
    "complexity": "Intermediate",
    "user_persona": "Everyday Consumer",
    "system_context": {
      "distro": "Linux Mint 21",
      "app_version": "Timeshift 22.06"
    },
    "interaction": {
      "user_query": "I set up Timeshift but my hard drive died and I lost all my documents. I thought Timeshift was backing them up!",
      "ai_response": "Timeshift is for **system snapshots**, not user data backups. By default, it excludes /home to avoid overwriting your documents during a system restore.\n\n**For user data backups, use Deja Dup:**\n```bash\nsudo apt install deja-dup\n```\n\nSet it up:\n1. Open 'Backups' from the menu\n2. Choose what to back up (Documents, Pictures, etc.)\n3. Choose backup location (external drive or cloud)\n4. Set schedule\n\n**Use both:**\n- Timeshift: System recovery\n- Deja Dup: Document/photo backup"
    },
    "technical_tags": ["backups", "timeshift", "deja-dup", "data-loss"],
    "friction_type": "user_error"
  }
]
````

**Generate exactly 500 unique, high-quality questions. Return ONLY the JSON
array, no additional text.**
