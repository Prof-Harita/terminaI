# Prompt 03A: Entertainment & Media (Questions 1-500)

Generate **500 realistic Linux user questions** for the **Entertainment &
Media** category.

## Bucket Details

- **Name:** Entertainment & Media
- **Persona:** Everyday Consumer
- **Focus Areas:** Spotify, DRM/codecs, video editing, hardware acceleration,
  streaming
- **ID Range:** ENT_MEDIA_001 to ENT_MEDIA_500

## Batch Coverage (5 batches × 100 questions each)

1. **Questions 001-100:** Most common/general issues
2. **Questions 101-200:** Frustration-driven troubleshooting
3. **Questions 201-300:** How-to tutorials and guides
4. **Questions 301-400:** Comparisons and recommendations
5. **Questions 401-500:** Automation and efficiency

## Real-World Context Examples

- Spotify singleton lock (app won't launch after crash)
- DaVinci Resolve glib library conflicts
- Netflix 720p limitation (Widevine L1)
- Hardware video acceleration in browsers (VA-API)
- Video tearing/stuttering
- Kdenlive NVENC rendering issues
- Missing codecs for H.264/H.265
- Steam Proton game compatibility

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
    "id": "ENT_MEDIA_001",
    "bucket": "Entertainment & Media",
    "sub_category": "Spotify",
    "complexity": "Beginner",
    "user_persona": "Everyday Consumer",
    "system_context": {
      "distro": "Ubuntu 24.04",
      "app_version": "Spotify 1.2.31"
    },
    "interaction": {
      "user_query": "Spotify won't open. I click the icon, it bounces for a second, then nothing happens. No error message.",
      "ai_response": "This is likely the 'singleton lock' issue - Spotify crashed and left a lock file.\n\n**Fix:**\n```bash\nrm -rf ~/.cache/spotify\nrm -rf ~/.config/spotify\n```\n\nThen try launching Spotify again. This clears the corrupted cache and lock files that prevent new instances from starting."
    },
    "technical_tags": ["spotify", "singleton-lock", "cache-corruption"],
    "friction_type": "user_error"
  }
]
````

**Generate exactly 500 unique, high-quality questions. Return ONLY the JSON
array, no additional text.**
