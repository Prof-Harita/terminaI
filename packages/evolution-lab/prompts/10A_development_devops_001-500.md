# Prompt 10A: Development & DevOps (Questions 1-500)

Generate **500 realistic Linux user questions** for the **Development & DevOps**
category.

## Bucket Details

- **Name:** Development & DevOps
- **Persona:** Power User
- **Focus Areas:** Docker, Git, databases, SSH, development tools
- **ID Range:** DEV_DEVOPS_001 to DEV_DEVOPS_500

## Batch Coverage (5 batches × 100 questions each)

1. **Questions 001-100:** Most common/general issues
2. **Questions 101-200:** Frustration-driven troubleshooting
3. **Questions 201-300:** How-to tutorials and guides
4. **Questions 301-400:** Comparisons and recommendations
5. **Questions 401-500:** Automation and efficiency

## Real-World Context Examples

- Docker permission denied (socket ownership)
- Git authentication failures (PAT required)
- SSH key setup and agent
- PostgreSQL/MySQL installation and configuration
- Node.js/Python version management (nvm, pyenv)
- Container networking issues
- Port conflicts
- Environment setup for development

## Requirements

1. **Sound like technical forum posts** - developers troubleshooting
2. **Vary context:**
   - Distros: Ubuntu 22.04, Ubuntu 24.04, Fedora 40, Arch Linux, Debian 12
   - Tools: Docker, Git, PostgreSQL, MySQL, Node.js, Python, VS Code
3. **Specific answers** - exact commands, config files, troubleshooting steps
4. **Friction types:** config_issue, user_error, protocol_mismatch
5. **Complexity mix:** Intermediate (40%), Advanced (60%)

## Output Format (JSON array of exactly 500 entries)

````json
[
  {
    "id": "DEV_DEVOPS_001",
    "bucket": "Development & DevOps",
    "sub_category": "Docker",
    "complexity": "Beginner",
    "user_persona": "Power User",
    "system_context": {
      "distro": "Ubuntu 24.04",
      "app_version": "Docker 26.0"
    },
    "interaction": {
      "user_query": "Every docker command requires sudo. If I don't use sudo, I get 'permission denied while trying to connect to the Docker daemon socket'. How do I fix this?",
      "ai_response": "Your user isn't in the `docker` group. The Docker socket is owned by root:docker.\n\n**Fix:**\n```bash\nsudo usermod -aG docker $USER\n```\n\n**IMPORTANT:** You must log out and log back in (or reboot) for group changes to take effect.\n\n**Verify it worked:**\n```bash\n# After logging back in:\ngroups  # Should show 'docker' in the list\ndocker ps  # Should work without sudo\n```\n\n**Alternative (temporary, current session only):**\n```bash\nnewgrp docker\n```"
    },
    "technical_tags": ["docker", "permissions", "user-groups", "socket"],
    "friction_type": "config_issue"
  }
]
````

**Generate exactly 500 unique, high-quality questions. Return ONLY the JSON
array, no additional text.**
