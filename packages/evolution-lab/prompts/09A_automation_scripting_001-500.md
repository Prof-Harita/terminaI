# Prompt 09A: Automation & Scripting (Questions 1-500)

Generate **500 realistic Linux user questions** for the **Automation &
Scripting** category.

## Bucket Details

- **Name:** Automation & Scripting
- **Persona:** Power User
- **Focus Areas:** Cron, systemd timers, environment variables, bash scripting,
  automation
- **ID Range:** AUTO_SCRIPT_001 to AUTO_SCRIPT_500

## Batch Coverage (5 batches × 100 questions each)

1. **Questions 001-100:** Most common/general issues
2. **Questions 101-200:** Frustration-driven troubleshooting
3. **Questions 201-300:** How-to tutorials and guides
4. **Questions 301-400:** Comparisons and recommendations
5. **Questions 401-500:** Automation and efficiency

## Real-World Context Examples

- Cron jobs failing silently (PATH issues)
- Environment variables not available in cron
- Systemd timer vs cron comparison
- Script permissions and execution
- Logging cron output
- Handling missed runs
- File watchers (inotify)
- Parallel execution

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
    "id": "AUTO_SCRIPT_001",
    "bucket": "Automation & Scripting",
    "sub_category": "Cron",
    "complexity": "Intermediate",
    "user_persona": "Power User",
    "system_context": {
      "distro": "Ubuntu 24.04",
      "app_version": "cron 3.0"
    },
    "interaction": {
      "user_query": "My backup script works fine when I run it manually, but when cron runs it, it fails with 'command not found' errors.",
      "ai_response": "Cron doesn't load your shell environment (.bashrc, .profile). It has a minimal PATH.\n\n**Fix: Use absolute paths**\n```bash\n#!/bin/bash\n# Instead of:\n# docker ps\n\n# Use:\n/usr/bin/docker ps\n```\n\n**Or set PATH in crontab:**\n```cron\nPATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n\n0 2 * * * /home/user/backup.sh\n```\n\n**Find command locations:**\n```bash\nwhich docker  # Shows /usr/bin/docker\n```"
    },
    "technical_tags": ["cron", "environment-variables", "path", "automation"],
    "friction_type": "config_issue"
  }
]
````

**Generate exactly 500 unique, high-quality questions. Return ONLY the JSON
array, no additional text.**
