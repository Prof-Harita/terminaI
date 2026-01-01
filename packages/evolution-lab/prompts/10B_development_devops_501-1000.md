# Prompt 10B: Development & DevOps (Questions 501-1000)

Generate **500 realistic Linux user questions** for the **Development & DevOps**
category.

## Bucket Details

- **Name:** Development & DevOps
- **Persona:** Power User
- **Focus Areas:** Docker, Git, databases, SSH, development tools
- **ID Range:** DEV_DEVOPS_501 to DEV_DEVOPS_1000

## Batch Coverage (5 batches × 100 questions each)

6. **Questions 501-600:** Privacy and security concerns
7. **Questions 601-700:** Multi-device and sync scenarios
8. **Questions 701-800:** Work/professional context
9. **Questions 801-900:** Personal/home context
10. **Questions 901-1000:** Edge cases and niche scenarios

## Real-World Context Examples

- CI/CD pipeline setup
- Container orchestration (docker-compose, k8s)
- Database migrations and backups
- SSL/TLS certificate management
- Reverse proxy setup (nginx, traefik)
- Monitoring and logging (Prometheus, Grafana)
- Code signing and GPG keys
- Remote development over SSH

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
    "id": "DEV_DEVOPS_501",
    "bucket": "Development & DevOps",
    "sub_category": "Git",
    "complexity": "Intermediate",
    "user_persona": "Power User",
    "system_context": {
      "distro": "Fedora 40",
      "app_version": "Git 2.45"
    },
    "interaction": {
      "user_query": "I'm trying to push to GitHub but it says 'Support for password authentication was removed'. I have 2FA enabled. What password do I use?",
      "ai_response": "GitHub no longer accepts account passwords for HTTPS Git operations. You need a Personal Access Token (PAT).\n\n**Create a PAT:**\n1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)\n2. Generate new token\n3. Select scopes: `repo` (for private repos) or `public_repo`\n4. Copy the token (you won't see it again!)\n\n**Use the token:**\nWhen Git prompts for password, paste the PAT instead.\n\n**Cache it so you don't have to paste every time:**\n```bash\ngit config --global credential.helper store\n```\n\nNext time you push, enter your username and PAT. Git will save it to `~/.git-credentials`."
    },
    "technical_tags": ["git", "github", "authentication", "pat", "2fa"],
    "friction_type": "protocol_mismatch"
  }
]
````

**Generate exactly 500 unique, high-quality questions. Return ONLY the JSON
array, no additional text.**
