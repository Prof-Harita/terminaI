# Workflow: Generate 10,000 Questions with Gemini Online

## Overview

You'll run the prompt 100 times total (10 buckets × 10 batches each) to generate
all 10,000 questions.

## Step-by-Step Process

### 1. Open the Prompt File

```bash
cat packages/evolution-lab/PROMPT_FOR_GEMINI.md
```

### 2. For Each Bucket (10 total):

#### Bucket 1: Productivity & Documents

Run 10 times, changing batch focus each time:

**Run 1:**

- Bucket: Productivity & Documents
- Batch Focus: Most common/general issues
- ID Range: PROD_DOC_001 to PROD_DOC_100
- Save to: `data/questions/01_prod_doc_batch1.json`

**Run 2:**

- Bucket: Productivity & Documents
- Batch Focus: Frustration-driven troubleshooting
- ID Range: PROD_DOC_101 to PROD_DOC_200
- Save to: `data/questions/01_prod_doc_batch2.json`

...continue through batch 10...

**Run 10:**

- Bucket: Productivity & Documents
- Batch Focus: Edge cases and niche scenarios
- ID Range: PROD_DOC_901 to PROD_DOC_1000
- Save to: `data/questions/01_prod_doc_batch10.json`

#### Bucket 2: Communication & Email

Repeat the same process with:

- Bucket Code: COMM_EMAIL
- ID Range: COMM_EMAIL_001 to COMM_EMAIL_1000
- Save to: `data/questions/02_comm_email_batch1.json` through `batch10.json`

#### Bucket 3-10: Continue similarly...

### 3. Merge Batches Per Bucket

After generating all 10 batches for a bucket, merge them:

```bash
# Example for Bucket 1
cd packages/evolution-lab/data/questions
cat 01_prod_doc_batch*.json | jq -s 'add' > 01_prod_doc.json
```

### 4. Verification

Check question counts:

```bash
for file in data/questions/*_batch*.json; do
  count=$(jq 'length' "$file")
  echo "$file: $count questions"
done
```

Expected: Each batch file should have exactly 100 questions.

## Quick Reference Table

| Bucket                      | Code        | Batches | Total Questions | Final File          |
| --------------------------- | ----------- | ------- | --------------- | ------------------- |
| 1. Productivity & Documents | PROD_DOC    | 10      | 1000            | 01_prod_doc.json    |
| 2. Communication & Email    | COMM_EMAIL  | 10      | 1000            | 02_comm_email.json  |
| 3. Entertainment & Media    | ENT_MEDIA   | 10      | 1000            | 03_ent_media.json   |
| 4. Life Management          | LIFE_MGT    | 10      | 1000            | 04_life_mgt.json    |
| 5. Web & Research           | WEB_RES     | 10      | 1000            | 05_web_res.json     |
| 6. File Organization        | FILE_ORG    | 10      | 1000            | 06_file_org.json    |
| 7. Application Issues       | APP_ISSUES  | 10      | 1000            | 07_app_issues.json  |
| 8. System Troubleshooting   | SYS_TROUBLE | 10      | 1000            | 08_sys_trouble.json |
| 9. Automation & Scripting   | AUTO_SCRIPT | 10      | 1000            | 09_auto_script.json |
| 10. Development & DevOps    | DEV_DEVOPS  | 10      | 1000            | 10_dev_devops.json  |

## Tips

1. **Copy-paste carefully:** Make sure to update the bucket name and batch focus
   in the prompt each time
2. **Save immediately:** Copy Gemini's JSON output and save it right away
3. **Validate JSON:** Use `jq` to verify the JSON is valid: `jq . filename.json`
4. **Track progress:** Keep a checklist of completed batches
5. **Take breaks:** This will take 2-3 hours total with copy-paste time

## Automation Option

If you want to automate this with the API instead:

```bash
export TERMINAI_API_KEY="your-key"
node src/generate-questions.js
```

This will run all 100 batches automatically (~30-40 minutes).
