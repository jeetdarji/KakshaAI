"""Generate SQL to add city column and populate it for all colleges."""
import openpyxl
from collections import Counter

wb = openpyxl.load_workbook('../Cutoff_Csvs/2025_ENGG_CAP1_CutOff.csv.xlsx', read_only=True)
ws = wb.active
colleges = {}
for row in ws.iter_rows(min_row=2, values_only=True):
    if row[2] and row[3]:
        colleges[row[2]] = row[3]
wb.close()

city_map = {
    'Mumbai': ['Mumbai','Andheri','Byculla','Malad','Borivali','Matunga','Chembur','Bandra','Worli','Goregaon','Kandivali'],
    'Navi Mumbai': ['Navi Mumbai','Panvel','Vashi','Nerul','Kharghar','Airoli','Belapur'],
    'Pune': ['Pune','Pimpri','Chinchwad','Lavale','Lohegaon','Bibwewadi','Katraj','Hadapsar','Kothrud','Wagholi','Indapur','Narhe','Pisoli','Haveli','Talegaon','Lonavala','Avasari'],
    'Thane': ['Thane','Ulhasnagar','Ambernath','Badlapur','Dombivli','Kalyan','Murbad','Bhiwandi'],
    'Palghar': ['Palghar','Vasai','Virar','Vevoor','Boisar'],
    'Raigad': ['Raigad','Karjat','Khopoli','Pen','Roha','Alibaug','Lonere'],
    'Nagpur': ['Nagpur','Kamptee','Sevagram','Ramtek'],
    'Nashik': ['Nashik','Sangamner','Sinnar','Igatpuri','Malegaon','Ozar'],
    'Aurangabad': ['Aurangabad','Sambhajinagar','Chhatrapati Sambhajinagar'],
    'Kolhapur': ['Kolhapur','Ichalkaranji','Shirol','Jaysingpur','Gadhinglaj','Warananagar'],
    'Solapur': ['Solapur','Barshi','Pandharpur','Akluj','Sangola'],
    'Sangli': ['Sangli','Ashta','Miraj','Walchandnagar'],
    'Satara': ['Satara','Karad','Wai','Phaltan'],
    'Ahmednagar': ['Ahmednagar','Shevgaon','Kopargaon','Rahuri'],
    'Amravati': ['Amravati','Achalpur','Badnera','Akot','Shegaon'],
    'Jalgaon': ['Jalgaon','Bhusawal','Amalner','Chopda','Faizpur'],
    'Dhule': ['Dhule','Shirpur','Shahada','Dondaicha'],
    'Nanded': ['Nanded','Deglur'],
    'Latur': ['Latur','Udgir','Ausa','Nilanga','Ambejogai'],
    'Beed': ['Beed','Georai','Kada','Ashti'],
    'Osmanabad': ['Osmanabad','Tuljapur','Dharashiv'],
    'Wardha': ['Wardha'],
    'Chandrapur': ['Chandrapur','Ballarpur'],
    'Yavatmal': ['Yavatmal','Pusad'],
    'Akola': ['Akola'],
    'Buldhana': ['Buldhana','Chikhli'],
    'Parbhani': ['Parbhani'],
    'Washim': ['Washim'],
    'Jalna': ['Jalna'],
    'Ratnagiri': ['Ratnagiri','Chiplun','Kankavli','Deorukh'],
    'Sindhudurg': ['Sindhudurg','Kudal'],
    'Gondia': ['Gondia','Sakoli'],
    'Bhandara': ['Bhandara'],
    'Hingoli': ['Hingoli'],
    'Nandurbar': ['Nandurbar','Nadurbar'],
}

manual = {
    1119:'Amravati',1268:'Dhule',2111:'Nashik',2516:'Aurangabad',
    2634:'Ahmednagar',2641:'Jalgaon',2666:'Solapur',2758:'Nanded',
    2772:'Pune',2777:'Latur',2779:'Osmanabad',
    3025:'Mumbai',3219:'Thane',3220:'Raigad',3222:'Palghar',
    3277:'Amravati',3445:'Ahmednagar',3470:'Ratnagiri',
    3546:'Wardha',3723:'Navi Mumbai',3724:'Thane',3726:'Navi Mumbai',
    4188:'Chandrapur',4190:'Nagpur',4197:'Nagpur',
    5239:'Aurangabad',5381:'Dhule',5395:'Ahmednagar',
    5509:'Satara',5513:'Nandurbar',5597:'Ahmednagar',
    6182:'Pune',6183:'Pune',6184:'Pune',6185:'Pune',
    6217:'Kolhapur',6268:'Sangli',6274:'Pune',6277:'Kolhapur',
    6313:'Sangli',6315:'Pune',6320:'Pune',6322:'Pune',6324:'Pune',
    6326:'Satara',6444:'Solapur',6609:'Pune',6625:'Pune',
    6632:'Pune',6635:'Pune',6756:'Solapur',6782:'Solapur',
    6795:'Pune',6803:'Kolhapur',6811:'Kolhapur',6815:'Pune',
    6834:'Pune',16006:'Pune',16121:'Ratnagiri',16351:'Pune',
    16352:'Pune',16354:'Solapur',16355:'Pune',16357:'Solapur',
    4104:'Nagpur',4679:'Bhandara',5164:'Nashik',5168:'Jalgaon',
    5497:'Nandurbar',6004:'Pune',
}

code_to_city = {}
for code, name in colleges.items():
    nl = name.lower()
    found = None
    for district, keywords in city_map.items():
        for kw in keywords:
            if kw.lower() in nl:
                found = district
                break
        if found:
            break
    if not found:
        found = manual.get(code, 'Other')
    code_to_city[code] = found

lines = [
    '-- Auto-generated: Add city column to cutoffs table',
    '-- Run this in Supabase SQL Editor after data import',
    '',
    'ALTER TABLE cutoffs ADD COLUMN IF NOT EXISTS city TEXT;',
    '',
]

for code, city in sorted(code_to_city.items()):
    ce = city.replace("'", "''")
    lines.append(f"UPDATE cutoffs SET city = '{ce}' WHERE college_code = {code};")

lines.append('')
lines.append('CREATE INDEX IF NOT EXISTS idx_cutoffs_city ON cutoffs (city);')

out_path = '../database/update_city_column.sql'
with open(out_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

c = Counter(code_to_city.values())
print(f'File written: {out_path}')
print(f'Total colleges mapped: {len(code_to_city)}')
print(f'Unique cities: {len(c)}')
unm = sum(1 for v in code_to_city.values() if v == 'Other')
print(f'Unmatched (marked Other): {unm}')
print()
for city, cnt in c.most_common():
    print(f'  {city}: {cnt}')
