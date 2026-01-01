#!/usr/bin/env python3
"""
Merge popularity scores with complexity scores and create comprehensive CSV
"""
import json
import csv
import re
from pathlib import Path

# Parse popularity.md (format: ID,Popularity ID,Popularity ...)
popularity_map = {}
with open('popularity.md', 'r') as f:
    content = f.read().replace('\n', ' ')
    # Split by spaces and process pairs
    pairs = content.strip().split()
    for pair in pairs:
        if ',' in pair:
            parts = pair.split(',')
            if len(parts) == 2:
                id_val, pop = parts
                # Skip header
                if id_val.strip() == 'ID' or pop.strip() == 'Popularity':
                    continue
                try:
                    popularity_map[id_val.strip()] = int(pop.strip())
                except ValueError:
                    continue  # Skip invalid entries

print(f"Loaded {len(popularity_map)} popularity scores")

# Extract complexity from JSON files
complexity_map = {}
bucket_map = {}
question_map = {}

json_files = sorted(Path('.').glob('*.json'))
for json_file in json_files:
    if json_file.name in ['index.json', 'popularity.json']:
        continue
    
    try:
        with open(json_file, 'r') as f:
            data = json.load(f)
            for entry in data:
                id_val = entry.get('id')
                complexity_map[id_val] = entry.get('complexity', 0)
                bucket_map[id_val] = entry.get('bucket', 'Unknown')
                question_map[id_val] = entry.get('interaction', {}).get('user_query', '')[:100]
    except Exception as e:
        print(f"Error processing {json_file}: {e}")

print(f"Loaded {len(complexity_map)} entries from JSON files")

# Create comprehensive CSV
output_rows = []
for id_val in sorted(complexity_map.keys()):
    popularity = popularity_map.get(id_val, 0)
    complexity = complexity_map.get(id_val, 0)
    bucket = bucket_map.get(id_val, 'Unknown')
    question = question_map.get(id_val, '')
    
    output_rows.append({
        'ID': id_val,
        'Bucket': bucket,
        'Question': question,
        'Complexity': complexity,
        'Popularity': popularity
    })

# Write CSV
with open('comprehensive_scores.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['ID', 'Bucket', 'Question', 'Complexity', 'Popularity'])
    writer.writeheader()
    writer.writerows(output_rows)

print(f"✅ Created comprehensive_scores.csv with {len(output_rows)} entries")

# Print distribution stats
print("\n📊 Distribution:")
print(f"Popularity 4: {sum(1 for r in output_rows if r['Popularity'] == 4)} entries")
print(f"Popularity 3: {sum(1 for r in output_rows if r['Popularity'] == 3)} entries")
print(f"Popularity 2: {sum(1 for r in output_rows if r['Popularity'] == 2)} entries")
print(f"Popularity 1: {sum(1 for r in output_rows if r['Popularity'] == 1)} entries")
