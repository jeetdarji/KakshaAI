import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabase';

// ============================================================================
// GEMINI CLIENT INITIALIZATION
// ============================================================================

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
let genAI = null;
let model = null;

// Primary model — gemini-2.5-flash is newer, faster, and has SEPARATE daily quota from 2.0 models.
// On free tier, quota is per-model, so having a different fallback model helps.
const PRIMARY_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-2.5-flash-lite'; // Lighter model with its own separate quota

function getModel() {
    if (!API_KEY || API_KEY === 'your_gemini_api_key_here') {
        return null;
    }
    if (!genAI) {
        genAI = new GoogleGenerativeAI(API_KEY);
    }
    if (!model) {
        model = genAI.getGenerativeModel({ model: PRIMARY_MODEL });
    }
    return model;
}

/** Switch to fallback model (only for 404/not-found errors, NOT for rate limits) */
function getFallbackModel() {
    if (!genAI) return null;
    model = genAI.getGenerativeModel({ model: FALLBACK_MODEL });
    return model;
}

// ============================================================================
// CLIENT-SIDE RATE LIMITER
// ============================================================================
// Gemini free tier: 15 RPM, 1500 RPD
// We enforce spacing to stay well within limits.

const rateLimiter = {
    timestamps: [],           // Track timestamps of recent API calls
    RPM_LIMIT: 10,            // Stay under 15 RPM with headroom
    MIN_INTERVAL_MS: 4500,    // Minimum 4.5s between requests (≈13 RPM max)
    dailyCount: 0,
    dailyReset: Date.now(),
    DAILY_LIMIT: 1200,        // Stay under 1500 RPD with headroom
    cooldownUntil: 0,         // Timestamp until which we're in cooldown (after a 429)

    /** Check if we can make a request right now */
    canRequest() {
        const now = Date.now();

        // If in cooldown from a 429 error, block
        if (now < this.cooldownUntil) {
            return { allowed: false, waitMs: this.cooldownUntil - now, reason: 'cooldown' };
        }

        // Reset daily counter at midnight
        if (now - this.dailyReset > 24 * 60 * 60 * 1000) {
            this.dailyCount = 0;
            this.dailyReset = now;
        }

        // Check daily limit
        if (this.dailyCount >= this.DAILY_LIMIT) {
            return { allowed: false, waitMs: 0, reason: 'daily_limit' };
        }

        // Clean timestamps older than 60 seconds
        this.timestamps = this.timestamps.filter(t => now - t < 60000);

        // Check RPM limit
        if (this.timestamps.length >= this.RPM_LIMIT) {
            const oldest = this.timestamps[0];
            const waitMs = 60000 - (now - oldest) + 500; // Wait until oldest falls out + buffer
            return { allowed: false, waitMs, reason: 'rpm_limit' };
        }

        // Check minimum interval between requests
        if (this.timestamps.length > 0) {
            const last = this.timestamps[this.timestamps.length - 1];
            const elapsed = now - last;
            if (elapsed < this.MIN_INTERVAL_MS) {
                return { allowed: false, waitMs: this.MIN_INTERVAL_MS - elapsed, reason: 'min_interval' };
            }
        }

        return { allowed: true, waitMs: 0, reason: null };
    },

    /** Record that we made a successful API call */
    recordRequest() {
        this.timestamps.push(Date.now());
        this.dailyCount++;
    },

    /** Set a cooldown after receiving a 429 error */
    setCooldown(seconds) {
        this.cooldownUntil = Date.now() + (seconds * 1000);
    },

    /** Get remaining daily requests estimate */
    get remainingDaily() {
        return Math.max(0, this.DAILY_LIMIT - this.dailyCount);
    },
};

/**
 * Wait for rate limiter approval before making an API call.
 * Returns true if we can proceed, or delays and returns true.
 * Returns false only if daily limit is hit.
 */
async function waitForRateLimit() {
    const check = rateLimiter.canRequest();
    if (check.allowed) return true;

    if (check.reason === 'daily_limit') {
        console.warn('Daily API limit reached. Using fallback responses.');
        return false;
    }

    // Wait the required time
    await new Promise(r => setTimeout(r, check.waitMs));
    return true;
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SYSTEM_PROMPT = `You are KakshaAI Assistant — a brilliant, friendly, and knowledgeable AI assistant. You can answer ANY question on ANY topic, just like ChatGPT. You are NOT limited to any single subject or exam.

YOUR CORE CAPABILITIES:

1. GENERAL KNOWLEDGE & ANY TOPIC:
   - You can answer questions on ANY subject: Science, History, Geography, Literature, Technology, Current Affairs, Philosophy, Art, Music, Programming, etc.
   - When asked "What is X?" — give a complete, clear, and educational explanation
   - When asked for formulas — provide ALL relevant formulas with proper mathematical notation
   - When asked to solve — show step-by-step solution with reasoning
   - When asked to explain — break it down simply with examples and analogies
   - You are a STUDY PARTNER — explain topics deeply, give formulas, derivations, tricks
   - Include mnemonics, tricks, and shortcuts when possible

2. ACADEMIC SUBJECTS (Physics, Chemistry, Maths & more):
   - Physics: Mechanics, Thermodynamics, Electromagnetism, Optics, Modern Physics, Quantum, Relativity, Wave Motion, Gravitation
   - Chemistry: Physical Chemistry, Organic Chemistry, Inorganic Chemistry, Biochemistry
   - Mathematics: Calculus, Algebra, Trigonometry, Coordinate Geometry, Vectors, Probability, Statistics, Linear Algebra
   - Biology, Computer Science, Economics, or any other subject — just answer it

3. EXAM PREPARATION (MHT-CET, JEE, NEET, Boards, etc.):
   - Study planning and time management
   - Mock test strategies
   - Topic prioritization
   - Revision techniques (Feynman, Spaced Repetition, Active Recall)
   - Stress management and exam-day tips

4. MHT-CET COLLEGE ADMISSIONS (SPECIAL FEATURE):
   - You have access to real MHT-CET cutoff data (2023-2025)
   - 367 engineering colleges across Maharashtra
   - 103 branches (CS, IT, Mechanical, Civil, AI & DS, etc.)
   - 287,000+ cutoff records across all CAP rounds
   - All categories (OPEN, OBC, SC, ST, EWS, TFWS, etc.)

CRITICAL INSTRUCTION FOR CUTOFFS — DIRECT ANSWERS:
When a user asks a specific factual question about cutoffs, ANSWER DIRECTLY using the data provided.
- Default to 2025 if year not specified, GOPENS if category not specified
- Only ask clarifying questions if college name is ambiguous or branch is missing

YOUR PERSONALITY:
- Friendly and encouraging (like a helpful friend who knows everything)
- Patient and understanding
- Use simple language but be thorough
- Use emojis occasionally (but not excessive)
- Format responses with markdown for readability

RESPONSE RULES:
- ALWAYS answer the question directly — never say "I can only help with MHT-CET"
- If someone asks about thermodynamics → explain thermodynamics fully
- If someone asks for formulas → give ALL the formulas
- If someone asks a follow-up → maintain context from the conversation
- Explain concepts clearly with examples and analogies
- Break down complex topics into digestible steps
- Provide practice problems when relevant
- Include common mistakes to avoid

FORMATTING:
- Use **bold** for important terms and key concepts
- Use bullet points for lists
- Use numbered lists for steps
- Use > quotes for tips and important notes
- For mathematical formulas, use LaTeX notation:
  - Inline math: wrap in single dollar signs like $F = ma$
  - Display/block math: wrap in double dollar signs like $$F = G \frac{m_1 \cdot m_2}{r^2}$$
- Use LaTeX subscripts ($m_1$, $v_0$) and superscripts ($r^2$, $x^n$) for variables
- Use LaTeX fractions with \frac{}{} for division: $g = \frac{GM}{R^2}$
- NEVER use backtick code blocks for formulas — ALWAYS use $...$ or $$...$$
- NEVER put single variables like F, G, m in separate bullet points with code blocks
- Keep formulas inline with their explanation text when possible
- Keep paragraphs short (2-3 sentences max)

IMPORTANT: If you receive cutoff data from the database, use ONLY that data. Never make up cutoff numbers. If data is not available, say so honestly.

Category Code Reference:
G=General, L=Linguistic minority, DEF=Defence, PWD=Disability
OPENS=Open, OBCS=OBC, SCS=SC, STS=ST, VJS=VJ/NT, SEBCS=SEBC
S=State level, H=Home University, O=Other university
TFWS=Tuition Fee Waiver, EWS=Economically Weaker Section

CRITICAL INSTRUCTION — QUERY CLASSIFICATION:

Before answering, determine the TRUE intent of the user's question:

1. Is the user asking about MHT-CET college cutoffs/admissions?
   - Specific college name + branch mentioned? → Use database data
   - Word "cutoff" or "admission" in college context? → Use database data
   - Rank + eligibility question? → Use database data

2. Is the user asking an academic/conceptual question?
   - "What is X?" or "Explain X" or "Define X" → Use your knowledge to explain clearly
   - Asking about concepts, formulas, theories? → Explain like a teacher
   - Problem-solving? → Show step-by-step solution

3. Is the user asking about study planning? → Provide study strategies
4. Is the user seeking motivation? → Be encouraging and supportive

HANDLING AMBIGUITY:
If a query contains words like "college" or "admission" but is clearly NOT about MHT-CET cutoffs:
- "What is college in chemistry?" → Explain the chemistry concept
- "Define admission in biology" → Explain the biology term
- "A college has 500 students, find probability..." → Solve the math problem
- DO NOT force every query into admission counseling!

If truly ambiguous, ask ONE clarifying question:
- "Are you asking about MHT-CET college cutoffs or the chemistry/academic concept?"

NEVER:
- Make up cutoff data. Only use data provided in context.
- Refuse to answer a general knowledge question
- Force an academic question into college admission context`;

// ============================================================================
// SIMPLE RESPONSE CACHE (in-memory)
// ============================================================================

const responseCache = new Map();
const CACHE_MAX_SIZE = 200;          // Increased - more cache = fewer API calls
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours (was 30 min) — save API quota

function getCacheKey(message) {
    return message.toLowerCase().trim().replace(/\s+/g, ' ');
}

function getCachedResponse(key) {
    const entry = responseCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        responseCache.delete(key);
        return null;
    }
    return entry.value;
}

