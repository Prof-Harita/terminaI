# Prompt 02A: Communication & Email (Questions 1-500)

Generate **500 realistic Linux user questions** for the **Communication &
Email** category.

## Bucket Details

- **Name:** Communication & Email
- **Persona:** Everyday Consumer
- **Focus Areas:** Thunderbird, OAuth2, video conferencing, screen sharing,
  Wayland issues
- **ID Range:** COMM_EMAIL_001 to COMM_EMAIL_500

## Batch Coverage (5 batches × 100 questions each)

1. **Questions 001-100:** Most common/general issues
2. **Questions 101-200:** Frustration-driven troubleshooting
3. **Questions 201-300:** How-to tutorials and guides
4. **Questions 301-400:** Comparisons and recommendations
5. **Questions 401-500:** Automation and efficiency

## Real-World Context Examples

- Thunderbird OAuth2 authentication failures with Gmail/Microsoft 365
- Wayland black screen in Zoom/Teams/Discord screen sharing
- PipeWire screen capture setup
- Proton Mail Bridge configuration
- POP3 vs IMAP confusion (emails "disappearing")
- Two-factor authentication app password requirements
- PWA limitations for Teams/Slack
- Webcam/microphone permissions in browsers

## Requirements

1. **Sound like real forum posts** - casual, frustrated about communication
   failures
2. **Vary context:**
   - Distros: Ubuntu 22.04, Ubuntu 24.04, Fedora 40, Arch Linux, Debian 12,
     Linux Mint 21
   - Apps: Thunderbird 115+, Zoom, Discord, Teams PWA, Evolution
   - Display servers: Wayland vs X11
3. **Specific answers** - exact commands, config paths, browser flags
4. **Friction types:** protocol_mismatch, wayland_conflict, config_issue
5. **Complexity mix:** Beginner (60%), Intermediate (30%), Advanced (10%)

## Output Format (JSON array of exactly 500 entries)

```json
[
  {
    "id": "COMM_EMAIL_001",
    "bucket": "Communication & Email",
    "sub_category": "Thunderbird",
    "complexity": "Beginner",
    "user_persona": "Everyday Consumer",
    "system_context": {
      "distro": "Ubuntu 24.04",
      "app_version": "Thunderbird 115.5"
    },
    "interaction": {
      "user_query": "Thunderbird won't connect to my Gmail. It keeps saying 'Authentication Failed' but my password is definitely correct!",
      "ai_response": "Gmail deprecated basic password authentication. You need to use OAuth2:\n\n1. Open Thunderbird\n2. Go to **Account Settings** → **Server Settings**\n3. Change **Authentication Method** from 'Normal Password' to 'OAuth2'\n4. Try connecting again - a browser window will open for Google login\n5. Authorize Thunderbird\n\nThis is more secure than storing your password directly."
    },
    "technical_tags": ["oauth2", "gmail", "authentication", "thunderbird"],
    "friction_type": "protocol_mismatch"
  }
]
```

**Generate exactly 500 unique, high-quality questions. Return ONLY the JSON
array, no additional text.**
