# Question Generator

This script generates 10,000 synthetic Linux user questions across 10 buckets
for Evolution Lab testing.

## Prerequisites

- Node.js 18+ (for ES modules and fetch API)
- Gemini API key

## Setup

1. Set your API key:

```bash
export TERMINAI_API_KEY="your-api-key-here"
# OR
export GOOGLE_API_KEY="your-api-key-here"
```

2. Ensure the spec document exists:

```bash
ls ../../Generating\ Linux\ User\ Questions\ Dataset.md
```

## Usage

### Generate all 10,000 questions:

```bash
cd packages/evolution-lab
node src/generate-questions.js
```

This will:

- Generate 1000 questions per bucket (10 buckets total)
- Save each bucket to `data/questions/XX_bucket_name.json`
- Take approximately 30-40 minutes (with rate limiting)
- Use ~2-3 million tokens total

### Output Structure

```
packages/evolution-lab/data/questions/
├── 01_prod_doc.json (1000 questions)
├── 02_comm_email.json (1000 questions)
├── 03_ent_media.json (1000 questions)
├── 04_life_mgt.json (1000 questions)
├── 05_web_res.json (1000 questions)
├── 06_file_org.json (1000 questions)
├── 07_app_issues.json (1000 questions)
├── 08_sys_trouble.json (1000 questions)
├── 09_auto_script.json (1000 questions)
└── 10_dev_devops.json (1000 questions)
```

## Question Format

Each question follows this structure:

```json
{
  "id": "PROD_DOC_001",
  "bucket": "Productivity & Documents",
  "sub_category": "LibreOffice",
  "complexity": "Beginner",
  "user_persona": "Office Migrant",
  "system_context": {
    "distro": "Ubuntu 22.04",
    "app_version": "LibreOffice 7.3"
  },
  "interaction": {
    "user_query": "I can't open my budget.xlsx...",
    "ai_response": "The presence of the `.~lock.budget.xlsx#` file..."
  },
  "technical_tags": ["file-locking", "hidden-files"],
  "friction_type": "user_error"
}
```

## Batch Strategy

Each bucket generates 10 batches of 100 questions with different focuses:

1. Most common/general issues
2. Frustration-driven troubleshooting
3. How-to tutorials
4. Comparisons and recommendations
5. Automation and efficiency
6. Privacy and security
7. Multi-device sync
8. Work/professional context
9. Personal/home context
10. Edge cases and niche scenarios

## Error Handling

- Automatic retry on API failures (once per batch)
- 2-second delay between batches (rate limiting)
- 5-second delay before retries
- Continues to next batch if retry fails

## Cost Estimation

- ~100 tokens per question (input + output)
- 10,000 questions × 100 tokens = ~1M tokens
- Gemini 2.0 Flash: Free tier supports this
- Estimated time: 30-40 minutes