function setCachedResponse(key, value) {
    if (responseCache.size >= CACHE_MAX_SIZE) {
        // Remove oldest entry
        const firstKey = responseCache.keys().next().value;
        responseCache.delete(firstKey);
    }
    responseCache.set(key, { value, timestamp: Date.now() });
}

// ============================================================================
// INTENT DETECTION
// ============================================================================

// Common college name aliases → search terms
const COLLEGE_ALIASES = {
    'coep': 'College of Engineering, Pune',
    'vjti': 'Veermata Jijabai Technological Institute',
    'pict': 'Pune Institute of Computer Technology',
    'walchand': 'Walchand',
    'spit': 'Sardar Patel Institute of Technology',
    'dj sanghvi': 'Dwarkadas J. Sanghvi',
    'kjsce': 'K. J. Somaiya',
    'ict': 'Institute of Chemical Technology',
    'bits': 'BITS',
    'mit': 'Maharashtra Institute of Technology',
    'vit': 'Vishwakarma Institute of Technology',
    'cummins': 'Cummins',
    'iit': 'Indian Institute of Technology',
    'iiit': 'Indian Institute of Information Technology',
    'government college': 'Government College',
    'gcoea': 'Government College of Engineering, Amravati',
    'gcoeara': 'Government College of Engineering, Amravati',
};

// Branch aliases
const BRANCH_ALIASES = {
    'cs': 'Computer',
    'cse': 'Computer',
    'computer science': 'Computer',
    'computer': 'Computer',
    'it': 'Information Technology',
    'information technology': 'Information Technology',
    'entc': 'Electronics and Telecommunication',
    'electronics': 'Electronics',
    'extc': 'Electronics and Telecommunication',
    'mech': 'Mechanical',
    'mechanical': 'Mechanical',
    'civil': 'Civil',
    'electrical': 'Electrical',
    'ee': 'Electrical',
    'ai': 'Artificial Intelligence',
    'aiml': 'Artificial Intelligence',
    'data science': 'Data Science',
    'ds': 'Data Science',
    'artificial intelligence': 'Artificial Intelligence',
    'machine learning': 'Machine Learning',
    'cyber security': 'Cyber Security',
    'iot': 'Internet of Things',
    'robotics': 'Robotics',
    'chemical': 'Chemical',
    'instrumentation': 'Instrumentation',
};

// Category aliases
const CATEGORY_ALIASES = {
    'open': 'GOPENS',
    'general': 'GOPENS',
    'obc': 'GOBCS',
    'sc': 'GSCS',
    'st': 'GSTS',
    'ews': 'EWS',
    'tfws': 'TFWS',
    'nt': 'GNT1S',
    'nt1': 'GNT1S',
    'nt2': 'GNT2S',
    'nt3': 'GNT3S',
    'vjnt': 'GVJS',
    'vj': 'GVJS',
    'sebc': 'GSEBCS',
    'minority': 'MI',
    'defence': 'DEFOPENS',
    'pwd': 'PWDOPENS',
    'orphan': 'ORPHAN',
};

/**
 * Detect user intent from message text.
 * Uses keyword matching and regex — fast and deterministic.
 */
