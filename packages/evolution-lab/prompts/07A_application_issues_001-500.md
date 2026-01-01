# Prompt 07A: Application Issues (Questions 1-500)

Generate **500 realistic Linux user questions** for the **Application Issues**
category.

## Bucket Details

- **Name:** Application Issues
- **Persona:** Everyday Consumer
- **Focus Areas:** Snap/Flatpak, AppImage, sandboxing, dependencies, crashes
- **ID Range:** APP_ISSUES_001 to APP_ISSUES_500

## Batch Coverage (5 batches × 100 questions each)

1. **Questions 001-100:** Most common/general issues
2. **Questions 101-200:** Frustration-driven troubleshooting
3. **Questions 201-300:** How-to tutorials and guides
4. **Questions 301-400:** Comparisons and recommendations
5. **Questions 401-500:** Automation and efficiency

## Real-World Context Examples

- Snap sandboxing blocking USB drives/external media
- AppImage silent failure on Ubuntu 24.04 (missing libfuse2)
- Flatpak permission issues (Flatseal)
- Missing dependencies for native packages
- Application crashes with no error
- Slow Snap startup times
- Conflicting package versions

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
    "id": "APP_ISSUES_001",
    "bucket": "Application Issues",
    "sub_category": "Snap Sandboxing",
    "complexity": "Beginner",
    "user_persona": "Everyday Consumer",
    "system_context": {
      "distro": "Ubuntu 24.04",
      "app_version": "GIMP (Snap)"
    },
    "interaction": {
      "user_query": "I installed GIMP from the software store. When I try to save my image to my USB stick, the stick doesn't show up in the save dialog. But I can see it in my file manager!",
      "ai_response": "This is a Snap sandbox restriction. By default, Snaps can't access removable media.\n\n**Fix:**\n```bash\nsudo snap connect gimp:removable-media\n```\n\n**Or use the GUI:**\n1. Open 'Ubuntu Software'\n2. Find GIMP in 'Installed' apps\n3. Click 'Permissions'\n4. Enable 'Read/write files on removable storage devices'\n\nThe USB drive should now appear in GIMP's file dialogs."
    },
    "technical_tags": ["snap", "sandboxing", "removable-media", "permissions"],
    "friction_type": "sandboxing"
  }
]
````

**Generate exactly 500 unique, high-quality questions. Return ONLY the JSON
array, no additional text.**
