#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-env node */
/* global fetch */
/* global console, process, setTimeout */

/**
 * Question Generator for Evolution Lab
 * Generates 10,000 synthetic Linux user questions across 10 buckets
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Bucket definitions from the spec
const BUCKETS = [
  {
    code: 'PROD_DOC',
    name: 'Productivity & Documents',
    persona: 'Everyday Consumer',
    description:
      'Working with documents, spreadsheets, presentations. Converting formats, editing PDFs, organizing work files.',
    subcategories: [
      'LibreOffice',
      'PDF Editing',
      'PDF Viewing',
      'Document Conversion',
      'Font Issues',
    ],
  },
  {
    code: 'COMM_EMAIL',
    name: 'Communication & Email',
    persona: 'Everyday Consumer',
    description:
      'Sending emails, checking messages, managing contacts, calendar invites, video calls.',
    subcategories: [
      'Thunderbird',
      'OAuth2',
      'Video Conferencing',
      'Screen Sharing',
      'Wayland Issues',
    ],
  },
  {
    code: 'ENT_MEDIA',
    name: 'Entertainment & Media',
    persona: 'Everyday Consumer',
    description:
      'Music, videos, streaming, games, podcasts, photo editing, social media.',
    subcategories: [
      'Spotify',
      'DRM/Codecs',
      'Video Editing',
      'Hardware Acceleration',
      'Streaming',
    ],
  },
  {
    code: 'LIFE_MGT',
    name: 'Life Management',
    persona: 'Everyday Consumer',
    description:
      'Reminders, to-do lists, weather, travel planning, recipes, health tracking, budgeting.',
    subcategories: [
      'Calendar Sync',
      'Financial Tools',
      'Weather Apps',
      'Task Management',
      'Cloud Sync',
    ],
  },
  {
    code: 'WEB_RES',
    name: 'Web & Research',
    persona: 'Everyday Consumer',
    description:
      'Shopping, booking, comparing prices, finding information, reading news, learning.',
    subcategories: [
      'Browser Issues',
      'Hardware Acceleration',
      'Extensions',
      'Performance',
      'Privacy',
    ],
  },
  {
    code: 'FILE_ORG',
    name: 'File Organization',
    persona: 'Everyday Consumer',
    description:
      'Organizing folders, finding files, backups, cloud sync, storage management, duplicates.',
    subcategories: [
      'Permissions',
      'External Drives',
      'Backups',
      'Deduplication',
      'Cloud Sync',
    ],
  },
  {
    code: 'APP_ISSUES',
    name: 'Application Issues',
    persona: 'Everyday Consumer',
    description:
      'Apps not opening, crashes, updates, compatibility issues, performance problems.',
    subcategories: [
      'Snap/Flatpak',
      'AppImage',
      'Sandboxing',
      'Dependencies',
      'Crashes',
    ],
  },
  {
    code: 'SYS_TROUBLE',
    name: 'System Troubleshooting',
    persona: 'Power User',
    description:
      'Performance tuning, disk space, memory issues, boot problems, package management, drivers.',
    subcategories: [
      'Kernel Panic',
      'OOM Killer',
      'Boot Performance',
      'Drivers',
      'System Logs',
    ],
  },
  {
    code: 'AUTO_SCRIPT',
    name: 'Automation & Scripting',
    persona: 'Power User',
    description:
      'Cron jobs, bash scripts, file watchers, batch operations, workflow automation.',
    subcategories: [
      'Cron',
      'Systemd Timers',
      'Environment Variables',
      'Bash Scripting',
      'Automation',
    ],
  },
  {
    code: 'DEV_DEVOPS',
    name: 'Development & DevOps',
    persona: 'Power User',
    description:
      'Databases, containers, version control, deployment, debugging, environment setup.',
    subcategories: ['Docker', 'Git', 'Databases', 'SSH', 'Development Tools'],
  },
];

const DISTROS = [
  'Ubuntu 22.04',
  'Ubuntu 24.04',
  'Fedora 40',
  'Arch Linux',
  'Debian 12',
  'Linux Mint 21',
];
const FRICTION_TYPES = [
  'protocol_mismatch',
  'wayland_conflict',
  'sandboxing',
  'legacy_dependency',
  'user_error',
  'config_issue',
];
const COMPLEXITY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

/**
 * Generate prompt for LLM to create questions for a specific bucket
 */
function generatePrompt(bucket, batchNumber, totalBatches) {
  const specPath = join(
    __dirname,
    '../../../Generating Linux User Questions Dataset.md',
  );
  const spec = readFileSync(specPath, 'utf-8');

  // Extract the relevant bucket section from the spec
  const bucketSection = extractBucketSection(spec, bucket.name);

  return `You are an expert in Linux user experience research. Generate 100 realistic user questions for the "${bucket.name}" category.

**Context from Research Specification:**
${bucketSection}

**Bucket Details:**
- Name: ${bucket.name}
- Persona: ${bucket.persona}
- Description: ${bucket.description}
- Subcategories: ${bucket.subcategories.join(', ')}

**Batch ${batchNumber} of ${totalBatches}** - Focus on: ${getBatchFocus(batchNumber)}

**Requirements:**
1. Questions must sound like real forum posts (casual, sometimes frustrated, occasionally vague)
2. Use combinatorial expansion: vary distro (${DISTROS.join(', ')}), hardware (NVIDIA/AMD/Intel), packaging (Snap/Flatpak/native/AppImage)
3. Answers must be specific with exact commands, file paths, config options
4. Rank by frequency: most common issues first
5. Include friction types: ${FRICTION_TYPES.join(', ')}
6. Mix complexity levels: ${COMPLEXITY_LEVELS.join(', ')}

**Output Format (JSON array of exactly 100 entries):**
[
  {
    "id": "${bucket.code}_${String(batchNumber * 100 + 1).padStart(3, '0')}",
    "bucket": "${bucket.name}",
    "sub_category": "string",
    "complexity": "Beginner|Intermediate|Advanced",
    "user_persona": "${bucket.persona}",
    "system_context": {
      "distro": "string",
      "app_version": "string"
    },
    "interaction": {
      "user_query": "realistic question with casual tone",
      "ai_response": "detailed answer with specific commands and explanations"
    },
    "technical_tags": ["tag1", "tag2", "tag3"],
    "friction_type": "one of: ${FRICTION_TYPES.join(', ')}"
  }
]

Generate exactly 100 unique, high-quality questions. Return ONLY the JSON array, no additional text.`;
}