export function detectIntent(userMessage) {
    const msg = userMessage.toLowerCase().trim();

    const intent = {
        type: 'general',
        subtype: null,
        entities: {
            rank: null,
            percentile: null,
            collegeName: null,
            branchName: null,
            category: null,
            year: null,
            capRound: null,
            subject: null,
            topic: null,
            timeframe: null,
        },
        confidence: 'low',
    };

    // ---------- Extract entities ----------

    // Rank extraction: "rank 5000", "rank is 5000", "my rank is 5000", "5000 rank"
    const rankMatch = msg.match(/(?:rank\s*(?:is|of|:)?\s*(\d{1,6}))|(?:(\d{1,6})\s*rank)/i);
    if (rankMatch) {
        intent.entities.rank = parseInt(rankMatch[1] || rankMatch[2], 10);
    }

    // Percentile: "95 percentile", "percentile is 95.5", "95%"
    const percMatch = msg.match(/(?:(\d{1,3}(?:\.\d+)?)\s*(?:percentile|%|percent))|(?:percentile\s*(?:is|of|:)?\s*(\d{1,3}(?:\.\d+)?))/i);
    if (percMatch) {
        const val = parseFloat(percMatch[1] || percMatch[2]);
        if (val <= 100) intent.entities.percentile = val;
    }

    // Year: "2025", "in 2024"
    const yearMatch = msg.match(/\b(202[3-6])\b/);
    if (yearMatch) intent.entities.year = parseInt(yearMatch[1], 10);

    // CAP round: "round 1", "cap round 2", "cap 3"
    const capMatch = msg.match(/(?:cap\s*)?round\s*(\d)/i);
    if (capMatch) intent.entities.capRound = parseInt(capMatch[1], 10);

    // College name detection
    for (const [alias, fullName] of Object.entries(COLLEGE_ALIASES)) {
        if (msg.includes(alias)) {
            intent.entities.collegeName = fullName;
            break;
        }
    }

    // Branch detection
    for (const [alias, fullName] of Object.entries(BRANCH_ALIASES)) {
        const branchRegex = new RegExp(`\\b${alias}\\b`, 'i');
        if (branchRegex.test(msg)) {
            intent.entities.branchName = fullName;
            break;
        }
    }

    // Category detection
    for (const [alias, code] of Object.entries(CATEGORY_ALIASES)) {
        const catRegex = new RegExp(`\\b${alias}\\b`, 'i');
        if (catRegex.test(msg)) {
            intent.entities.category = code;
            break;
        }
    }

    // Subject detection (expanded to catch more terms)
    if (/physics|mechanics|thermodynamics|optics|electro|magnetic|wave|force|velocity|acceleration|gravit|motion|momentum|energy|torque|oscillat|pendulum|friction|projectile|kinematics|dynamics|fluid|pressure|heat|sound|light|refract|reflect|diffract|nuclear|quantum|relativity|photon|electron|current|voltage|resistance|capacit|inductor|circuit/i.test(msg)) {
        intent.entities.subject = 'physics';
    } else if (/chemistry|organic|inorganic|chemical|reaction|acid|base|element|compound|mole|bond|periodic|oxidat|reduct|electrolysis|polymer|hydrocarbon|isomer|catalyst|solution|titrat|pH|atom|ion|valence|covalent|ionic/i.test(msg)) {
        intent.entities.subject = 'chemistry';
    } else if (/math|calcul|algebra|trigono|geometry|vector|integral|derivative|equation|function|logarithm|matrix|determinant|permut|combinat|binomial|sequence|series|limit|continu|different|probabil|statistic|mean|median|variance/i.test(msg)) {
        intent.entities.subject = 'maths';
    } else if (/biology|cell|dna|rna|gene|evolution|ecology|botany|zoology|anatomy|physiology|enzyme|protein|mitosis|meiosis|photosynthesis|respiration|nervous|immune|hormone/i.test(msg)) {
        intent.entities.subject = 'biology';
    }

    // Timeframe: "30 days", "2 months", "1 week"
    const timeMatch = msg.match(/(\d+)\s*(day|week|month|year)s?/i);
    if (timeMatch) {
        intent.entities.timeframe = `${timeMatch[1]} ${timeMatch[2]}${parseInt(timeMatch[1]) > 1 ? 's' : ''}`;
    }

    // ---------- Determine intent type ----------

    // ===== NEGATIVE FILTERS (check FIRST — override to academic/general) =====
    // These patterns indicate the user is asking a concept/definition question,
    // NOT an MHT-CET cutoff query, even if words like "college" appear.
    const isDefinitionQuestion = /^(what\s+is|what\s+are|explain|define|describe|meaning\s+of|concept\s+of|tell\s+me\s+about)\b/i.test(msg);
    const isMathProblem = /\b(find\s+the|calculate|evaluate|solve|probability|how\s+many|if\s+\d|total\s+number|percentage\s+of\s+\d|a\s+college\s+has\s+\d|students?\s+in|are\s+selected)\b/i.test(msg);
    const isConceptualCollege = /\b(what\s+is\s+\w+\s+in\s+(chemistry|physics|maths|biology|science))|((concept|meaning|definition)\s+of\s+\w+\s+in)/i.test(msg);
    const isAcademicOverride = isDefinitionQuestion || isMathProblem || isConceptualCollege;

    // ===== KEYWORD GROUPS =====
    // Strong cutoff signals — these almost certainly mean MHT-CET cutoff query
    const strongCutoffKeywords = /\b(cutoff|cut\s*off|cap\s*round|mht[\s-]?cet|cetcell)\b/i;
    // Eligibility patterns
    const eligibilityPatterns = /\b(can\s*i\s*get|am\s*i\s*eligible|eligible\s*for|get\s*admission|qualify\s*for|admission\s*chance|my\s*chance|will\s*i\s*get)\b/i;
    // Weak cutoff signals — need to be combined with strong signals for confidence
    const weakAdmissionKeywords = /\b(college|admission|placement|seat|eligible|eligibility)\b/i;
    const compareKeywords = /\b(compare|vs|versus|better\s+than|difference\s*between)\b/i;
    const trendKeywords = /\b(trend|over\s*years|history|year[\s-]*wise|yearly|change|increasing|decreasing)\b/i;
    const recommendKeywords = /\b(best|top\s+\d|recommend|suggest|which\s*college|good\s*college|list\s*of\s*college)\b/i;

    // Study planning keywords
    const studyKeywords = /\b(study\s*plan|schedule|time\s*management|prepare|preparation|strategy|revision|timetable|how\s*to\s*study|mock\s*test)\b/i;

    // Academic keywords
    const academicKeywords = /\b(explain|solve|problem|concept|formula|definition|what\s*is|how\s*does|derive|prove|calculate|evaluate|find\s*the|practice\s*question|law|theorem|principle|effect|phenomenon)\b/i;

    // Motivation keywords
    const motivationKeywords = /\b(demotivat|stress|anxious|anxiety|nervous|scared|give\s*up|can't\s*do|impossible|motivat|disappoint|frustrated|overwhelm|panic|worry|worried|depressed|hopeless)\b/i;

    // Greeting / casual
    const greetingKeywords = /^(hi|hello|hey|good\s*(morning|afternoon|evening)|thanks|thank\s*you|ok|okay|bye|sup|yo|howdy)\b/i;

    // ===== CONFIDENCE-BASED INTENT CLASSIFICATION =====

    const hasCollegeName = !!intent.entities.collegeName;
    const hasRank = !!intent.entities.rank;
    const hasPercentile = !!intent.entities.percentile;
    const hasBranch = !!intent.entities.branchName;
    const hasStrongCutoff = strongCutoffKeywords.test(msg);
    const hasEligibility = eligibilityPatterns.test(msg);
    const hasWeakAdmission = weakAdmissionKeywords.test(msg);

    // ---------- Step 1: Academic override (HIGHEST PRIORITY) ----------
    // If the message is clearly academic even though it mentions "college", etc.
    if (isAcademicOverride && !hasCollegeName && !hasStrongCutoff && !hasEligibility) {
        intent.type = 'academic';
        intent.confidence = 'high';
        if (/solve|problem|calculate|evaluate|find\s*the|probability/i.test(msg)) {
            intent.subtype = 'problem_solving';
        } else {
            intent.subtype = 'concept_explanation';
        }
    }
    // ---------- Step 2: Greeting / casual ----------
    else if (greetingKeywords.test(msg) && msg.split(/\s+/).length <= 5) {
        intent.type = 'general';
        intent.confidence = 'high';
    }
    // ---------- Step 3: Motivation ----------
    else if (motivationKeywords.test(msg) && !hasCollegeName && !hasStrongCutoff) {
        intent.type = 'motivation';
        intent.confidence = 'high';
    }
    // ---------- Step 4: College admission (confidence-based) ----------
    else if (
        // HIGH confidence: specific college + branch, or strong cutoff keyword
        (hasCollegeName && (hasBranch || hasStrongCutoff || hasRank || hasEligibility)) ||
        (hasStrongCutoff && (hasCollegeName || hasBranch || hasRank)) ||
        (hasEligibility && (hasRank || hasPercentile)) ||
        (hasRank && hasCollegeName)
    ) {
        intent.type = 'college_admission';
        intent.confidence = 'high';

        if (compareKeywords.test(msg)) {
            intent.subtype = 'comparison';
        } else if (trendKeywords.test(msg)) {
            intent.subtype = 'trend';
        } else if (hasRank && !hasCollegeName && recommendKeywords.test(msg)) {
            intent.subtype = 'recommendation';
        } else if (hasRank && hasCollegeName) {
            intent.subtype = 'eligibility';
        } else if (hasCollegeName) {
            intent.subtype = 'cutoff_inquiry';
        } else if (hasRank) {
            intent.subtype = 'recommendation';
        } else {
            intent.subtype = 'cutoff_inquiry';
        }
    }
    // MEDIUM confidence: only weak signals (college name alone, or vague admission keywords)
    else if (
        (hasCollegeName && !isAcademicOverride) ||
        (hasRank && recommendKeywords.test(msg))
    ) {
        intent.type = 'college_admission';
        intent.confidence = 'medium';
        if (hasRank && !hasCollegeName) {
            intent.subtype = 'recommendation';
        } else if (hasCollegeName) {
            intent.subtype = 'cutoff_inquiry';
        } else {
            intent.subtype = 'cutoff_inquiry';
        }
    }
    // LOW confidence: only vague keywords like "college", "admission" without entities
    else if (hasWeakAdmission && !isAcademicOverride && !intent.entities.subject) {
        // Don't auto-classify — let Gemini handle it as general
        intent.type = 'general';
        intent.confidence = 'low';
    }
    // ---------- Step 5: Academic ----------
    else if (academicKeywords.test(msg) || (intent.entities.subject && !studyKeywords.test(msg))) {
        intent.type = 'academic';
        intent.confidence = 'high';
        if (/solve|problem|calculate|evaluate|find\s*the/i.test(msg)) {
            intent.subtype = 'problem_solving';
        } else {
            intent.subtype = 'concept_explanation';
        }
    }
    // ---------- Step 6: Study planning ----------
    else if (studyKeywords.test(msg)) {
        intent.type = 'study_planning';
        intent.confidence = 'high';
        if (/schedule|plan|timetable/i.test(msg)) {
            intent.subtype = 'study_schedule';
        } else {
            intent.subtype = 'exam_strategy';
        }
    }
    // ---------- Step 7: Default → general ----------
    else {
        intent.type = 'general';
        intent.confidence = 'medium';
    }

    return intent;
}

// ============================================================================
// DATABASE QUERY VALIDATION
// ============================================================================

/**
 * Determine whether we should query the database for this intent.
 * Only queries when we are confident it's a real MHT-CET cutoff question
 * with enough entities to form a meaningful query.
 */
function shouldQueryDatabase(intent) {
    // Must be college_admission type
    if (intent.type !== 'college_admission') return false;

    // Only query if confidence is high or medium (not low)
    if (intent.confidence === 'low') return false;

    // Validate minimum entities based on subtype
    switch (intent.subtype) {
        case 'eligibility':
            // Need at least a rank AND either college or branch
            return !!intent.entities.rank && (!!intent.entities.collegeName || !!intent.entities.branchName);

        case 'cutoff_inquiry':
            // Need at least a college name OR a branch name
            return !!intent.entities.collegeName || !!intent.entities.branchName;

        case 'comparison':
            // Need at least one college name
            return !!intent.entities.collegeName;

        case 'trend':
            // Need a college name to show trends
            return !!intent.entities.collegeName;

        case 'recommendation':
            // Need a rank to recommend colleges
            return !!intent.entities.rank;

        default:
            // For unknown subtypes, only if high confidence and has some entity
            return intent.confidence === 'high' && (
                !!intent.entities.collegeName || !!intent.entities.rank || !!intent.entities.branchName
            );
    }
}

// ============================================================================
// DATABASE QUERY BUILDER
// ============================================================================

/**
 * Query the cutoffs database based on detected intent.
 * Returns relevant cutoff data, or null if no DB query needed.
 */
async function queryDatabase(intent) {
    if (intent.type !== 'college_admission') return null;

    const year = intent.entities.year || 2025;
    const capRound = intent.entities.capRound || 1;
    const category = intent.entities.category || 'GOPENS';

    try {
        switch (intent.subtype) {
            case 'cutoff_inquiry': {
                // User asking about cutoffs — college may or may not have rank
                let query = supabase
                    .from('cutoffs')
                    .select('*')
                    .eq('year', year)
                    .eq('cap_round', capRound)
                    .eq('category', category)
                    .order('cutoff_rank', { ascending: true })
                    .limit(15);

                if (intent.entities.collegeName) {
                    query = query.ilike('college_name', `%${intent.entities.collegeName}%`);
                }
                if (intent.entities.branchName) {
                    query = query.ilike('course_name', `%${intent.entities.branchName}%`);
                }

                const { data, error } = await query;
                if (error) throw error;
                return { type: 'cutoff_inquiry', data: data || [], category, year, capRound };
            }

            case 'eligibility': {
                // User provided rank + college — check eligibility
                let query = supabase
                    .from('cutoffs')
                    .select('*')
                    .ilike('college_name', `%${intent.entities.collegeName}%`)
                    .eq('year', year)
                    .eq('cap_round', capRound)
                    .eq('category', category)
                    .order('cutoff_rank', { ascending: true })
                    .limit(10);

                if (intent.entities.branchName) {
                    query = query.ilike('course_name', `%${intent.entities.branchName}%`);
                }

                const { data, error } = await query;
                if (error) throw error;

                // Also fetch alternative colleges within user's rank
                const { data: alternatives } = await supabase
                    .from('cutoffs')
                    .select('*')
                    .gte('cutoff_rank', intent.entities.rank)
                    .eq('year', year)
                    .eq('cap_round', capRound)
                    .eq('category', category)
                    .ilike('course_name', `%${intent.entities.branchName || 'Computer'}%`)
                    .order('cutoff_rank', { ascending: true })
                    .limit(5);

                return {
                    type: 'eligibility',
                    targetCollege: data || [],
                    alternatives: alternatives || [],
                    userRank: intent.entities.rank,
                    category,
                    year,
                    capRound,
                };
            }

            case 'comparison': {
                // Extract multiple college names from the message
                const collegeNames = [];
                for (const [alias, fullName] of Object.entries(COLLEGE_ALIASES)) {
                    if (intent._originalMessage && intent._originalMessage.toLowerCase().includes(alias)) {
                        collegeNames.push(fullName);
                    }
                }

                if (collegeNames.length < 2 && intent.entities.collegeName) {
                    collegeNames.push(intent.entities.collegeName);
                }

                if (collegeNames.length === 0) return null;

                const results = await Promise.all(
                    collegeNames.map(async (name) => {
                        let query = supabase
                            .from('cutoffs')
                            .select('*')
                            .ilike('college_name', `%${name}%`)
                            .eq('year', year)
                            .eq('cap_round', capRound)
                            .eq('category', category)
                            .order('cutoff_rank', { ascending: true })
                            .limit(10);

                        if (intent.entities.branchName) {
                            query = query.ilike('course_name', `%${intent.entities.branchName}%`);
                        }

                        const { data } = await query;
                        return { collegeName: name, data: data || [] };
                    })
                );

                return { type: 'comparison', colleges: results, category, year, capRound };
            }

            case 'trend': {
                if (!intent.entities.collegeName) return null;

                let query = supabase
                    .from('cutoffs')
                    .select('year, cap_round, cutoff_rank, cutoff_percentile, college_name, course_name, category')
                    .ilike('college_name', `%${intent.entities.collegeName}%`)
                    .eq('category', category)
                    .eq('cap_round', 1) // Compare CAP Round 1 across years
                    .order('year', { ascending: true });

                if (intent.entities.branchName) {
                    query = query.ilike('course_name', `%${intent.entities.branchName}%`);
                }

                const { data, error } = await query;
                if (error) throw error;
                return { type: 'trend', data: data || [], category };
            }

            case 'recommendation': {
                const rank = intent.entities.rank;
                if (!rank) return null;

                let query = supabase
                    .from('cutoffs')
                    .select('*')
                    .gte('cutoff_rank', rank)
                    .eq('year', year)
                    .eq('cap_round', capRound)
                    .eq('category', category)
                    .order('cutoff_rank', { ascending: true })
                    .limit(20);

                if (intent.entities.branchName) {
                    query = query.ilike('course_name', `%${intent.entities.branchName}%`);
                }

                const { data, error } = await query;
                if (error) throw error;

                // Deduplicate by college + course
                const seen = new Map();
                for (const row of (data || [])) {
                    const key = `${row.college_name}||${row.course_name}`;
                    if (!seen.has(key)) seen.set(key, row);
                }

                return {
                    type: 'recommendation',
                    data: Array.from(seen.values()),
                    userRank: rank,
                    category,
                    year,
                    capRound,
                };
            }

            default:
                return null;
        }
    } catch (err) {
        console.error('Database query error:', err);
        return null;
    }

    return null;
}

// ============================================================================
// SMART CONVERSATION HISTORY (Context Window Optimization)
// ============================================================================

/**
 * Select the most relevant messages from conversation history.
 * Instead of blindly taking last 10, we pick smartly:
 * - Always include the first message (sets context)
 * - Include last 6-8 recent messages
 * - Skip trivial messages ("ok", "thanks", "hmm")
 * - Keep messages with database results context
 * Maximum: 10 messages total
 */
function getSmartHistory(conversationHistory) {
    if (!conversationHistory || conversationHistory.length === 0) return [];
    if (conversationHistory.length <= 10) return conversationHistory;

    const trivialPatterns = /^(ok|okay|thanks|thank\s*you|hmm|oh|got\s*it|sure|yes|no|alright|fine|cool|nice|great|good|👍|👌|🙏|k)$/i;

    // Filter out trivial messages but keep track of indices
    const meaningful = conversationHistory
        .map((m, i) => ({ ...m, _idx: i }))
        .filter(m => !trivialPatterns.test(m.content?.trim()));

    // Always include first meaningful message
    const selected = [];
    if (meaningful.length > 0) {
        selected.push(meaningful[0]);
    }

    // Take last 8 meaningful messages (or fewer if not enough)
    const recent = meaningful.slice(-8);
    for (const msg of recent) {
        if (!selected.find(s => s._idx === msg._idx)) {
            selected.push(msg);
        }
    }

    // Sort by original index to preserve order
    selected.sort((a, b) => a._idx - b._idx);

    // Remove internal tracking and limit to 10
    return selected.slice(0, 10).map(({ _idx, ...rest }) => rest);
}

// ============================================================================
// RESPONSE GENERATION (Gemini + context)
// ============================================================================

/**
 * Build and send prompt to Gemini with optional database context.
 */
async function generateResponse(intent, dbResults, userMessage, conversationHistory = []) {
    const gemini = getModel();

    if (!gemini) {
        return getFallbackResponse(intent, dbResults, userMessage);
    }

    // Build context parts
    const parts = [];

    // System prompt goes first
    parts.push({ text: SYSTEM_PROMPT });

    // Add conversation history (smart selection for context window optimization)
    const smartHistory = getSmartHistory(conversationHistory);
    if (smartHistory.length > 0) {
        parts.push({ text: '\n\nPrevious conversation:\n' + smartHistory.map(m =>
            `${m.role === 'user' ? 'Student' : 'KakshaAI'}: ${m.content}`
        ).join('\n') });
    }

    // Add database context if available
    if (dbResults) {
        parts.push({ text: `\n\nREAL MHT-CET CUTOFF DATA FROM DATABASE:\n${JSON.stringify(dbResults, null, 2)}\n\nIMPORTANT: Base your response ONLY on this real data. Cite specific numbers (year, CAP round, rank, percentile). Do NOT make up any cutoff data.` });
    }

    // User message
    parts.push({ text: `\n\nStudent's Question: "${userMessage}"\n\nPlease respond helpfully:` });

    // Token-efficient config — keep responses concise to save quota
    const genConfig = { maxOutputTokens: 1536, temperature: 0.7, topP: 0.9 };
    const requestPayload = { contents: [{ role: 'user', parts }], generationConfig: genConfig };

    // ---- Attempt with primary model ----
    try {
        const result = await gemini.generateContent(requestPayload);
        rateLimiter.recordRequest(); // Track successful call
        const text = result.response.text();
        if (text?.trim()) return text;
    } catch (err) {
        const errMsg = err?.message || err?.toString() || '';
        console.warn(`Model ${PRIMARY_MODEL} failed:`, errMsg);

        // ---- Handle rate limit (429) — try fallback model (separate per-model quota) ----
        if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
            const delayMatch = errMsg.match(/retry\s*(?:in|after)\s*(\d+(?:\.\d+)?)\s*s/i);
            const delaySec = delayMatch ? Math.ceil(parseFloat(delayMatch[1])) : 60;
            rateLimiter.setCooldown(delaySec + 5);

            // Try fallback model — gemini-2.5-flash-lite has its OWN separate quota
            try {
                const fallbackModel = getFallbackModel();
                if (fallbackModel) {
                    const result2 = await fallbackModel.generateContent(requestPayload);
                    rateLimiter.recordRequest();
                    const text2 = result2.response.text();
                    if (text2?.trim()) return text2;
                }
            } catch (err2) {
                console.warn(`Fallback model also failed:`, err2?.message);
            }

            // Both models failed — return helpful fallback
            const fallback = getFallbackResponse(intent, dbResults, userMessage);
            return fallback + `\n\n> ⏳ **High traffic!** The AI is busy. Please try again in ~${delaySec} seconds for a detailed response.`;
        }

        // ---- Handle 404 (model doesn't exist) — try fallback model ----
        if (errMsg.includes('404') || errMsg.includes('not found')) {
            try {
                const fallbackModel = getFallbackModel();
                if (fallbackModel) {
                    const result2 = await fallbackModel.generateContent(requestPayload);
                    rateLimiter.recordRequest();
                    const text2 = result2.response.text();
                    if (text2?.trim()) return text2;
                }
            } catch (err2) {
                console.warn(`Fallback model also failed:`, err2?.message);
            }
        }
    }

    // All attempts failed
    return getFallbackResponse(intent, dbResults, userMessage);
}

