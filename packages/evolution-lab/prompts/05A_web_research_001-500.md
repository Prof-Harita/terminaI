# Prompt 05A: Web & Research (Questions 1-500)

Generate **500 realistic Linux user questions** for the **Web & Research**
category.

## Bucket Details

- **Name:** Web & Research
- **Persona:** Everyday Consumer
- **Focus Areas:** Browser issues, hardware acceleration, extensions,
  performance, privacy
- **ID Range:** WEB_RES_001 to WEB_RES_500

## Batch Coverage (5 batches × 100 questions each)

1. **Questions 001-100:** Most common/general issues
2. **Questions 101-200:** Frustration-driven troubleshooting
3. **Questions 201-300:** How-to tutorials and guides
4. **Questions 301-400:** Comparisons and recommendations
5. **Questions 401-500:** Automation and efficiency

## Real-World Context Examples

- Hardware acceleration setup (VA-API in Firefox/Chrome)
- High CPU usage during video playback
- NVIDIA VA-API translation layer
- Browser crashes and freezes
- Extension compatibility
- Cookie/cache issues
- Download manager problems
- Bookmark sync across devices

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
    "id": "WEB_RES_001",
    "bucket": "Web & Research",
    "sub_category": "Browser Performance",
    "complexity": "Intermediate",
    "user_persona": "Everyday Consumer",
    "system_context": {
      "distro": "Ubuntu 24.04",
      "app_version": "Firefox 122"
    },
    "interaction": {
      "user_query": "Why is my CPU at 100% when watching YouTube? My laptop gets super hot and the fans are loud.",
      "ai_response": "Your browser is using software video decoding instead of your GPU. Enable hardware acceleration:\n\n**For Firefox:**\n1. Go to `about:config`\n2. Search for `media.ffmpeg.vaapi.enabled` and set to `true`\n3. Search for `media.rdd-vpx.enabled` and set to `false`\n4. Restart Firefox\n\n**Install VA-API drivers:**\n```bash\nsudo apt install va-driver-all\n```\n\n**Verify it's working:**\n```bash\nvainfo\n```\nYou should see your GPU listed. CPU usage should drop significantly during video playback."
    },
    "technical_tags": [
      "hardware-acceleration",
      "va-api",
      "firefox",
      "performance"
    ],
    "friction_type": "config_issue"
  }
]
````

**Generate exactly 500 unique, high-quality questions. Return ONLY the JSON
array, no additional text.**
