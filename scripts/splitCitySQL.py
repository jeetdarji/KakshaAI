"""Split the city UPDATE into small batches that won't timeout in Supabase SQL Editor."""
import re

with open('../database/update_city_column.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract all (code, city) pairs from VALUES
pairs = re.findall(r'\((\d+), \'([^\']+)\'\)', content)
print(f'Found {len(pairs)} college mappings')

BATCH_SIZE = 30
out = []
out.append('-- Add city column to cutoffs table')
out.append('-- Run each batch separately in Supabase SQL Editor if needed')
out.append('')
out.append('ALTER TABLE cutoffs ADD COLUMN IF NOT EXISTS city TEXT;')
out.append('')

batch_num = 0
for i in range(0, len(pairs), BATCH_SIZE):
    batch = pairs[i:i + BATCH_SIZE]
    batch_num += 1
    out.append(f'-- Batch {batch_num}')
    out.append('UPDATE cutoffs c SET city = m.city FROM (VALUES')
    vals = []
    for code, city in batch:
        escaped = city.replace("'", "''")
        vals.append(f"  ({code}, '{escaped}')")
    out.append(',\n'.join(vals))
    out.append(') AS m(college_code, city) WHERE c.college_code = m.college_code;')
    out.append('')

out.append('CREATE INDEX IF NOT EXISTS idx_cutoffs_city ON cutoffs (city);')

with open('../database/update_city_column.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))

print(f'Split into {batch_num} batches of ~{BATCH_SIZE} colleges each')