/**
 * Fallback response when Gemini is unavailable.
 * Provides helpful, topic-specific responses so users always get SOME value.
 */
function getFallbackResponse(intent, dbResults, userMessage) {
    // ===== Database-backed responses (show real data even without Gemini) =====

    // Handle cutoff inquiry (college data without rank)
    if (dbResults && dbResults.type === 'cutoff_inquiry' && dbResults.data?.length > 0) {
        let response = `🎓 **Cutoff Data** (${dbResults.year} | CAP Round ${dbResults.capRound} | ${dbResults.category}):\n\n`;
        dbResults.data.slice(0, 8).forEach((c, i) => {
            response += `${i + 1}. **${c.college_name}** — ${c.course_name}\n`;
            response += `   • Cutoff Rank: **${c.cutoff_rank?.toLocaleString() || 'N/A'}** | Percentile: **${c.cutoff_percentile ? Number(c.cutoff_percentile).toFixed(2) + '%' : 'N/A'}**\n\n`;
        });
        response += `> 💡 *For more detailed analysis, try again in a moment!*`;
        return response;
    }

    if (dbResults && dbResults.type === 'eligibility' && dbResults.targetCollege?.length > 0) {
        const college = dbResults.targetCollege[0];
        const rank = dbResults.userRank;
        const eligible = rank && college.cutoff_rank && rank <= college.cutoff_rank;

        let response = `📊 **${college.college_name}** — ${college.course_name}\n\n`;
        response += `- **Cutoff Rank:** ${college.cutoff_rank?.toLocaleString() || 'N/A'}\n`;
        response += `- **Cutoff Percentile:** ${college.cutoff_percentile ? Number(college.cutoff_percentile).toFixed(2) + '%' : 'N/A'}\n`;
        response += `- **Year:** ${college.year} | **CAP Round:** ${college.cap_round} | **Category:** ${college.category}\n\n`;

        if (rank) {
            response += eligible
                ? `✅ With rank **${rank.toLocaleString()}**, you are **eligible** for this seat!\n`
                : `❌ With rank **${rank.toLocaleString()}**, this seat may be difficult (cutoff: ${college.cutoff_rank?.toLocaleString()}).\n`;
        }

        // Show alternatives if available
        if (dbResults.alternatives?.length > 0) {
            response += `\n**Alternative options you can target:**\n\n`;
            dbResults.alternatives.slice(0, 5).forEach((a, i) => {
                response += `${i + 1}. ${a.college_name} — ${a.course_name} (Rank: ${a.cutoff_rank?.toLocaleString() || 'N/A'})\n`;
            });
        }

        return response;
    }

    if (dbResults && dbResults.type === 'comparison' && dbResults.colleges?.length > 0) {
        let response = `📊 **College Comparison** (${dbResults.year} | CAP Round ${dbResults.capRound} | ${dbResults.category}):\n\n`;
        dbResults.colleges.forEach((college) => {
            response += `### ${college.collegeName}\n`;
            if (college.data?.length > 0) {
                college.data.slice(0, 5).forEach((c) => {
                    response += `- ${c.course_name}: Rank **${c.cutoff_rank?.toLocaleString() || 'N/A'}** | Percentile: ${c.cutoff_percentile ? Number(c.cutoff_percentile).toFixed(2) + '%' : 'N/A'}\n`;
                });
            } else {
                response += `- No data found\n`;
            }
            response += `\n`;
        });
        return response;
    }

    if (dbResults && dbResults.type === 'recommendation' && dbResults.data?.length > 0) {
        let response = `🏫 **Colleges you can target with rank ${dbResults.userRank?.toLocaleString()}** (${dbResults.category}, ${dbResults.year} CAP ${dbResults.capRound}):\n\n`;
        dbResults.data.slice(0, 10).forEach((c, i) => {
            response += `${i + 1}. **${c.college_name}** — ${c.course_name}\n   Cutoff Rank: ${c.cutoff_rank?.toLocaleString() || 'N/A'}\n\n`;
        });
        return response;
    }

    // ===== Intent-specific non-database fallbacks =====

    if (intent.type === 'college_admission') {
        if (intent.entities.collegeName && !dbResults?.data?.length && !dbResults?.targetCollege?.length) {
            return `🔍 I couldn't find cutoff data for **${intent.entities.collegeName}**${intent.entities.branchName ? ` (${intent.entities.branchName})` : ''}. Try:\n\n- Check spelling of the college name\n- Try a different year or CAP round (e.g., add "2024" or "round 2")\n- Use the full name or common abbreviation (e.g., COEP, VJTI, PICT)\n- Specify a branch: CS, IT, Mechanical, etc.`;
        }
        return "🎓 I can help with MHT-CET college admissions! Tell me the **college name** and **branch**. For example:\n\n- \"DJ Sanghvi Data Science cutoff\"\n- \"COEP CS cutoff 2024\"\n- \"Can I get VJTI IT with rank 5000?\"\n- \"Best colleges for rank 10000 OBC\"";
    }

    if (intent.type === 'academic') {
        const subject = intent.entities?.subject;
        const msg = userMessage.toLowerCase();

        // Provide quick topic-specific fallbacks
        if (subject === 'physics') {
            return `📚 **Physics Quick Reference:**\n\n**Key Branches:** Mechanics, Thermodynamics, Electromagnetism, Optics, Modern Physics, Waves\n\n**Essential Formulas:**\n- Newton's Laws: **F = ma**, action-reaction pairs\n- Work-Energy: **W = F·d·cos(θ)**, KE = ½mv²\n- Thermodynamics: **ΔU = Q − W**, PV = nRT\n- Electrostatics: **F = kq₁q₂/r²**, V = kq/r\n\n> 💡 The AI is temporarily busy. Try again in a moment for a **detailed explanation** of your specific topic!`;
        }
        if (subject === 'chemistry') {
            return `📚 **Chemistry Quick Reference:**\n\n**Key Branches:** Physical Chemistry, Organic Chemistry, Inorganic Chemistry\n\n**Essential Concepts:**\n- **Physical:** Thermodynamics, Chemical Equilibrium, Electrochemistry, Kinetics\n- **Organic:** Functional groups, Reaction mechanisms, Named reactions\n- **Inorganic:** Periodic trends, Coordination compounds, d-block elements\n\n> 💡 The AI is temporarily busy. Try again in a moment for a **detailed explanation** of your specific topic!`;
        }
        if (subject === 'maths') {
            return `📚 **Maths Quick Reference:**\n\n**Key Topics:** Calculus, Algebra, Trigonometry, Probability, Vectors, Coordinate Geometry\n\n**Essential Formulas:**\n- **Differentiation:** d/dx(xⁿ) = nxⁿ⁻¹, Chain rule, Product rule\n- **Integration:** ∫xⁿdx = xⁿ⁺¹/(n+1) + C\n- **Trigonometry:** sin²θ + cos²θ = 1\n- **Probability:** P(A∪B) = P(A) + P(B) − P(A∩B)\n\n> 💡 The AI is temporarily busy. Try again in a moment for a **step-by-step solution**!`;
        }

        return `📚 Great question! Here's what I can help with:\n\n- Detailed concept explanations with examples\n- All relevant formulas and derivations\n- Step-by-step problem solving\n- Practice questions and common mistakes\n\n> 💡 The AI is temporarily busy. Please try again in a moment — your question will be answered in full detail!`;
    }

    if (intent.type === 'study_planning') {
        return `📝 **Quick Study Framework for MHT-CET:**\n\n**Daily Plan:**\n1. ⏰ **Morning (2-3 hrs):** Physics — Numericals & problem-solving\n2. 📖 **Afternoon (2-3 hrs):** Chemistry — Theory + Organic reactions\n3. 🧮 **Evening (2-3 hrs):** Maths — Practice Calculus & Probability\n4. 🔄 **Night (1 hr):** Quick revision of today's topics\n\n**Weekly:**\n- 📊 Take 2 full mock tests\n- 📝 Review mistakes from mocks\n- 🔁 Revise weak topics from last week\n\n**Pro Tips:**\n- Solve at least **50 MCQs** daily\n- Use **spaced repetition** for formulas\n- Focus on **high-weightage topics** first\n\n> 💡 Tell me your exam date and weak subjects for a **personalized plan**!`;
    }

    if (intent.type === 'motivation') {
        const motivationalMessages = [
            "💪 **You've got this!** Remember:\n\n- **Consistency beats intensity** — 4 focused hours > 10 distracted hours\n- **Every topper was once a beginner** — trust the process\n- **Progress, not perfection** — small daily improvements add up\n\n> \"The expert in anything was once a beginner. Keep going!\"\n\nI believe in you! What specific challenge are you facing? 🌟",
            "🌟 **Stay Strong!** Here's what works:\n\n- **Break big goals into small tasks** — one chapter at a time\n- **Celebrate small wins** — finished a topic? That counts!\n- **Rest is productive** — your brain consolidates learning during breaks\n\n> \"Success is the sum of small efforts repeated day in and day out.\"\n\nYou're already on the right track by studying! 💪",
            "🔥 **Remember Why You Started!**\n\n- **Bad days don't mean bad results** — one tough day doesn't define your journey\n- **Compare with yourself, not others** — your pace is perfect\n- **Ask for help** — it's a sign of strength, not weakness\n\n> \"Difficult roads often lead to beautiful destinations.\"\n\nKeep pushing — your future self will thank you! 🚀"
        ];
        return motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
    }

    // General / default fallback
    return "👋 Hey! I'm KakshaAI — your AI study partner!\n\nYou can ask me **anything**:\n- 📚 Any subject doubt (Physics, Chemistry, Maths, Biology, History, etc.)\n- 📊 MHT-CET college cutoffs & admission chances\n- 🧮 Formulas, derivations & problem solving\n- 📝 Study plans & exam strategies\n- 💡 Explain any concept in simple language\n\nGo ahead, ask me anything! 😊";
}

