# Question Generation Checklist

## Instructions

1. Open each prompt file below
2. Copy the entire content
3. Paste into Gemini (gemini.google.com)
4. Wait for the 500-question JSON response
5. Copy the JSON output
6. Save to the corresponding output file
7. Check the box when complete

## Progress Tracker

### Bucket 1: Productivity & Documents

- [ ] **01A** (Questions 1-500)
  - Prompt: `prompts/01A_productivity_documents_001-500.md`
  - Output: `data/questions/01A_productivity_documents.json`
- [ ] **01B** (Questions 501-1000)
  - Prompt: `prompts/01B_productivity_documents_501-1000.md`
  - Output: `data/questions/01B_productivity_documents.json`

### Bucket 2: Communication & Email

- [ ] **02A** (Questions 1-500)
  - Prompt: `prompts/02A_communication_email_001-500.md`
  - Output: `data/questions/02A_communication_email.json`
- [ ] **02B** (Questions 501-1000)
  - Prompt: `prompts/02B_communication_email_501-1000.md`
  - Output: `data/questions/02B_communication_email.json`

### Bucket 3: Entertainment & Media

- [ ] **03A** (Questions 1-500)
  - Prompt: `prompts/03A_entertainment_media_001-500.md`
  - Output: `data/questions/03A_entertainment_media.json`
- [ ] **03B** (Questions 501-1000)
  - Prompt: `prompts/03B_entertainment_media_501-1000.md`
  - Output: `data/questions/03B_entertainment_media.json`

### Bucket 4: Life Management

- [ ] **04A** (Questions 1-500)
  - Prompt: `prompts/04A_life_management_001-500.md`
  - Output: `data/questions/04A_life_management.json`
- [ ] **04B** (Questions 501-1000)
  - Prompt: `prompts/04B_life_management_501-1000.md`
  - Output: `data/questions/04B_life_management.json`

### Bucket 5: Web & Research

- [ ] **05A** (Questions 1-500)
  - Prompt: `prompts/05A_web_research_001-500.md`
  - Output: `data/questions/05A_web_research.json`
- [ ] **05B** (Questions 501-1000)
  - Prompt: `prompts/05B_web_research_501-1000.md`
  - Output: `data/questions/05B_web_research.json`

### Bucket 6: File Organization

- [ ] **06A** (Questions 1-500)
  - Prompt: `prompts/06A_file_organization_001-500.md`
  - Output: `data/questions/06A_file_organization.json`
- [ ] **06B** (Questions 501-1000)
  - Prompt: `prompts/06B_file_organization_501-1000.md`
  - Output: `data/questions/06B_file_organization.json`

### Bucket 7: Application Issues

- [ ] **07A** (Questions 1-500)
  - Prompt: `prompts/07A_application_issues_001-500.md`
  - Output: `data/questions/07A_application_issues.json`
- [ ] **07B** (Questions 501-1000)
  - Prompt: `prompts/07B_application_issues_501-1000.md`
  - Output: `data/questions/07B_application_issues.json`

### Bucket 8: System Troubleshooting

- [ ] **08A** (Questions 1-500)
  - Prompt: `prompts/08A_system_troubleshooting_001-500.md`
  - Output: `data/questions/08A_system_troubleshooting.json`
- [ ] **08B** (Questions 501-1000)
  - Prompt: `prompts/08B_system_troubleshooting_501-1000.md`
  - Output: `data/questions/08B_system_troubleshooting.json`

### Bucket 9: Automation & Scripting

- [ ] **09A** (Questions 1-500)
  - Prompt: `prompts/09A_automation_scripting_001-500.md`
  - Output: `data/questions/09A_automation_scripting.json`
- [ ] **09B** (Questions 501-1000)
  - Prompt: `prompts/09B_automation_scripting_501-1000.md`
  - Output: `data/questions/09B_automation_scripting.json`

### Bucket 10: Development & DevOps

- [ ] **10A** (Questions 1-500)
  - Prompt: `prompts/10A_development_devops_001-500.md`
  - Output: `data/questions/10A_development_devops.json`
- [ ] **10B** (Questions 501-1000)
  - Prompt: `prompts/10B_development_devops_501-1000.md`
  - Output: `data/questions/10B_development_devops.json`

---

## Verification

After completing all 20 files, verify the counts:

```bash
cd packages/evolution-lab/data/questions
for file in *.json; do
  count=$(jq 'length' "$file" 2>/dev/null || echo "0")
  echo "$file: $count questions"
done
```

Expected: Each file should have exactly 500 questions.

## Merging (Optional)

If you want to merge A+B files into single bucket files:

```bash
cd packages/evolution-lab/data/questions

# Example for bucket 1:
jq -s 'add' 01A_productivity_documents.json 01B_productivity_documents.json > 01_productivity_documents.json

# Repeat for all 10 buckets...
```

---

**Total Progress: 0/20 files (0/10,000 questions)**