/**
 * Extract the relevant section for a bucket from the spec document
 */
function extractBucketSection(spec, bucketName) {
  const lines = spec.split('\n');
  let inSection = false;
  let section = [];
  let sectionDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if we're entering the bucket section
    if (
      line.includes(`Bucket`) &&
      line.includes(bucketName.split('&')[0].trim())
    ) {
      inSection = true;
      sectionDepth = (line.match(/^#+/) || [''])[0].length;
    }

    if (inSection) {
      // Check if we've hit the next major section
      const currentDepth = (line.match(/^#+/) || [''])[0].length;
      if (
        currentDepth > 0 &&
        currentDepth <= sectionDepth &&
        i > 0 &&
        !line.includes(bucketName.split('&')[0].trim())
      ) {
        break;
      }
      section.push(line);
    }
  }

  return section.slice(0, 150).join('\n'); // Limit to ~150 lines to avoid token overflow
}

/**
 * Get focus area for each batch to ensure diversity
 */
function getBatchFocus(batchNumber) {
  const focuses = [
    'Most common/general issues',
    'Frustration-driven troubleshooting ("why won\'t...", "X stopped working")',
    'How-to tutorials and guides',
    'Comparisons and recommendations ("best app for...", "should I use X or Y")',
    'Automation and efficiency',
    'Privacy and security concerns',
    'Multi-device and sync scenarios',
    'Work/professional context',
    'Personal/home context',
    'Edge cases and niche scenarios',
  ];
  return focuses[(batchNumber - 1) % focuses.length];
}

/**
 * Call Gemini API to generate questions
 */
async function generateQuestionsWithGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY or GOOGLE_API_KEY environment variable not set',
    );
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;

  // Extract JSON from markdown code blocks if present
  const jsonMatch =
    text.match(/```json\n([\s\S]*?)\n```/) ||
    text.match(/```\n([\s\S]*?)\n```/);
  const jsonText = jsonMatch ? jsonMatch[1] : text;

  return JSON.parse(jsonText);
}

/**
 * Main generation function
 */
async function generateAllQuestions() {
  console.log('🚀 Starting generation of 10,000 Linux user questions...\n');

  for (const bucket of BUCKETS) {
    console.log(`\n📦 Generating questions for: ${bucket.name}`);
    console.log(`   Persona: ${bucket.persona}`);
    console.log(`   Target: 1000 questions (10 batches of 100)\n`);

    const allQuestions = [];

    for (let batch = 1; batch <= 10; batch++) {
      try {
        console.log(`   Batch ${batch}/10 - ${getBatchFocus(batch)}...`);

        const prompt = generatePrompt(bucket, batch, 10);
        const questions = await generateQuestionsWithGemini(prompt);

        if (!Array.isArray(questions) || questions.length !== 100) {
          console.error(
            `   ⚠️  Warning: Expected 100 questions, got ${questions?.length || 0}`,
          );
        }

        allQuestions.push(...questions);
        console.log(
          `   ✓ Generated ${questions.length} questions (Total: ${allQuestions.length})`,
        );

        // Rate limiting: wait 2 seconds between batches
        if (batch < 10) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`   ✗ Error in batch ${batch}:`, error.message);
        console.log(`   Retrying batch ${batch}...`);

        // Retry once
        try {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          const prompt = generatePrompt(bucket, batch, 10);
          const questions = await generateQuestionsWithGemini(prompt);
          allQuestions.push(...questions);
          console.log(`   ✓ Retry successful: ${questions.length} questions`);
        } catch (retryError) {
          console.error(`   ✗ Retry failed:`, retryError.message);
          console.log(`   Skipping batch ${batch}`);
        }
      }
    }

    // Save bucket questions to file
    const filename = `${String(BUCKETS.indexOf(bucket) + 1).padStart(2, '0')}_${bucket.code.toLowerCase()}.json`;
    const filepath = join(__dirname, '../data/questions', filename);

    writeFileSync(filepath, JSON.stringify(allQuestions, null, 2));
    console.log(
      `\n   💾 Saved ${allQuestions.length} questions to: ${filename}`,
    );
    console.log(`   ` + '='.repeat(60));
  }

  console.log('\n\n✅ Generation complete!');
  console.log(`📊 Total questions generated: ${BUCKETS.length * 1000}`);
  console.log(`📁 Output directory: packages/evolution-lab/data/questions/`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAllQuestions().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { generateAllQuestions, BUCKETS };
