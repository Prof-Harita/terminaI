# Prompt 05B: Web & Research (Questions 501-1000)

Generate **500 realistic Linux user questions** for the **Web & Research**
category.

## Bucket Details

- **Name:** Web & Research
- **Persona:** Everyday Consumer
- **Focus Areas:** Browser issues, hardware acceleration, extensions,
  performance, privacy
- **ID Range:** WEB_RES_501 to WEB_RES_1000

## Batch Coverage (5 batches × 100 questions each)

6. **Questions 501-600:** Privacy and security concerns
7. **Questions 601-700:** Multi-device and sync scenarios
8. **Questions 701-800:** Work/professional context
9. **Questions 801-900:** Personal/home context
10. **Questions 901-1000:** Edge cases and niche scenarios

## Real-World Context Examples

- Ad blocker setup and conflicts
- Privacy extensions (uBlock Origin, Privacy Badger)
- Password manager integration
- WebRTC leaks
- DNS-over-HTTPS configuration
- Profile management
- Multiple browser instances
- Web app installation (PWAs)

## Requirements

1. **Sound like real forum posts** - frustrated about slow/broken browsers
2. **Vary context:**
   - Distros: Ubuntu 22.04, Ubuntu 24.04, Fedora 40, Arch Linux, Debian 12,
     Linux Mint 21
   - Browsers: Firefox, Chrome, Chromium, Brave, Edge
   - Hardware: NVIDIA, AMD, Intel GPUs
3. **Specific answers** - about:config flags, command-line arguments, driver
   packages
4. **Friction types:** config_issue, legacy_dependency
5. **Complexity mix:** Beginner (60%), Intermediate (30%), Advanced (10%)

## Output Format (JSON array of exactly 500 entries)

````json
[
  {
    "id": "WEB_RES_501",
    "bucket": "Web & Research",
    "sub_category": "Privacy",
    "complexity": "Beginner",
    "user_persona": "Everyday Consumer",
    "system_context": {
      "distro": "Fedora 40",
      "app_version": "Firefox 123"
    },
    "interaction": {
      "user_query": "How do I block ads in Firefox? I'm tired of seeing ads everywhere.",
      "ai_response": "Install uBlock Origin, the most effective ad blocker:\n\n1. Go to Firefox Add-ons: `about:addons`\n2. Search for 'uBlock Origin'\n3. Click 'Add to Firefox'\n4. Confirm the installation\n\n**Or install from command line:**\n```bash\nfirefox https://addons.mozilla.org/firefox/addon/ublock-origin/\n```\n\nAfter installation, the uBlock icon appears in your toolbar. It works automatically with default settings."
    },
    "technical_tags": ["ad-blocking", "privacy", "firefox-extensions"],
    "friction_type": "user_error"
  }
]
````

**Generate exactly 500 unique, high-quality questions. Return ONLY the JSON
array, no additional text.**
