#!/usr/bin/env python3
"""
Create stratified sample prioritizing popularity 4, ensuring representation
across all complexity levels (1-5) and buckets.
"""
import csv
import json
from pathlib import Path
from collections import defaultdict

# Load comprehensive scores
with open('comprehensive_scores.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    all_entries = list(reader)

print(f"Total entries: {len(all_entries)}")

# Map complexity levels
complexity_map = {
    'Beginner': 1,
    'Intermediate': 2,
    'Advanced': 3,
    'Expert': 4,
    '': 0
}

# Group by bucket and complexity
by_bucket_complexity = defaultdict(lambda: defaultdict(list))
for entry in all_entries:
    bucket = entry['Bucket']
    complexity_text = entry['Complexity']
    # Try to convert to int, or use mapping
    try:
        complexity = int(complexity_text)
    except ValueError:
        complexity = complexity_map.get(complexity_text, 0)
    
    popularity = int(entry['Popularity'])
    by_bucket_complexity[bucket][complexity].append({
        'id': entry['ID'],
        'question': entry['Question'],
        'complexity': complexity,
        'popularity': popularity,
        'bucket': bucket
    })

# Sort each group by popularity (4 first, then 3, 2, 1)
for bucket in by_bucket_complexity:
    for complexity in by_bucket_complexity[bucket]:
        by_bucket_complexity[bucket][complexity].sort(
            key=lambda x: -x['popularity']
        )

# Sample strategy: Take top N from each (bucket, complexity) bucket
# Prioritize popularity 4, then 3, then 2, then 1
SAMPLES_PER_BUCKET_COMPLEXITY = 3  # Adjust this to control total size

selected = []
for bucket in sorted(by_bucket_complexity.keys()):
    for complexity in sorted(by_bucket_complexity[bucket].keys()):
        entries = by_bucket_complexity[bucket][complexity]
        # Take top N (automatically prioritizes high popularity due to sorting)
        sample = entries[:SAMPLES_PER_BUCKET_COMPLEXITY]
        selected.extend(sample)
        print(f"{bucket} / Complexity {complexity}: {len(entries)} available, sampled {len(sample)}")

print(f"\n✅ Total sampled: {len(selected)} questions")

# Distribution by popularity
pop_dist = defaultdict(int)
for entry in selected:
    pop_dist[entry['popularity']] += 1

print("\n📊 Popularity distribution in sample:")
for pop in sorted(pop_dist.keys(), reverse=True):
    print(f"  Popularity {pop}: {pop_dist[pop]} entries")

# Create test_core.json with full friction point data
output_data = []
json_files = sorted(Path('.').glob('*.json'))

# Load all JSONs to find matching entries
id_to_full_data = {}
for json_file in json_files:
    if json_file.name in ['index.json', 'popularity.json']:
        continue
    try:
        with open(json_file, 'r') as f:
            data = json.load(f)
            for entry in data:
                id_to_full_data[entry['id']] = entry
    except:
        pass

# Build output with full data
for entry in selected:
    full_data = id_to_full_data.get(entry['id'])
    if full_data:
        output_data.append(full_data)

# Write test core JSON
with open('test_core.json', 'w', encoding='utf-8') as f:
    json.dump(output_data, f, indent=2, ensure_ascii=False)

print(f"\n✅ Created test_core.json with {len(output_data)} friction points")

# Also create a CSV summary for easy review
with open('test_core_summary.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['ID', 'Bucket', 'Complexity', 'Popularity', 'Question'])
    writer.writeheader()
    for entry in selected:
        writer.writerow({
            'ID': entry['id'],
            'Bucket': entry['bucket'],
            'Complexity': entry['complexity'],
            'Popularity': entry['popularity'],
            'Question': entry['question']
        })

print(f"✅ Created test_core_summary.csv for review")
