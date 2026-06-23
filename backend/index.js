import "dotenv/config";
import express from "express";
import cors from "cors";
import { runResearchAgent } from "./agent.js";
import { saveResearch, getHistory, deleteHistory, getResearchById, getResearchByCompany } from "./db.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/research/stream", async (req, res) => {
  const company = req.query.company?.trim();
  if (!company) {
    if (company.length > 100) {
      return res.status(400).json({ error: "Company name too long (max 100 characters)" });
    }
    if (company.length > 100) {
      return res.status(400).json({ error: "Company name too long (max 100 characters)" });
    }
    if (company.length > 100) {
      return res.status(400).json({ error: "Company name too long (max 100 characters)" });
    }
    if (company.length > 100) {
      return res.status(400).json({ error: "Company name too long (max 100 characters)" });
    }
    return res.status(400).json({ error: "Company name is required" });
  }


  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const researchData = { company };

  try {
    const finalState = await runResearchAgent(
      company,
      (step, data, sources) => {
        researchData[step] = data;
        if (step === "verdict") {
          send("verdict", data);
        } else {
          send("step", { step, data, sources: sources || [] });
        }
      },
      (step, token) => {
        send("token", { step, token });
      },
      (step) => {
        send("step_start", { step });
      }
    );

    researchData.companyInfo    = finalState.companyInfo;
    researchData.financials     = finalState.financials;
    researchData.marketPosition = finalState.marketPosition;
    researchData.risks          = finalState.risks;
    researchData.verdict        = finalState.verdict;

    await saveResearch(researchData);
    send("done", { message: "Research complete" });
    res.end();
  } catch (err) {
    console.error("Research agent error:", err);
    send("error", { message: err.message || "Research failed" });
    res.end();
  }
});

app.get("/api/research/cached", async (req, res) => {
  const company = req.query.company?.trim();
  if (!company) return res.status(400).json({ error: "Company required" });
  try {
    const record = await getResearchByCompany(company);
    if (!record) return res.status(404).json({ error: "No cached result" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/history", async (req, res) => {
  try {
    const history = await getHistory();
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/history/:id", async (req, res) => {
  try {
    const record = await getResearchById(req.params.id);
    if (!record) return res.status(404).json({ error: "Not found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/history/:id", async (req, res) => {
  try {
    await deleteHistory(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
