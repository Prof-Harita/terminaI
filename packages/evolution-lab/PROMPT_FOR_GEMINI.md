# Prompt for Gemini: Generate 100 Linux User Questions

**Instructions:** Copy everything below this line and paste into Gemini. Run
this prompt 10 times per bucket (changing the bucket and batch number each time)
to generate 1000 questions per bucket.

---

You are an expert in Linux user experience research. Generate **100 realistic
user questions** for testing an AI terminal assistant on Linux.

## Bucket: [SELECT ONE]

- **Bucket 1: Productivity & Documents** (Persona: Everyday Consumer)
  - LibreOffice, PDF editing, document conversion, font issues, file locking
- **Bucket 2: Communication & Email** (Persona: Everyday Consumer)
  - Thunderbird, OAuth2, video conferencing, screen sharing, Wayland issues
- **Bucket 3: Entertainment & Media** (Persona: Everyday Consumer)
  - Spotify, DRM/codecs, video editing, hardware acceleration, streaming
- **Bucket 4: Life Management** (Persona: Everyday Consumer)
  - Calendar sync, financial tools, weather apps, task management, cloud sync
- **Bucket 5: Web & Research** (Persona: Everyday Consumer)
  - Browser issues, hardware acceleration, extensions, performance, privacy
- **Bucket 6: File Organization** (Persona: Everyday Consumer)
  - Permissions, external drives, backups, deduplication, cloud sync
- **Bucket 7: Application Issues** (Persona: Everyday Consumer)
  - Snap/Flatpak, AppImage, sandboxing, dependencies, crashes
- **Bucket 8: System Troubleshooting** (Persona: Power User)
  - Kernel panic, OOM killer, boot performance, drivers, system logs
- **Bucket 9: Automation & Scripting** (Persona: Power User)
  - Cron, systemd timers, environment variables, bash scripting
- **Bucket 10: Development & DevOps** (Persona: Power User)
  - Docker, Git, databases, SSH, development tools

## Batch Focus: [SELECT ONE]

1. Most common/general issues
2. Frustration-driven troubleshooting ("why won't...", "X stopped working")
3. How-to tutorials and guides
4. Comparisons and recommendations ("best app for...", "should I use X or Y")
5. Automation and efficiency
6. Privacy and security concerns
7. Multi-device and sync scenarios
8. Work/professional context
9. Personal/home context
10. Edge cases and niche scenarios

## Requirements:

1. **Questions must sound like real forum posts** - casual, sometimes
   frustrated, occasionally vague
2. **Vary the context:**
   - Distros: Ubuntu 22.04, Ubuntu 24.04, Fedora 40, Arch Linux, Debian 12,
     Linux Mint 21
   - Hardware: NVIDIA GPU, AMD GPU, Intel integrated, laptop, desktop, server
   - Packaging: Snap, Flatpak, native packages, AppImage
3. **Answers must be specific** - include exact commands, file paths, config
   options
4. **Rank by frequency** - most common issues first
5. **Include friction types:** protocol_mismatch, wayland_conflict, sandboxing,
   legacy_dependency, user_error, config_issue
6. **Mix complexity:** Beginner (60%), Intermediate (30%), Advanced (10%)

## Real-World Context Examples:

- **LibreOffice lock files:** `.~lock.filename#` preventing opening after crash
- **Wayland screen sharing:** Black screen in Zoom/Discord due to X11 API calls
- **AppImage on Ubuntu 24.04:** Silent failure due to missing libfuse2
- **Thunderbird OAuth2:** "Password incorrect" when Gmail requires OAuth2 method
- **Spotify singleton lock:** App won't launch after crash, needs cache deletion
- **Docker permission denied:** User not in docker group
- **Snap sandboxing:** USB drives invisible in file picker due to missing
  permissions
- **Font substitution:** Document layout shifts due to missing MS fonts

## Output Format (JSON array of exactly 100 entries):

```json
[
  {
    "id": "BUCKET_CODE_001",
    "bucket": "Bucket Name",
    "sub_category": "specific subcategory",
    "complexity": "Beginner",
    "user_persona": "Everyday Consumer or Power User",
    "system_context": {
      "distro": "Ubuntu 24.04",
      "app_version": "App Name X.Y"
    },
    "interaction": {
      "user_query": "I can't open my Excel file in LibreOffice. It says 'General Error' and there's a weird .~lock file in my folder. What's going on?",
      "ai_response": "The `.~lock.filename#` file is LibreOffice's lock mechanism. It persists after crashes.\n\nTo fix:\n1. Press `Ctrl+H` in your file manager to show hidden files\n2. Delete the `.~lock.filename#` file\n3. Try opening your document again\n\nThis prevents data corruption but can get stuck after improper shutdowns."
    },
    "technical_tags": ["file-locking", "libreoffice", "crash-recovery"],
    "friction_type": "user_error"
  }
]
```

## Bucket Codes:

- PROD_DOC (Productivity & Documents)
- COMM_EMAIL (Communication & Email)
- ENT_MEDIA (Entertainment & Media)
- LIFE_MGT (Life Management)
- WEB_RES (Web & Research)
- FILE_ORG (File Organization)
- APP_ISSUES (Application Issues)
- SYS_TROUBLE (System Troubleshooting)
- AUTO_SCRIPT (Automation & Scripting)
- DEV_DEVOPS (Development & DevOps)

## ID Numbering:

- Batch 1: 001-100
- Batch 2: 101-200
- Batch 3: 201-300
- Batch 4: 301-400
- Batch 5: 401-500
- Batch 6: 501-600
- Batch 7: 601-700
- Batch 8: 701-800
- Batch 9: 801-900
- Batch 10: 901-1000

---

**Generate exactly 100 unique, high-quality questions. Return ONLY the JSON
array, no additional text.**
