# Prompt 04B: Life Management (Questions 501-1000)

Generate **500 realistic Linux user questions** for the **Life Management**
category.

## Bucket Details

- **Name:** Life Management
- **Persona:** Everyday Consumer
- **Focus Areas:** Calendar sync, financial tools, weather apps, task
  management, cloud sync
- **ID Range:** LIFE_MGT_501 to LIFE_MGT_1000

## Batch Coverage (5 batches × 100 questions each)

6. **Questions 501-600:** Privacy and security concerns
7. **Questions 601-700:** Multi-device and sync scenarios
8. **Questions 701-800:** Work/professional context
9. **Questions 801-900:** Personal/home context
10. **Questions 901-1000:** Edge cases and niche scenarios

## Real-World Context Examples

- Contact management and sync
- Reminder/notification setup
- Recipe management apps
- Fitness tracking integration
- Habit tracking
- Journal/diary apps
- Time tracking for work
- Expense tracking

## Requirements

1. **Sound like real forum posts** - frustrated about life management tools
2. **Vary context:**
   - Distros: Ubuntu 22.04, Ubuntu 24.04, Fedora 40, Arch Linux, Debian 12,
     Linux Mint 21
   - Apps: GNOME Calendar, Evolution, GnuCash, HomeBank, Nextcloud
3. **Specific answers** - exact commands, config paths, account setup steps
4. **Friction types:** protocol_mismatch, config_issue, user_error
5. **Complexity mix:** Beginner (60%), Intermediate (30%), Advanced (10%)

## Output Format (JSON array of exactly 500 entries)

````json
[
  {
    "id": "LIFE_MGT_501",
    "bucket": "Life Management",
    "sub_category": "Financial Tools",
    "complexity": "Intermediate",
    "user_persona": "Everyday Consumer",
    "system_context": {
      "distro": "Debian 12",
      "app_version": "GnuCash 5.4"
    },
    "interaction": {
      "user_query": "I'm trying to use GnuCash to track spending. I imported my bank statement but it's asking for a 'transfer account' for every transaction. I just want to categorize it as 'Groceries'!",
      "ai_response": "GnuCash uses double-entry accounting - money must move FROM one account TO another.\n\n**How it works:**\n- Money leaves your 'Assets:Checking Account'\n- Money enters 'Expenses:Groceries'\n\nSo 'Groceries' IS the transfer account. Set it up:\n1. Create expense categories: Expenses:Groceries, Expenses:Gas, etc.\n2. When importing, select the appropriate Expenses category as the transfer account\n\n**Simpler alternative:** If this is too complex, try **HomeBank** which uses single-entry accounting:\n```bash\nsudo apt install homebank\n```"
    },
    "technical_tags": ["gnucash", "double-entry-accounting", "budgeting"],
    "friction_type": "user_error"
  }
]
````

**Generate exactly 500 unique, high-quality questions. Return ONLY the JSON
array, no additional text.**
