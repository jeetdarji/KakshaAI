/**
 * Populate the city column for all colleges in the cutoffs table.
 * Run: node populateCity.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });
if (!process.env.VITE_SUPABASE_URL) {
    dotenv.config({ path: path.join(rootDir, '.env.local') });
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const CITY_MAP = {
    1002:'Amravati',1005:'Amravati',1012:'Yavatmal',1101:'Amravati',1105:'Amravati',
    1107:'Amravati',1114:'Amravati',1116:'Akola',1117:'Yavatmal',1119:'Amravati',
    1120:'Yavatmal',1121:'Amravati',1123:'Amravati',1125:'Buldhana',1126:'Amravati',
    1128:'Amravati',1265:'Amravati',1268:'Dhule',2008:'Aurangabad',2111:'Nashik',
    2131:'Osmanabad',2133:'Latur',2136:'Beed',2144:'Nanded',2146:'Osmanabad',
    2148:'Aurangabad',2219:'Aurangabad',2247:'Aurangabad',2248:'Latur',
    2250:'Aurangabad',2258:'Nanded',2260:'Nanded',2263:'Aurangabad',2264:'Jalna',
    2306:'Latur',2395:'Parbhani',2516:'Aurangabad',2528:'Beed',2530:'Aurangabad',
    2531:'Latur',2533:'Aurangabad',2534:'Nanded',2536:'Osmanabad',2538:'Beed',
    2540:'Osmanabad',2600:'Hingoli',2601:'Nanded',2603:'Aurangabad',2634:'Ahmednagar',
    2641:'Jalgaon',2666:'Solapur',2758:'Nanded',2770:'Beed',2771:'Beed',2772:'Pune',
    2777:'Latur',2779:'Osmanabad',3014:'Mumbai',3025:'Mumbai',3033:'Raigad',
    3147:'Raigad',3183:'Mumbai',3186:'Mumbai',3189:'Navi Mumbai',3190:'Mumbai',
    3193:'Mumbai',3194:'Palghar',3197:'Navi Mumbai',3198:'Raigad',3199:'Mumbai',
    3200:'Thane',3202:'Ratnagiri',3203:'Mumbai',3206:'Ratnagiri',3207:'Navi Mumbai',
    3210:'Mumbai',3212:'Thane',3215:'Mumbai',3218:'Palghar',3219:'Thane',3220:'Raigad',
    3222:'Palghar',3226:'Mumbai',3227:'Mumbai',3228:'Mumbai',3229:'Mumbai',
    3230:'Mumbai',3252:'Mumbai',3254:'Mumbai',3255:'Mumbai',3256:'Mumbai',
    3258:'Mumbai',3259:'Navi Mumbai',3261:'Mumbai',3264:'Mumbai',3265:'Mumbai',
    3266:'Mumbai',3267:'Mumbai',3269:'Mumbai',3270:'Mumbai',3271:'Mumbai',
    3273:'Mumbai',3274:'Mumbai',3277:'Amravati',3290:'Raigad',3291:'Thane',
    3334:'Thane',3348:'Raigad',3349:'Navi Mumbai',3351:'Thane',3371:'Raigad',
    3436:'Thane',3439:'Navi Mumbai',3441:'Thane',3445:'Ahmednagar',3470:'Ratnagiri',
    3475:'Thane',3520:'Raigad',3546:'Wardha',3609:'Mumbai',3723:'Navi Mumbai',
    3724:'Thane',3726:'Navi Mumbai',3790:'Raigad',4104:'Nagpur',4116:'Nagpur',
    4117:'Nagpur',4118:'Nagpur',4119:'Nagpur',4125:'Nagpur',4127:'Nagpur',
    4128:'Nagpur',4130:'Nagpur',4131:'Nagpur',4132:'Nagpur',4135:'Nagpur',
    4136:'Nagpur',4137:'Nagpur',4138:'Nagpur',4140:'Nagpur',4155:'Nagpur',
    4157:'Nagpur',4160:'Nagpur',4162:'Nagpur',4165:'Nagpur',4168:'Nagpur',
    4172:'Nagpur',4174:'Nagpur',4178:'Nagpur',4188:'Chandrapur',4190:'Nagpur',
    4191:'Chandrapur',4192:'Chandrapur',4194:'Nagpur',4197:'Nagpur',4649:'Wardha',
    4650:'Chandrapur',4651:'Wardha',4652:'Washim',4679:'Bhandara',4680:'Gondia',
    4681:'Gondia',5100:'Nashik',5101:'Nashik',5103:'Nashik',5104:'Nashik',
    5105:'Nashik',5106:'Nashik',5107:'Nashik',5109:'Nashik',5111:'Nashik',
    5115:'Nashik',5116:'Nashik',5117:'Nashik',5118:'Jalgaon',5120:'Jalgaon',
    5124:'Dhule',5125:'Dhule',5127:'Dhule',5160:'Jalgaon',5162:'Nashik',
    5164:'Nashik',5166:'Jalgaon',5168:'Jalgaon',5170:'Jalgaon',5172:'Jalgaon',
    5174:'Nashik',5176:'Dhule',5178:'Jalgaon',5180:'Nashik',5182:'Dhule',
    5184:'Nashik',5239:'Aurangabad',5380:'Ahmednagar',5381:'Dhule',5382:'Ahmednagar',
    5384:'Dhule',5385:'Jalgaon',5386:'Nashik',5387:'Nashik',5389:'Dhule',
    5391:'Ahmednagar',5392:'Ahmednagar',5393:'Nashik',5394:'Dhule',5395:'Ahmednagar',
    5497:'Nandurbar',5509:'Satara',5513:'Nandurbar',5597:'Ahmednagar',6004:'Pune',
    6100:'Pune',6101:'Pune',6104:'Pune',6107:'Pune',6108:'Pune',6109:'Pune',
    6110:'Pune',6111:'Pune',6112:'Pune',6113:'Pune',6115:'Pune',6116:'Pune',
    6117:'Pune',6118:'Pune',6120:'Pune',6121:'Pune',6122:'Pune',6124:'Pune',
    6125:'Pune',6127:'Pune',6128:'Pune',6130:'Pune',6131:'Pune',6134:'Sangli',
    6136:'Solapur',6137:'Solapur',6140:'Satara',6141:'Kolhapur',6142:'Solapur',
    6176:'Pune',6178:'Pune',6180:'Pune',6181:'Pune',6182:'Pune',6183:'Pune',
    6184:'Pune',6185:'Pune',6186:'Pune',6189:'Sangli',6190:'Satara',6192:'Solapur',
    6195:'Kolhapur',6196:'Kolhapur',6197:'Kolhapur',6198:'Satara',6199:'Solapur',
    6200:'Kolhapur',6202:'Satara',6204:'Kolhapur',6206:'Solapur',6208:'Kolhapur',
    6210:'Solapur',6212:'Solapur',6214:'Kolhapur',6215:'Solapur',6217:'Kolhapur',
    6240:'Solapur',6241:'Pune',6242:'Solapur',6244:'Kolhapur',6246:'Sangli',
    6248:'Pune',6250:'Pune',6260:'Pune',6262:'Pune',6264:'Pune',6266:'Pune',
    6268:'Sangli',6270:'Satara',6272:'Pune',6273:'Pune',6274:'Pune',6276:'Pune',
    6277:'Kolhapur',6278:'Pune',6280:'Pune',6282:'Pune',6283:'Sangli',6285:'Pune',
    6286:'Ahmednagar',6287:'Pune',6288:'Kolhapur',6289:'Pune',6291:'Pune',
    6293:'Pune',6295:'Pune',6297:'Pune',6299:'Pune',6301:'Pune',6303:'Pune',
    6305:'Pune',6307:'Pune',6309:'Pune',6311:'Satara',6313:'Sangli',6315:'Pune',
    6317:'Pune',6319:'Pune',6320:'Pune',6322:'Pune',6324:'Pune',6325:'Pune',
    6326:'Satara',6327:'Pune',6329:'Pune',6331:'Pune',6333:'Pune',6335:'Pune',
    6337:'Pune',6339:'Pune',6341:'Pune',6343:'Pune',6344:'Satara',6345:'Pune',
    6347:'Kolhapur',6349:'Kolhapur',6351:'Pune',6353:'Sangli',6355:'Ahmednagar',
    6357:'Pune',6359:'Solapur',6361:'Pune',6363:'Pune',6365:'Pune',6367:'Pune',
    6369:'Kolhapur',6371:'Pune',6373:'Pune',6375:'Pune',6377:'Pune',6379:'Pune',
    6381:'Pune',6383:'Solapur',6385:'Pune',6387:'Solapur',6389:'Pune',6391:'Pune',
    6393:'Pune',6395:'Pune',6397:'Pune',6444:'Solapur',6609:'Pune',6625:'Pune',
    6632:'Pune',6635:'Pune',6714:'Kolhapur',6715:'Pune',6732:'Pune',6756:'Solapur',
    6781:'Solapur',6782:'Solapur',6794:'Pune',6795:'Pune',6796:'Pune',6803:'Kolhapur',
    6811:'Kolhapur',6815:'Pune',6834:'Pune',16006:'Pune',16121:'Ratnagiri',
    16351:'Pune',16352:'Pune',16354:'Solapur',16355:'Pune',16357:'Solapur',
    10001:'Sindhudurg',3205:'Ratnagiri',5388:'Buldhana',5390:'Ahmednagar',5396:'Ahmednagar',
    6133:'Sangli',6135:'Satara',6138:'Solapur',6139:'Satara',6143:'Kolhapur',
    6144:'Solapur',6177:'Pune',6179:'Pune',6188:'Sangli',6191:'Satara',6193:'Solapur',
    6194:'Kolhapur',6201:'Kolhapur',6203:'Satara',6205:'Solapur',6207:'Solapur',
    6209:'Kolhapur',6211:'Solapur',6213:'Kolhapur',6216:'Kolhapur',6239:'Solapur',
    6243:'Kolhapur',6245:'Sangli',6247:'Pune',6249:'Pune',6261:'Pune',6263:'Pune',
    6265:'Pune',6275:'Pune',6279:'Pune',6281:'Pune',6284:'Ahmednagar',6290:'Pune',
    6292:'Pune',6294:'Pune',6296:'Pune',6298:'Pune',6300:'Pune',6302:'Pune',
    6304:'Pune',6306:'Pune',6308:'Pune',6310:'Pune',6312:'Satara',6314:'Sangli',
    6316:'Pune',6318:'Pune',6321:'Pune',6323:'Pune',6328:'Pune',6330:'Pune',
    6332:'Pune',6334:'Pune',6336:'Pune',6338:'Pune',6340:'Pune',6342:'Pune',
    6346:'Pune',6348:'Kolhapur',6350:'Kolhapur',6352:'Pune',6354:'Sangli',
    6356:'Ahmednagar',6358:'Pune',6360:'Solapur',6362:'Pune',6364:'Pune',
    6366:'Pune',6368:'Pune',6370:'Kolhapur',6372:'Pune',6374:'Pune',6376:'Pune',
    6378:'Pune',6380:'Pune',6382:'Pune',6384:'Solapur',6386:'Pune',6388:'Solapur',
    6390:'Pune',6392:'Pune',6394:'Pune',6396:'Pune',
};

async function main() {
    console.log('🏙️  Populating city column...\n');

    // First, check if column exists by trying a query
    const { error: checkErr } = await supabase.from('cutoffs').select('city').limit(1);
    if (checkErr && checkErr.message.includes('city')) {
        console.log('Column "city" does not exist yet. Please run this SQL first:');
        console.log('  ALTER TABLE cutoffs ADD COLUMN IF NOT EXISTS city TEXT;');
        process.exit(1);
    }

    const entries = Object.entries(CITY_MAP);
    const BATCH_SIZE = 30;
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        const codes = batch.map(([code]) => parseInt(code));
        const cityForCode = Object.fromEntries(batch.map(([c, city]) => [parseInt(c), city]));

        // Update each code in the batch
        for (const [code, city] of batch) {
            const { error } = await supabase
                .from('cutoffs')
                .update({ city })
                .eq('college_code', parseInt(code));

            if (error) {
                console.error(`  ❌ Code ${code}: ${error.message}`);
                errors++;
            } else {
                updated++;
            }
        }

        const pct = Math.round(((i + batch.length) / entries.length) * 100);
        process.stdout.write(`\r  📦 Updated ${updated}/${entries.length} colleges (${pct}%)`);
    }

    console.log('\n');

    if (errors > 0) {
        console.log(`⚠️  ${errors} errors occurred`);
    }

    // Create index
    console.log('📇 Creating index on city column...');
    // Index must be created via SQL, not supabase-js
    console.log('   Run this in SQL Editor: CREATE INDEX IF NOT EXISTS idx_cutoffs_city ON cutoffs (city);');

    // Verify
    const { data, error: verifyErr } = await supabase
        .from('cutoffs')
        .select('city')
        .not('city', 'is', null)
        .limit(1);

    if (data && data.length > 0) {
        console.log(`\n✅ Done! City column populated. Sample: ${data[0].city}`);
    }

    // Count distinct cities
    const { data: cityCount } = await supabase
        .from('cutoffs')
        .select('city')
        .not('city', 'is', null);

    if (cityCount) {
        const unique = new Set(cityCount.map(r => r.city));
        console.log(`   ${unique.size} distinct cities found`);
    }
}

main().catch(console.error);
