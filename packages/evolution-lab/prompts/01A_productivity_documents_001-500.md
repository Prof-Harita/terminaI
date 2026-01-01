# Prompt 01A: Productivity & Documents (Questions 1-500)

Generate **500 realistic Linux user questions** for the **Productivity &
Documents** category.

## Bucket Details

- **Name:** Productivity & Documents
- **Persona:** Everyday Consumer
- **Focus Areas:** LibreOffice, PDF editing/viewing, document conversion, font
  issues, file locking
- **ID Range:** PROD_DOC_001 to PROD_DOC_500

## Batch Coverage (5 batches × 100 questions each)

This prompt covers these focus areas:

1. **Questions 001-100:** Most common/general issues
2. **Questions 101-200:** Frustration-driven troubleshooting ("why won't...", "X
   stopped working")
3. **Questions 201-300:** How-to tutorials and guides
4. **Questions 301-400:** Comparisons and recommendations ("best app for...",
   "should I use X or Y")
5. **Questions 401-500:** Automation and efficiency

## Real-World Context Examples

- LibreOffice lock files (`.~lock.filename#`) preventing opening after crash
- Font substitution causing layout shifts (missing MS fonts)
- PDF editing vs annotation confusion (Draw destroying text)
- Password-protected Excel files in Calc
- Heading numbering issues from Word imports
- PDF form filling limitations in default viewers
- Digital signature setup complexity

## Requirements

1. **Sound like real forum posts** - casual, sometimes frustrated, occasionally
   vague
2. **Vary context:**
   - Distros: Ubuntu 22.04, Ubuntu 24.04, Fedora 40, Arch Linux, Debian 12,
     Linux Mint 21
   - Apps: LibreOffice 7.3-24.8, Evince, Okular, Xournal++, Master PDF Editor
3. **Specific answers** - exact commands, file paths, config options
4. **Rank by frequency** - most common issues first within each batch
5. **Friction types:** legacy_dependency, user_error, config_issue
6. **Complexity mix:** Beginner (60%), Intermediate (30%), Advanced (10%)

## Output Format (JSON array of exactly 500 entries)

```json
[
  {
    "id": "PROD_DOC_001",
    "bucket": "Productivity & Documents",
    "sub_category": "LibreOffice",
    "complexity": "Beginner",
    "user_persona": "Everyday Consumer",
    "system_context": {
      "distro": "Ubuntu 22.04",
      "app_version": "LibreOffice 7.3"
    },
    "interaction": {
      "user_query": "I can't open my budget.xlsx. It says 'General Error' and there's a weird .~lock.budget.xlsx# file in my folder.",
      "ai_response": "The `.~lock.budget.xlsx#` file indicates LibreOffice thinks the file is still open, likely from a previous crash.\n\nTo fix:\n1. Press `Ctrl+H` in your file manager to show hidden files\n2. Delete the `.~lock.budget.xlsx#` file\n3. Try opening your document again\n\nThis is a safety mechanism to prevent data corruption but can persist after crashes."
    },
    "technical_tags": ["file-locking", "libreoffice-calc", "crash-recovery"],
    "friction_type": "user_error"
  }
]
```

**Generate exactly 500 unique, high-quality questions. Return ONLY the JSON
array, no additional text.**
