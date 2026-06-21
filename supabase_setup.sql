-- Run this in your Supabase project SQL Editor
-- Go to: https://supabase.com/dashboard → Your Project → SQL Editor → New Query

CREATE TABLE IF NOT EXISTS research_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company TEXT NOT NULL,
  verdict TEXT NOT NULL,
  confidence INTEGER,
  summary TEXT,
  strengths TEXT[],
  weaknesses TEXT[],
  final_reasoning TEXT,
  company_info TEXT,
  financials TEXT,
  market_position TEXT,
  risks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (good practice)
ALTER TABLE research_history ENABLE ROW LEVEL SECURITY;

-- Allow all operations (since we use anon key from backend)
CREATE POLICY "Allow all" ON research_history FOR ALL USING (true) WITH CHECK (true);
