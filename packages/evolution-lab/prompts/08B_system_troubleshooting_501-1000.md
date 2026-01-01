# Prompt 08B: System Troubleshooting (Questions 501-1000)

Generate **500 realistic Linux user questions** for the **System
Troubleshooting** category.

## Bucket Details

- **Name:** System Troubleshooting
- **Persona:** Power User
- **Focus Areas:** Kernel panic, OOM killer, boot performance, drivers, system
  logs
- **ID Range:** SYS_TROUBLE_501 to SYS_TROUBLE_1000

## Batch Coverage (5 batches × 100 questions each)

6. **Questions 501-600:** Privacy and security concerns
7. **Questions 601-700:** Multi-device and sync scenarios
8. **Questions 701-800:** Work/professional context
9. **Questions 801-900:** Personal/home context
10. **Questions 901-1000:** Edge cases and niche scenarios

## Real-World Context Examples

- SELinux/AppArmor denials
- Swap configuration and zram
- CPU frequency scaling
- Thermal throttling
- Power management (TLP, powertop)
- Firmware updates
- Secure boot issues
- TPM and disk encryption

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
    "id": "SYS_TROUBLE_501",
    "bucket": "System Troubleshooting",
    "sub_category": "OOM Killer",
    "complexity": "Advanced",
    "user_persona": "Power User",
    "system_context": {
      "distro": "Arch Linux",
      "app_version": "Kernel 6.8"
    },
    "interaction": {
      "user_query": "My web server process keeps disappearing every night around 3am. No crash logs, it just stops.",
      "ai_response": "This sounds like the OOM (Out-Of-Memory) Killer. Check the logs:\n\n```bash\nsudo grep -i 'killed process' /var/log/syslog\n# or on systemd systems:\nsudo journalctl -k | grep -i 'killed process'\n```\n\nYou'll see something like:\n```\nOut of memory: Killed process 1234 (node) total-vm:4GB, anon-rss:3.8GB\n```\n\n**Solutions:**\n1. **Add more swap:**\n```bash\nsudo fallocate -l 4G /swapfile\nsudo chmod 600 /swapfile\nsudo mkswap /swapfile\nsudo swapon /swapfile\n```\n\n2. **Fix memory leak** in your application\n3. **Increase OOM score adjustment** to protect critical processes"
    },
    "technical_tags": ["oom-killer", "memory-management", "swap", "logs"],
    "friction_type": "config_issue"
  }
]
````

**Generate exactly 500 unique, high-quality questions. Return ONLY the JSON
array, no additional text.**