// ============================================================================
// MAIN CHAT FUNCTION
// ============================================================================

/**
 * Process a user message and return a chatbot response.
 *
 * @param {string} userMessage - The user's message
 * @param {Array} conversationHistory - Previous messages [{role, content}, ...]
 * @returns {Promise<{response: string, intent: object, metadata: object}>}
 */
export async function chat(userMessage, conversationHistory = []) {
    if (!userMessage || !userMessage.trim()) {
        return {
            response: "Please type a message to get started! 😊",
            intent: { type: 'general' },
            metadata: { usedDatabase: false, recordsQueried: 0 },
        };
    }

    try {
        // 1. Detect intent
        const intent = detectIntent(userMessage);
        intent._originalMessage = userMessage;

        // 2. Check cache — cache ALL response types to save API quota
        const cacheKey = getCacheKey(userMessage);
        if (conversationHistory.length === 0) {
            const cached = getCachedResponse(cacheKey);
            if (cached) {
                return {
                    response: cached.response,
                    intent: cached.intent,
                    metadata: { ...cached.metadata, cached: true },
                };
            }
        }

        // 3. Query database ONLY if validated
        let dbResults = null;
        if (shouldQueryDatabase(intent)) {
            dbResults = await queryDatabase(intent);
        }

        // 4. Wait for rate limiter before calling Gemini
        const canProceed = await waitForRateLimit();
        if (!canProceed) {
            // Daily limit reached — use fallback
            const fallback = getFallbackResponse(intent, dbResults, userMessage);
            return {
                response: fallback + '\n\n> ⚠️ **Daily AI limit reached.** Cutoff queries still work! For other questions, please try again tomorrow.',
                intent: { type: intent.type, subtype: intent.subtype, entities: intent.entities, confidence: intent.confidence },
                metadata: { usedDatabase: dbResults !== null, rateLimited: true },
            };
        }

        // 5. Generate response
        const response = await generateResponse(
            intent,
            dbResults,
            userMessage,
            conversationHistory
        );

        const result = {
            response,
            intent: { type: intent.type, subtype: intent.subtype, entities: intent.entities, confidence: intent.confidence },
            metadata: {
                usedDatabase: dbResults !== null,
                recordsQueried: dbResults?.data?.length || dbResults?.targetCollege?.length || dbResults?.colleges?.reduce((sum, c) => sum + (c.data?.length || 0), 0) || 0,
                timestamp: new Date().toISOString(),
            },
        };

        // 6. Cache ALL responses to save API quota
        if (conversationHistory.length === 0) {
            setCachedResponse(cacheKey, result);
        }

        return result;
    } catch (err) {
        console.error('Chat error:', err);
        const errMsg = err?.message || err?.toString() || '';

        // User-friendly error messages
        let friendlyMessage;
        if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
            friendlyMessage = "⏳ **High traffic right now!** Many students are using the chatbot. Please try again in about 1 minute for a detailed response.\n\n> 💡 Tip: You can still ask about MHT-CET cutoffs — those use our database and work instantly!";
        } else if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('net::')) {
            friendlyMessage = "🌐 **Connection issue!** Please check your internet connection and try again.\n\n> If the problem persists, try refreshing the page.";
        } else if (errMsg.includes('API key') || errMsg.includes('API_KEY') || errMsg.includes('unauthorized')) {
            friendlyMessage = "⚙️ **AI features are not configured.** Please contact support to enable the AI assistant.";
        } else {
            friendlyMessage = "❌ Something went wrong. Please try again!\n\n> If this keeps happening, try refreshing the page or asking a simpler question.";
        }

        return {
            response: friendlyMessage,
            intent: { type: 'general' },
            metadata: { error: err.message },
        };
    }
}

