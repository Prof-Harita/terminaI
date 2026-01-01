# Prompt 03B: Entertainment & Media (Questions 501-1000)

Generate **500 realistic Linux user questions** for the **Entertainment &
Media** category.

## Bucket Details

- **Name:** Entertainment & Media
- **Persona:** Everyday Consumer
- **Focus Areas:** Spotify, DRM/codecs, video editing, hardware acceleration,
  streaming
- **ID Range:** ENT_MEDIA_501 to ENT_MEDIA_1000

## Batch Coverage (5 batches × 100 questions each)

6. **Questions 501-600:** Privacy and security concerns
7. **Questions 601-700:** Multi-device and sync scenarios
8. **Questions 701-800:** Work/professional context
9. **Questions 801-900:** Personal/home context
10. **Questions 901-1000:** Edge cases and niche scenarios

## Real-World Context Examples

- Photo editing (GIMP, Darktable, RawTherapee)
- Audio production (Ardour, Audacity)
- Podcast recording/editing
- YouTube downloading
- Music library management
- Game controller configuration
- Emulator setup
- Streaming to Twitch/YouTube

## Requirements

1. **Sound like real forum posts** - frustrated about entertainment not working
2. **Vary context:**
   - Distros: Ubuntu 22.04, Ubuntu 24.04, Fedora 40, Arch Linux, Debian 12,
     Linux Mint 21
   - Apps: Spotify, VLC, Kdenlive, DaVinci Resolve, OBS, Steam
   - Hardware: NVIDIA, AMD, Intel GPUs
3. **Specific answers** - exact commands, config files, driver packages
4. **Friction types:** legacy_dependency, config_issue, sandboxing
5. **Complexity mix:** Beginner (60%), Intermediate (30%), Advanced (10%)

## Output Format (JSON array of exactly 500 entries)

````json
[
  {
    "id": "ENT_MEDIA_501",
    "bucket": "Entertainment & Media",
    "sub_category": "Video Editing",
    "complexity": "Advanced",
    "user_persona": "Power User",
    "system_context": {
      "distro": "Fedora 40",
      "app_version": "DaVinci Resolve 19"
    },
    "interaction": {
      "user_query": "DaVinci Resolve installed fine but won't launch. No error, just nothing happens when I click it.",
      "ai_response": "This is a glib version mismatch. DaVinci is built for CentOS and conflicts with Fedora's newer libraries.\n\n**Fix:**\n```bash\ncd /opt/resolve/libs\nsudo mv libglib-2.0.so libglib-2.0.so.bak\nsudo mv libgio-2.0.so libgio-2.0.so.bak\nsudo mv libgmodule-2.0.so libgmodule-2.0.so.bak\n```\n\nThis forces Resolve to use your system's newer glib libraries instead of its bundled outdated ones. Try launching again."
    },
    "technical_tags": ["davinci-resolve", "library-conflict", "glib"],
    "friction_type": "legacy_dependency"
  }
]
````

**Generate exactly 500 unique, high-quality questions. Return ONLY the JSON
array, no additional text.**
