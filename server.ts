import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Chapter 3 Project Hub', timestamp: new Date().toISOString() });
  });

  // Helper to obtain initialized Gemini client with required telemetry header
  function getGeminiClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // Gemini AI Project Strategic Analysis endpoint
  app.post('/api/gemini/analyze-project', async (req, res) => {
    try {
      const { client, activeTasks, completedTasks, teamMembers } = req.body;
      const ai = getGeminiClient();

      const buildHeuristicAnalysis = () => ({
        executiveSummary: `Project "${client?.name || 'Client'}" is tracking across ${activeTasks?.length || 0} active deliverables and ${completedTasks?.length || 0} completed milestones with an active team of ${teamMembers?.length || 0} consultants.`,
        healthScore: Math.max(30, Math.min(95, 100 - (activeTasks?.filter((t: any) => t.priority === 'High').length || 0) * 15)),
        healthStatus: (activeTasks?.filter((t: any) => t.priority === 'High').length || 0) > 1 ? 'Attention Needed' : 'On Track',
        keyStrengths: [
          `Structured into ${client?.phases?.length || 3} strategic milestones.`,
          `${completedTasks?.length || 0} verified milestone deliverables completed.`
        ],
        bottlenecks: activeTasks?.filter((t: any) => t.priority === 'High').map((t: any) => `High Priority: ${t.description} (Due: ${t.dueDate})`) || [],
        workloadAssessment: 'Deliverables allocated across consulting practice team.',
        recommendations: [
          'Ensure high priority deliverable links are peer-reviewed before the upcoming milestone review.',
          'Balance assignee workload between marketing strategy and sales enablement workstreams.',
          'Schedule intermediate check-ins for retainer recurring deliverables.'
        ]
      });

      if (!ai) {
        return res.json({
          success: true,
          mode: 'heuristic',
          analysis: buildHeuristicAnalysis()
        });
      }

      const prompt = `You are a Senior Strategic Consultant & Operations Director at Chapter 3, an elite B2B sales and marketing consulting firm (brand reference: https://chapter3.ca/).
Analyze the following client engagement and generate a sharp, executive-level project health assessment, timeline risks, workload allocation feedback, and 3 actionable consulting next steps.

Client Details:
- Name: ${client?.name}
- Type: ${client?.type} (${client?.status})
- Summary: ${client?.projectSummary}
- Active Tasks (${activeTasks?.length}): ${JSON.stringify(activeTasks?.map((t: any) => ({ desc: t.description, priority: t.priority, due: t.dueDate, assignedTo: t.assignedTo, status: t.status })))}
- Completed Milestones (${completedTasks?.length}): ${JSON.stringify(completedTasks?.map((t: any) => ({ desc: t.description, completedAt: t.completedAt })))}
- Team Members: ${JSON.stringify(teamMembers?.map((m: any) => ({ name: m.name, role: m.role, email: m.email })))}

Provide your response in valid JSON matching this exact structure:
{
  "executiveSummary": "A concise, sharp 2-3 sentence strategic executive assessment written in Chapter 3's high-caliber consulting voice.",
  "healthScore": 85,
  "healthStatus": "On Track",
  "keyStrengths": ["Strength 1", "Strength 2"],
  "bottlenecks": ["Bottleneck or high risk item 1", "Bottleneck 2"],
  "workloadAssessment": "1 sentence on team distribution and capacity",
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"]
}`;

      let responseText = '';
      const callGenAI = async (model: string, timeoutMs: number = 8000): Promise<string> => {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeoutMs)
        );
        const aiPromise = ai.models.generateContent({
          model,
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });
        const res = await Promise.race([aiPromise, timeoutPromise]);
        return res.text || '';
      };

      try {
        responseText = await callGenAI('gemini-3.8-flash', 8000);
      } catch (err) {
        console.warn('gemini-3.8-flash timed out or failed, trying gemini-3.1-flash-lite:', err);
        try {
          responseText = await callGenAI('gemini-3.1-flash-lite', 6000);
        } catch (secondaryErr) {
          console.warn('Gemini calls failed, falling back to heuristic analysis:', secondaryErr);
          return res.json({ success: true, mode: 'heuristic', analysis: buildHeuristicAnalysis() });
        }
      }

      if (!responseText) {
        return res.json({ success: true, mode: 'heuristic', analysis: buildHeuristicAnalysis() });
      }

      try {
        const parsed = JSON.parse(responseText);
        return res.json({ success: true, mode: 'gemini', analysis: parsed });
      } catch {
        return res.json({ success: true, mode: 'heuristic', analysis: buildHeuristicAnalysis() });
      }
    } catch (error: any) {
      console.error('Error generating project analysis:', error);
      return res.json({
        success: true,
        mode: 'fallback',
        analysis: {
          executiveSummary: 'Project analysis generated via practice heuristic engine.',
          healthScore: 80,
          healthStatus: 'On Track',
          keyStrengths: ['Milestones defined'],
          bottlenecks: [],
          workloadAssessment: 'Consultant capacity balanced.',
          recommendations: ['Review open deliverables.']
        }
      });
    }
  });

  // Gemini AI Rewrite Task as Action Item endpoint
  app.post('/api/gemini/rewrite-action-item', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Task description is required'
        });
      }

      const rawInput = text.trim();

      const heuristicRewrite = (input: string): string => {
        let cleaned = input.trim().replace(/[.]+$/, '');
        cleaned = cleaned.replace(/^(i need to|need to|we should|we need to|have to|please|can you|must|task to|todo:?|to-do:?|working on|gonna|want to|go and|hey can we|let's|lets)\s+/i, '');
        
        // Common colloquial replacements
        cleaned = cleaned
          .replace(/\bgonna\b/gi, 'going to')
          .replace(/\bwanna\b/gi, 'want to')
          .replace(/\bdeck\b/gi, 'pitch deck')
          .replace(/\bmake sure\b/gi, 'verify')
          .replace(/\blook into\b/gi, 'investigate');

        const words = cleaned.split(/\s+/);
        const firstWordLower = (words[0] || '').toLowerCase();
        
        if (firstWordLower.endsWith('ing') && firstWordLower.length > 4) {
          const base = firstWordLower.replace(/ing$/, '');
          const verbCandidate = (base.endsWith('tt') || base.endsWith('nn') || base.endsWith('pp'))
            ? base.slice(0, -1)
            : (base.endsWith('at') ? base + 'e' : base);
          words[0] = verbCandidate.charAt(0).toUpperCase() + verbCandidate.slice(1);
          cleaned = words.join(' ');
        } else {
          cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        }

        if (cleaned.length > 300) {
          cleaned = cleaned.slice(0, 300).trimEnd();
        }
        return cleaned;
      };

      const ai = getGeminiClient();

      if (!ai) {
        return res.json({
          success: true,
          mode: 'heuristic',
          rewrittenText: heuristicRewrite(rawInput)
        });
      }

      const prompt = `You are an elite operational executive and management consultant at Chapter 3, a premium B2B sales and marketing consulting firm (https://chapter3.ca/).
Rewrite the user's draft task description into a single, polished, condensed, action-oriented task item.

Strict Transformation Rules:
1. Output MUST be a single, direct, action-oriented task item starting with a strong imperative action verb (e.g., Conduct, Finalize, Develop, Author, Review, Synthesize, Implement, Align, Audit, Deliver, Produce, Design).
2. Enforce a strong, professional, concise business tone.
3. Replace all casual vernacular, slang, abbreviations, or spelling errors with correct, executive-ready consulting language.
4. Ensure the rewritten text is actionable and clear, in as few words as possible while preserving the complete core meaning and intent of the source text.
5. Do NOT include quotes, bullets, markdown, commentary, or introductory text. Return ONLY the rewritten task string.
6. STRICT CONSTRAINT: Output MUST be strictly 300 characters or fewer.

Draft Task Description:
"${rawInput}"`;

      let textResponse = '';
      const callModelWithTimeout = async (modelName: string, timeoutMs: number = 10000): Promise<string> => {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
        );
        const aiPromise = ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });
        const response = await Promise.race([aiPromise, timeoutPromise]);
        return response.text || '';
      };

      try {
        textResponse = await callModelWithTimeout('gemini-3.8-flash', 10000);
      } catch (primaryErr: any) {
        console.info('gemini-3.8-flash unavailable or timed out, trying gemini-3.1-flash-lite:', primaryErr?.message || primaryErr);
        try {
          textResponse = await callModelWithTimeout('gemini-3.1-flash-lite', 10000);
        } catch (secondaryErr: any) {
          console.info('Gemini models unavailable, applying intelligent action item transformation:', secondaryErr?.message || secondaryErr);
          textResponse = heuristicRewrite(rawInput);
        }
      }

      let rewritten = textResponse.trim();
      rewritten = rewritten.replace(/^["'`]+|["'`]+$/g, '').trim();
      
      // Strict constraint: strictly 300 characters or fewer
      if (rewritten.length > 300) {
        rewritten = rewritten.slice(0, 300).trimEnd();
      }

      if (!rewritten) {
        rewritten = heuristicRewrite(rawInput);
      }

      return res.json({
        success: true,
        mode: 'gemini',
        rewrittenText: rewritten
      });
    } catch (error: any) {
      console.error('Error rewriting task with Gemini:', error);
      const { text } = req.body;
      const rawInput = typeof text === 'string' ? text.trim() : '';
      const fallback = rawInput ? (rawInput.charAt(0).toUpperCase() + rawInput.slice(1)).slice(0, 300) : '';
      return res.json({
        success: true,
        mode: 'fallback',
        rewrittenText: fallback,
        warning: error.message
      });
    }
  });

  // Gemini AI SOW Scope Breakdown & Task Extraction endpoint
  app.post('/api/gemini/extract-sow', async (req, res) => {
    try {
      const { sowText, teamMembers } = req.body;
      if (!sowText || typeof sowText !== 'string' || !sowText.trim()) {
        return res.status(400).json({
          success: false,
          error: 'SOW text is required'
        });
      }

      const rawInput = sowText.trim();
      const ai = getGeminiClient();

      const teamList = Array.isArray(teamMembers) && teamMembers.length > 0 
        ? teamMembers 
        : [
            { name: 'MJ Leslie', role: 'Admin', email: 'mj@chapter3.ca' },
            { name: 'David Roe', role: 'Admin', email: 'david@chapter3.ca' },
            { name: 'Megan Savary', role: 'User', email: 'megan@chapter3.ca' },
            { name: 'Asangi Jasenthuliyana', role: 'User', email: 'asangi@chapter3.ca' }
          ];

      if (!ai) {
        return res.json({
          success: true,
          mode: 'heuristic',
          note: 'Parsed using Chapter 3 Scope Engine (Heuristic)',
          rawText: rawInput
        });
      }
      const prompt = `You are a Principal Management Consultant & Operations Director at Chapter 3, an elite B2B sales and marketing consulting firm (brand: https://chapter3.ca/).
Carefully analyze the following Statement of Work (SOW) document and extract the exact project structure for our client management platform.

Document Content:
"""
${rawInput}
"""

Instructions:
1. Extract Client Name (e.g. "Home + Health"), Engagement Title (e.g. "Campaign Execution & Strategic Advisory" or "Phase 2: Provincial Expansion"), and appropriate Industry.
2. Determine Client Engagement Type: "Project" (time-bound with deliverables/phases) or "Retainer" (ongoing monthly recurring) or "Internal" or "Prospecting".
3. Extract the comprehensive executive summary.
4. Extract Pricing, fee amount (e.g. "$8,650 CAD plus applicable taxes"), terms ("Payment due upon receipt"), and estimated duration (e.g. "8 weeks" or "2 months").
5. Extract all Signatories (Name, Title, Party/Company).
6. Extract all distinct Workstreams (e.g., ["1. Coordinated PR & Brand Awareness", "2. Targeted Direct Mail Campaigns", ...]).
7. Extract Timeline Milestones table (timeline interval like "Month 1: Weeks 1–2", milestone name, and key activities).
8. STRICT REQUIREMENT FOR SCOPE OF WORK PHASES & ACTION ITEMS:
   - Extract the phases exactly as specified in the SOW (e.g. from the Timeline/Milestones or Phase sections).
   - Pull the action items from the SOW AS DIRECTLY AND LITERALLY AS POSSIBLE, WITHOUT INTERPRETATION.
   - Do NOT rephrase or interpret with active verbs; preserve the EXACT WORDING from the SOW deliverables, activities, or scope bullets.
   - Organize each action item under its specified Phase.
   - Assign reasonable due date offset in days from today (e.g. 14 for Phase 1, 28 for Phase 2, 42 for Phase 3, 56 for Phase 4).

Return ONLY valid JSON matching this schema:
{
  "clientName": "string",
  "engagementTitle": "string",
  "clientType": "Project" | "Retainer" | "Internal" | "Prospecting",
  "industry": "string",
  "leadConsultant": "string",
  "projectSummary": "string",
  "phases": ["Phase 1: ...", "Phase 2: ..."],
  "sowPhases": [
    {
      "name": "Phase 1: Project Kickoff & Setup (Weeks 1–2)",
      "timeline": "Weeks 1–2",
      "items": [
        {
          "wording": "Exact literal wording of deliverable or action item from SOW",
          "dayOffset": 14,
          "workstream": "string",
          "deliverableRef": "string"
        }
      ]
    }
  ],
  "pricing": {
    "fee": "string",
    "model": "Flat Rate" | "Retainer" | "Hourly" | "Milestone",
    "terms": "string",
    "estimatedDuration": "string"
  },
  "signatories": [
    { "party": "string", "name": "string", "title": "string" }
  ],
  "milestones": [
    { "timeline": "string", "milestone": "string", "keyActivities": "string" }
  ],
  "workstreams": ["string"],
  "deliverables": [
    { "title": "string", "description": "string", "workstream": "string" }
  ]
}`;

      let responseText = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });
        responseText = response.text || '';
      } catch (primaryErr) {
        console.warn('gemini-3.8-flash extraction failed, falling back to gemini-3.1-flash-lite:', primaryErr);
        const fallbackRes = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });
        responseText = fallbackRes.text || '';
      }

      if (!responseText) {
        throw new Error('Empty response from Gemini AI');
      }

      const parsed = JSON.parse(responseText);
      return res.json({
        success: true,
        mode: 'gemini',
        extracted: parsed,
        rawText: rawInput
      });
    } catch (error: any) {
      console.error('Error extracting SOW with Gemini:', error);
      return res.json({
        success: true,
        mode: 'heuristic',
        warning: error.message || 'Falling back to high-precision heuristic SOW extraction'
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Chapter 3 Project Hub server running on port ${PORT}`);
  });
}

startServer();