// ============================================================================
// DYNAMIC SUGGESTIONS
// ============================================================================

/**
 * Get contextual suggestions based on the last message intent.
 */
export function getSuggestions(lastIntent = null) {
    const defaultSuggestions = [
        "What is thermodynamics?",
        "Explain Newton's laws simply",
        "Give me all integration formulas",
        "Can I get COEP CS with rank 5000?",
        "Create a 30-day study plan",
        "Important formulas for Physics",
        "Explain organic chemistry reactions",
        "How to manage exam stress?",
    ];

    if (!lastIntent) return defaultSuggestions;

    switch (lastIntent.type) {
        case 'college_admission':
            return [
                "Show me similar colleges",
                "What about other branches?",
                "Show cutoff trend over years",
                "Check eligibility for PICT",
                "Best colleges in Pune",
                "Compare with VJTI",
            ];
        case 'academic':
            return [
                "Give me all formulas for this topic",
                "Solve a practice problem on this",
                "Explain with a real-world example",
                "What are common mistakes here?",
                "Tips to remember this concept",
                "Derivation for this formula",
            ];
        case 'study_planning':
            return [
                "Focus on Physics only",
                "Add mock test schedule",
                "I'm weak in organic chemistry",
                "Best revision strategy",
                "How to improve speed?",
                "Last 15 days strategy",
            ];
        case 'motivation':
            return [
                "How to stay consistent?",
                "Success stories of toppers",
                "How to handle exam day anxiety?",
                "Tips for scoring 150+",
                "Balance between studies and rest",
                "How to bounce back from failure?",
            ];
        default:
            return defaultSuggestions;
    }
}

