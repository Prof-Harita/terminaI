# Prompt 04A: Life Management (Questions 1-500)

Generate **500 realistic Linux user questions** for the **Life Management**
category.

## Bucket Details

- **Name:** Life Management
- **Persona:** Everyday Consumer
- **Focus Areas:** Calendar sync, financial tools, weather apps, task
  management, cloud sync
- **ID Range:** LIFE_MGT_001 to LIFE_MGT_500

## Batch Coverage (5 batches × 100 questions each)

1. **Questions 001-100:** Most common/general issues
2. **Questions 101-200:** Frustration-driven troubleshooting
3. **Questions 201-300:** How-to tutorials and guides
4. **Questions 301-400:** Comparisons and recommendations
5. **Questions 401-500:** Automation and efficiency

## Real-World Context Examples

- GNOME Online Accounts silent failures (shared calendars not syncing)
- GnuCash double-entry accounting confusion
- Weather app location detection failures (GeoClue)
- Google Tasks integration limitations
- Nextcloud sync issues
- Password manager setup (Bitwarden, KeePassXC)
- Note-taking app sync (Joplin, Standard Notes)

## Requirements

1. **Sound like real forum posts** - frustrated about life management tools
2. **Vary context:**
   - Distros: Ubuntu 22.04, Ubuntu 24.04, Fedora 40, Arch Linux, Debian 12,
     Linux Mint 21
   - Apps: GNOME Calendar, Evolution, GnuCash, HomeBank, Nextcloud
3. **Specific answers** - exact commands, config paths, account setup steps
4. **Friction types:** protocol_mismatch, config_issue, user_error
5. **Complexity mix:** Beginner (60%), Intermediate (30%), Advanced (10%)

## Output Format (JSON array of exactly 500 entries)

````json
[
  {
    "id": "LIFE_MGT_001",
    "bucket": "Life Management",
    "sub_category": "Calendar Sync",
    "complexity": "Beginner",
    "user_persona": "Everyday Consumer",
    "system_context": {
      "distro": "Ubuntu 24.04",
      "app_version": "GNOME Calendar 45"
    },
    "interaction": {
      "user_query": "I connected my Google Account in Settings and my main calendar shows up, but my wife's shared calendar that I can see on my phone is missing.",
      "ai_response": "GNOME Calendar defaults to syncing only your primary calendar. To add shared calendars:\n\n1. Open **Evolution** (the backend for GNOME Calendar):\n```bash\nevolution\n```\n2. Go to **Edit → Preferences → Calendar and Tasks**\n3. Expand your Google account\n4. Check the boxes for the shared calendars you want to sync\n5. Close Evolution and reopen GNOME Calendar\n\nThe shared calendars should now appear."
    },
    "technical_tags": ["calendar-sync", "gnome-online-accounts", "evolution"],
    "friction_type": "config_issue"
  }
]
````

**Generate exactly 500 unique, high-quality questions. Return ONLY the JSON
array, no additional text.**
