"""Rewrite city SQL as a single efficient UPDATE using VALUES join."""
import re

with open('../database/update_city_column.sql', 'r', encoding='utf-8') as f:
    lines = f.readlines()

pairs = []
for line in lines:
    m = re.match(r"UPDATE cutoffs SET city = '(.+?)' WHERE college_code = (\d+);", line.strip())
    if m:
        city = m.group(1)
        code = m.group(2)
        pairs.append((code, city))

out = []
out.append('-- Add city column to cutoffs table')
out.append('-- Run this in Supabase SQL Editor after data import')
out.append('')
out.append('ALTER TABLE cutoffs ADD COLUMN IF NOT EXISTS city TEXT;')
out.append('')
out.append('-- Single efficient UPDATE using a VALUES join')
out.append('UPDATE cutoffs c')
out.append('SET city = m.city')
out.append('FROM (VALUES')

vals = []
for code, city in pairs:
    escaped = city.replace("'", "''")
    vals.append(f"  ({code}, '{escaped}')")

out.append(',\n'.join(vals))
out.append(') AS m(college_code, city)')
out.append('WHERE c.college_code = m.college_code;')
out.append('')
out.append('CREATE INDEX IF NOT EXISTS idx_cutoffs_city ON cutoffs (city);')

with open('../database/update_city_column.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))

print(f'Rewrote with {len(pairs)} mappings as a single UPDATE statement')