/**
 * Check if Gemini API is configured
 */
export function isAIConfigured() {
    return API_KEY && API_KEY !== 'your_gemini_api_key_here';
}

// ============================================================================
// STREAMING CHAT (typewriter effect)
// ============================================================================

/**
 * Process a user message and stream the response token by token.
 *
 * @param {string} userMessage
 * @param {Array} conversationHistory
 * @param {function} onChunk - called with (accumulatedText) for each chunk
 * @returns {Promise<{response: string, intent: object, metadata: object}>}
 */
export async function chatStream(userMessage, conversationHistory = [], onChunk) {
    if (!userMessage || !userMessage.trim()) {
        const r = "Please type a message to get started! 😊";
        onChunk?.(r);
        return { response: r, intent: { type: 'general' }, metadata: { usedDatabase: false } };
    }

    try {
        const intent = detectIntent(userMessage);
        intent._originalMessage = userMessage;

        // Check cache — cache ALL types to save API quota
        const cacheKey = getCacheKey(userMessage);
        if (conversationHistory.length === 0) {
            const cached = getCachedResponse(cacheKey);
            if (cached) {
                // Simulate streaming for cached responses
                const text = cached.response;
                let acc = '';
                for (let i = 0; i < text.length; i += 3) {
                    acc = text.slice(0, i + 3);
                    onChunk?.(acc);
                    await new Promise(r => setTimeout(r, 8));
                }
                onChunk?.(text);
                return { response: text, intent: cached.intent, metadata: { ...cached.metadata, cached: true } };
            }
        }

        // Query database ONLY if validated
        let dbResults = null;
        if (shouldQueryDatabase(intent)) {
            dbResults = await queryDatabase(intent);
        }

        // Wait for rate limiter before calling Gemini
        const canProceed = await waitForRateLimit();

        // Try streaming with Gemini
        const gemini = getModel();
        if (!gemini || !canProceed) {
            const fallback = getFallbackResponse(intent, dbResults, userMessage);
            const msg = !canProceed
                ? fallback + '\n\n> ⚠️ **Daily AI limit reached.** Cutoff queries still work! For other questions, please try again tomorrow.'
                : fallback;
            onChunk?.(msg);
            return {
                response: msg,
                intent: { type: intent.type, subtype: intent.subtype, entities: intent.entities },
                metadata: { usedDatabase: dbResults !== null, rateLimited: !canProceed },
            };
        }

        // Build prompt parts (same as generateResponse)
        const parts = [];
        parts.push({ text: SYSTEM_PROMPT });

        const smartHistory = getSmartHistory(conversationHistory);
        if (smartHistory.length > 0) {
            parts.push({ text: '\n\nPrevious conversation:\n' + smartHistory.map(m =>
                `${m.role === 'user' ? 'Student' : 'KakshaAI'}: ${m.content}`
            ).join('\n') });
        }

        if (dbResults) {
            parts.push({ text: `\n\nREAL MHT-CET CUTOFF DATA FROM DATABASE:\n${JSON.stringify(dbResults, null, 2)}\n\nIMPORTANT: Base your response ONLY on this real data. Cite specific numbers (year, CAP round, rank, percentile). Do NOT make up any cutoff data.` });
        }

        parts.push({ text: `\n\nStudent's Question: "${userMessage}"\n\nPlease respond helpfully:` });

        const genConfig = { maxOutputTokens: 1536, temperature: 0.7, topP: 0.9 };
        const requestPayload = { contents: [{ role: 'user', parts }], generationConfig: genConfig };

        // ---- Single attempt with primary model (no wasteful model switching) ----
        try {
            const result = await gemini.generateContentStream(requestPayload);
            rateLimiter.recordRequest();

            let fullText = '';
            for await (const chunk of result.stream) {
                const text = chunk.text();
                if (text) {
                    fullText += text;
                    onChunk?.(fullText);
                }
            }

            if (fullText.trim()) {
                const res = {
                    response: fullText,
                    intent: { type: intent.type, subtype: intent.subtype, entities: intent.entities, confidence: intent.confidence },
                    metadata: { usedDatabase: dbResults !== null, recordsQueried: dbResults?.data?.length || dbResults?.targetCollege?.length || 0, timestamp: new Date().toISOString() },
                };
                // Cache ALL response types
                if (conversationHistory.length === 0) {
                    setCachedResponse(cacheKey, res);
                }
                return res;
            }
        } catch (err) {
            const errMsg = err?.message || err?.toString() || '';
            console.warn(`Streaming failed:`, errMsg);

            // ---- Handle rate limit (429) — try fallback model (separate per-model quota) ----
            if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
                const delayMatch = errMsg.match(/retry\s*(?:in|after)\s*(\d+(?:\.\d+)?)\s*s/i);
                const delaySec = delayMatch ? Math.ceil(parseFloat(delayMatch[1])) : 60;
                rateLimiter.setCooldown(delaySec + 5);

                // Try fallback model — it has its OWN separate quota
                try {
                    const fbModel = getFallbackModel();
                    if (fbModel) {
                        const result2 = await fbModel.generateContentStream(requestPayload);
                        rateLimiter.recordRequest();
                        let fullText = '';
                        for await (const chunk of result2.stream) {
                            const text = chunk.text();
                            if (text) { fullText += text; onChunk?.(fullText); }
                        }
                        if (fullText.trim()) {
                            const res = {
                                response: fullText,
                                intent: { type: intent.type, subtype: intent.subtype, entities: intent.entities, confidence: intent.confidence },
                                metadata: { usedDatabase: dbResults !== null, model: FALLBACK_MODEL },
                            };
                            if (conversationHistory.length === 0) setCachedResponse(cacheKey, res);
                            return res;
                        }
                    }
                } catch (fbErr) {
                    console.warn(`Fallback model streaming also failed:`, fbErr?.message);
                }

                // Both models failed — return helpful fallback
                const fallback = getFallbackResponse(intent, dbResults, userMessage);
                const msg = fallback + `\n\n> ⏳ **High traffic!** Please try again in ~${delaySec} seconds for a detailed AI response.`;
                onChunk?.(msg);
                return {
                    response: msg,
                    intent: { type: intent.type, subtype: intent.subtype, entities: intent.entities },
                    metadata: { usedDatabase: dbResults !== null, rateLimited: true },
                };
            }

            // ---- 404: try fallback model once ----
            if (errMsg.includes('404') || errMsg.includes('not found')) {
                try {
                    const fbModel = getFallbackModel();
                    if (fbModel) {
                        const result2 = await fbModel.generateContentStream(requestPayload);
                        rateLimiter.recordRequest();
                        let fullText = '';
                        for await (const chunk of result2.stream) {
                            const text = chunk.text();
                            if (text) { fullText += text; onChunk?.(fullText); }
                        }
                        if (fullText.trim()) {
                            const res = {
                                response: fullText,
                                intent: { type: intent.type, subtype: intent.subtype, entities: intent.entities, confidence: intent.confidence },
                                metadata: { usedDatabase: dbResults !== null },
                            };
                            if (conversationHistory.length === 0) setCachedResponse(cacheKey, res);
                            return res;
                        }
                    }
                } catch (err2) {
                    console.warn('Fallback model streaming also failed:', err2?.message);
                }
            }
        }

        // All streaming failed — return fallback (DON'T call generateResponse which would make another API call)
        const fallbackText = getFallbackResponse(intent, dbResults, userMessage);
        onChunk?.(fallbackText);
        return {
            response: fallbackText,
            intent: { type: intent.type, subtype: intent.subtype, entities: intent.entities },
            metadata: { usedDatabase: dbResults !== null },
        };

    } catch (err) {
        console.error('Stream chat error:', err);
        const errMsg = err?.message || err?.toString() || '';

        let friendlyMessage;
        if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
            friendlyMessage = "⏳ **High traffic right now!** Many students are using the chatbot. Please try again in about 1 minute.\n\n> 💡 Tip: MHT-CET cutoff queries use our database and work instantly!";
        } else if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('net::')) {
            friendlyMessage = "🌐 **Connection issue!** Please check your internet and try again.";
        } else {
            friendlyMessage = "❌ Something went wrong. Please try again!\n\n> If this keeps happening, try refreshing the page.";
        }

        onChunk?.(friendlyMessage);
        return { response: friendlyMessage, intent: { type: 'general' }, metadata: { error: err.message } };
    }
}
