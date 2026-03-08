# 📚 KakshaAI

**MHT-CET Exam Preparation Platform** — Helping Maharashtra students ace their engineering entrance exam.

## Features

- **Study Hub** — 71 chapters across Physics, Chemistry & Maths with video lectures, notes, formula sheets & practice quizzes
- **Mock Tests** — Full-length MHT-CET pattern tests with section-wise timing & proctoring
- **AI Assistant** — Powered by Gemini 2.5 Flash for doubt solving, study planning & college counseling
- **Analytics Dashboard** — Subject-wise performance, score trends, time management, MHT-CET score predictor
- **College Cutoffs** — 287,000+ records across 367 colleges, rank predictor, trend analysis & shortlisting
- **Past Papers** — Browse, filter & solve previous year papers with timed mode
- **Daily Challenges** — Personalized daily goals with streak tracking & achievement badges

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS + Framer Motion |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| AI | Gemini 2.5 Flash + Gemini 2.5 Flash Lite |
| Routing | React Router v6 |
| Charts | Recharts |
| Math | KaTeX |
| Icons | Lucide React |

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your keys (see below)

# Start dev server
npm run dev
```

### Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

## License

MIT
