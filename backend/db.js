import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function saveResearch(data) {
  const { error } = await supabase.from("research_history").insert({
    company: data.company,
    verdict: data.verdict.verdict,
    confidence: data.verdict.confidence,
    summary: data.verdict.summary,
    strengths: data.verdict.strengths,
    weaknesses: data.verdict.weaknesses,
    final_reasoning: data.verdict.finalReasoning,
    company_info: data.companyInfo,
    financials: data.financials,
    market_position: data.marketPosition,
    risks: data.risks,
  });
  if (error) console.error("Supabase insert error:", error.message);
}

export async function getHistory() {
  const { data, error } = await supabase
    .from("research_history")
    .select("id, company, verdict, confidence, summary, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    console.error("Supabase fetch error:", error.message);
    return [];
  }
  return data;
}

export async function deleteHistory(id) {
  const { error } = await supabase
    .from("research_history")
    .delete()
    .eq("id", id);
  if (error) console.error("Supabase delete error:", error.message);
}

export async function getResearchById(id) {
  const { data, error } = await supabase
    .from("research_history")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    console.error("Supabase fetch by id error:", error.message);
    return null;
  }
  return data;
}
export async function getResearchByCompany(company) {
  const { data, error } = await supabase
    .from("research_history")
    .select("*")
    .ilike("company", company)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return data;
}
