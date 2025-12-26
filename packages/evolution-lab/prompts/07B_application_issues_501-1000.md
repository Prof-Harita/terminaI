# Prompt 07B: Application Issues (Questions 501-1000)

Generate **500 realistic Linux user questions** for the **Application Issues**
category.

## Bucket Details

- **Name:** Application Issues
- **Persona:** Everyday Consumer
- **Focus Areas:** Snap/Flatpak, AppImage, sandboxing, dependencies, crashes
- **ID Range:** APP_ISSUES_501 to APP_ISSUES_1000

## Batch Coverage (5 batches × 100 questions each)

6. **Questions 501-600:** Privacy and security concerns
7. **Questions 601-700:** Multi-device and sync scenarios
8. **Questions 701-800:** Work/professional context
9. **Questions 801-900:** Personal/home context
10. **Questions 901-1000:** Edge cases and niche scenarios

## Real-World Context Examples

- Wine/Proton for Windows apps
- Application theming issues
- Desktop file creation
- Default application settings
- Application autostart
- Uninstalling stubborn apps
- Downgrading packages
- Beta/testing channels

## Requirements

1. **Sound like real forum posts** - frustrated about apps not working
2. **Vary context:**
   - Distros: Ubuntu 22.04, Ubuntu 24.04, Fedora 40, Arch Linux, Debian 12,
     Linux Mint 21
   - Package formats: Snap, Flatpak, AppImage, .deb, .rpm, AUR
3. **Specific answers** - exact commands, permission fixes, package installation
4. **Friction types:** sandboxing, legacy_dependency, user_error
5. **Complexity mix:** Beginner (60%), Intermediate (30%), Advanced (10%)

## Output Format (JSON array of exactly 500 entries)

````json
[
  {
    "id": "APP_ISSUES_501",
    "bucket": "Application Issues",
    "sub_category": "AppImage",
    "complexity": "Beginner",
    "user_persona": "Everyday Consumer",
    "system_context": {
      "distro": "Ubuntu 24.04",
      "app_version": "N/A"
    },
    "interaction": {
      "user_query": "I downloaded an AppImage file and made it executable, but when I double-click it, nothing happens. No error, no window, nothing.",
      "ai_response": "Ubuntu 24.04 doesn't include libfuse2 by default, which AppImages need.\n\n**Fix:**\n```bash\nsudo apt install libfuse2t64\n```\n\nThen try running your AppImage again. It should launch normally.\n\n**Why this happens:** Ubuntu switched to fuse3, but most AppImages still require the older fuse2 library."
    },
    "technical_tags": ["appimage", "libfuse2", "ubuntu-24.04", "dependencies"],
    "friction_type": "legacy_dependency"
  }
]
````

**Generate exactly 500 unique, high-quality questions. Return ONLY the JSON
array, no additional text.**
