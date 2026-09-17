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

  // Gemini AI Project Strategic Analysis endpoint
  app.post('/api/gemini/analyze-project', async (req, res) => {
    try {
      const { client, activeTasks, completedTasks, teamMembers } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          success: true,
          mode: 'heuristic',
          analysis: {
            executiveSummary: `Project "${client?.name || 'Client'}" is tracking across ${activeTasks?.length || 0} active deliverables and ${completedTasks?.length || 0} completed milestones.`,
            healthScore: Math.max(30, Math.min(95, 100 - (activeTasks?.filter((t: any) => t.priority === 'High').length || 0) * 15)),
            bottlenecks: activeTasks?.filter((t: any) => t.priority === 'High').map((t: any) => `High Priority: ${t.description} (Due: ${t.dueDate})`) || [],
            recommendations: [
              'Ensure high priority deliverable links are peer-reviewed before the upcoming milestone review.',
              'Balance assignee workload between marketing strategy and sales enablement workstreams.',
              'Schedule intermediate check-ins for retainer recurring deliverables.'
            ]
          }
        });
      }

      const ai = new GoogleGenAI({ apiKey });
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
  "healthStatus": "On Track" | "Attention Needed" | "Critical Risk",
  "keyStrengths": ["Strength 1", "Strength 2"],
  "bottlenecks": ["Bottleneck or high risk item 1", "Bottleneck 2"],
  "workloadAssessment": "1 sentence on team distribution and capacity",
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"]
}`;

      let responseText = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });
        responseText = response.text || '';
      } catch (err) {
        const fallbackRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });
        responseText = fallbackRes.text || '';
      }

      if (!responseText) {
        throw new Error('Empty response from Gemini');
      }

      const parsed = JSON.parse(responseText);
      return res.json({ success: true, mode: 'gemini', analysis: parsed });
    } catch (error: any) {
      console.error('Error generating project analysis:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate AI analysis'
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
      const apiKey = process.env.GEMINI_API_KEY;

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

      if (!apiKey) {
        return res.json({
          success: true,
          mode: 'heuristic',
          rewrittenText: heuristicRewrite(rawInput)
        });
      }

      const ai = new GoogleGenAI({ apiKey });
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
        textResponse = await callModelWithTimeout('gemini-3.1-flash-lite', 10000);
      } catch (primaryErr: any) {
        console.info('Flash-lite unavailable or timed out, trying gemini-3.8-flash:', primaryErr?.message || primaryErr);
        try {
          textResponse = await callModelWithTimeout('gemini-3.8-flash', 10000);
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
