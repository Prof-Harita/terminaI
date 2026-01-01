#!/usr/bin/env python3
"""
Extract all popularity=4 entries for testing
"""
import csv
import json
from pathlib import Path
from collections import defaultdict

# Load comprehensive scores and filter for popularity=4
with open('comprehensive_scores.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    pop4_entries = [row for row in reader if row['Popularity'] == '4']

print(f"Found {len(pop4_entries)} entries with popularity=4")

# Load all JSON files to get full friction point data
id_to_full_data = {}
json_files = sorted(Path('.').glob('*.json'))

for json_file in json_files:
    if json_file.name in ['index.json', 'popularity.json', 'test_core.json']:
        continue
    try:
        with open(json_file, 'r') as f:
            data = json.load(f)
            for entry in data:
                id_to_full_data[entry['id']] = entry
    except Exception as e:
        print(f"Error loading {json_file}: {e}")

# Build output with full data
output_data = []
for entry in pop4_entries:
    full_data = id_to_full_data.get(entry['ID'])
    if full_data:
        output_data.append(full_data)

# Write test dataset
with open('test_pop4_148.json', 'w', encoding='utf-8') as f:
    json.dump(output_data, f, indent=2, ensure_ascii=False)

print(f"\n✅ Created test_pop4_148.json with {len(output_data)} friction points")

# Distribution stats
complexity_dist = defaultdict(int)
bucket_dist = defaultdict(int)

for entry in pop4_entries:
    complexity_dist[entry['Complexity']] += 1
    bucket_dist[entry['Bucket']] += 1

print("\n📊 Distribution by Complexity:")
for comp in sorted(complexity_dist.keys()):
    print(f"  {comp}: {complexity_dist[comp]} entries")

print("\n📊 Distribution by Bucket:")
for bucket in sorted(bucket_dist.keys()):
    print(f"  {bucket}: {bucket_dist[bucket]} entries")

# Create summary CSV
with open('test_pop4_summary.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['ID', 'Bucket', 'Complexity', 'Question'])
    writer.writeheader()
    for entry in pop4_entries:
        writer.writerow({
            'ID': entry['ID'],
            'Bucket': entry['Bucket'],
            'Complexity': entry['Complexity'],
            'Question': entry['Question']
        })

print(f"\n✅ Created test_pop4_summary.csv for review")
