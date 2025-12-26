# Prompt 01B: Productivity & Documents (Questions 501-1000)

Generate **500 realistic Linux user questions** for the **Productivity &
Documents** category.

## Bucket Details

- **Name:** Productivity & Documents
- **Persona:** Everyday Consumer
- **Focus Areas:** LibreOffice, PDF editing/viewing, document conversion, font
  issues, file locking
- **ID Range:** PROD_DOC_501 to PROD_DOC_1000

## Batch Coverage (5 batches × 100 questions each)

This prompt covers these focus areas: 6. **Questions 501-600:** Privacy and
security concerns 7. **Questions 601-700:** Multi-device and sync scenarios 8.
**Questions 701-800:** Work/professional context 9. **Questions 801-900:**
Personal/home context 10. **Questions 901-1000:** Edge cases and niche scenarios

## Real-World Context Examples

- Macro conversion from VBA to LibreOffice Basic
- Conditional formatting in Calc
- PDF comment threading compatibility
- Document encryption and password protection
- Cross-platform file sharing issues
- Template management
- Mail merge complications

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

````json
[
  {
    "id": "PROD_DOC_501",
    "bucket": "Productivity & Documents",
    "sub_category": "PDF Editing",
    "complexity": "Intermediate",
    "user_persona": "Everyday Consumer",
    "system_context": {
      "distro": "Fedora 40",
      "app_version": "Okular 24.02"
    },
    "interaction": {
      "user_query": "How do I digitally sign a PDF for a legal contract? Just drawing my signature doesn't seem official enough.",
      "ai_response": "Digital signatures use cryptography, different from drawn signatures.\n\n**Using Okular:**\n1. Install: `sudo dnf install okular`\n2. Create a certificate:\n```bash\nopenssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365\n```\n3. In Okular: Tools → Sign Document → Configure Signatures\n4. Import your certificate\n5. Click where you want to sign\n\n**Note:** Check if the recipient accepts self-signed certificates or requires a CA-issued one."
    },
    "technical_tags": ["digital-signature", "pdf-security", "certificates"],
    "friction_type": "config_issue"
  }
]
````

**Generate exactly 500 unique, high-quality questions. Return ONLY the JSON
array, no additional text.**
