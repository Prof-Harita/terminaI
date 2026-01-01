# Prompt 02B: Communication & Email (Questions 501-1000)

Generate **500 realistic Linux user questions** for the **Communication &
Email** category.

## Bucket Details

- **Name:** Communication & Email
- **Persona:** Everyday Consumer
- **Focus Areas:** Thunderbird, OAuth2, video conferencing, screen sharing,
  Wayland issues
- **ID Range:** COMM_EMAIL_501 to COMM_EMAIL_1000

## Batch Coverage (5 batches × 100 questions each)

6. **Questions 501-600:** Privacy and security concerns
7. **Questions 601-700:** Multi-device and sync scenarios
8. **Questions 701-800:** Work/professional context
9. **Questions 801-900:** Personal/home context
10. **Questions 901-1000:** Edge cases and niche scenarios

## Real-World Context Examples

- Calendar sync issues with Google/Microsoft
- Email encryption (PGP/GPG setup)
- Notification problems
- Attachment handling
- Spam filtering configuration
- Multiple account management
- Video call quality issues
- Background blur/virtual backgrounds

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

````json
[
  {
    "id": "COMM_EMAIL_501",
    "bucket": "Communication & Email",
    "sub_category": "Video Conferencing",
    "complexity": "Intermediate",
    "user_persona": "Everyday Consumer",
    "system_context": {
      "distro": "Fedora 40",
      "app_version": "Discord (Flatpak)"
    },
    "interaction": {
      "user_query": "When I try to share my screen in Discord, everyone just sees a black screen. Sound works fine though.",
      "ai_response": "This is a Wayland screen sharing issue. Fedora defaults to Wayland, and Discord needs specific setup:\n\n**Check your session:**\n```bash\necho $XDG_SESSION_TYPE\n```\n\n**If it says 'wayland', you have 2 options:**\n\n1. **Switch to X11 (easier):**\n   - Log out\n   - At login screen, click the gear icon\n   - Select 'GNOME on Xorg'\n   - Log back in\n\n2. **Enable Wayland support (if using Flatpak):**\n```bash\nflatpak override --user --socket=wayland com.discordapp.Discord\n```\nThen restart Discord."
    },
    "technical_tags": ["wayland", "screen-sharing", "discord", "pipewire"],
    "friction_type": "wayland_conflict"
  }
]
````

**Generate exactly 500 unique, high-quality questions. Return ONLY the JSON
array, no additional text.**
