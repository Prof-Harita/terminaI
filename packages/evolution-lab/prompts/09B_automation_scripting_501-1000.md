# Prompt 09B: Automation & Scripting (Questions 501-1000)

Generate **500 realistic Linux user questions** for the **Automation &
Scripting** category.

## Bucket Details

- **Name:** Automation & Scripting
- **Persona:** Power User
- **Focus Areas:** Cron, systemd timers, environment variables, bash scripting,
  automation
- **ID Range:** AUTO_SCRIPT_501 to AUTO_SCRIPT_1000

## Batch Coverage (5 batches × 100 questions each)

6. **Questions 501-600:** Privacy and security concerns
7. **Questions 601-700:** Multi-device and sync scenarios
8. **Questions 701-800:** Work/professional context
9. **Questions 801-900:** Personal/home context
10. **Questions 901-1000:** Edge cases and niche scenarios

## Real-World Context Examples

- Batch file operations (rename, convert, compress)
- Automated backups with rsync
- Log rotation and cleanup
- Monitoring and alerting scripts
- API automation with curl/wget
- Database backup automation
- Git automation
- System maintenance scripts

## Requirements

1. **Sound like technical forum posts** - power users automating tasks
2. **Vary context:**
   - Distros: Ubuntu 22.04, Ubuntu 24.04, Fedora 40, Arch Linux, Debian 12
   - Shells: bash, zsh, fish
   - Tools: cron, systemd, inotify, rsync
3. **Specific answers** - crontab syntax, systemd unit files, script examples
4. **Friction types:** config_issue, user_error
5. **Complexity mix:** Intermediate (50%), Advanced (50%)

## Output Format (JSON array of exactly 500 entries)

````json
[
  {
    "id": "AUTO_SCRIPT_501",
    "bucket": "Automation & Scripting",
    "sub_category": "Systemd Timers",
    "complexity": "Advanced",
    "user_persona": "Power User",
    "system_context": {
      "distro": "Fedora 40",
      "app_version": "systemd 255"
    },
    "interaction": {
      "user_query": "How do I convert my cron job '0 5 * * * /backup.sh' to a systemd timer? I want better logging.",
      "ai_response": "Create two files:\n\n**1. Service file: ~/.config/systemd/user/backup.service**\n```ini\n[Unit]\nDescription=Daily Backup\n\n[Service]\nType=oneshot\nExecStart=/home/user/backup.sh\n```\n\n**2. Timer file: ~/.config/systemd/user/backup.timer**\n```ini\n[Unit]\nDescription=Daily Backup Timer\n\n[Timer]\nOnCalendar=daily\nOnCalendar=05:00\nPersistent=true\n\n[Install]\nWantedBy=timers.target\n```\n\n**Enable and start:**\n```bash\nsystemctl --user enable backup.timer\nsystemctl --user start backup.timer\n\n# Check status\nsystemctl --user list-timers\n```\n\n**View logs:**\n```bash\njournalctl --user -u backup.service\n```"
    },
    "technical_tags": [
      "systemd-timers",
      "cron-migration",
      "automation",
      "logging"
    ],
    "friction_type": "config_issue"
  }
]
````

**Generate exactly 500 unique, high-quality questions. Return ONLY the JSON
array, no additional text.**
