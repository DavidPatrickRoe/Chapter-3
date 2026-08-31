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

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error('Empty response from Gemini');
      }

      const parsed = JSON.parse(text);
      return res.json({ success: true, mode: 'gemini', analysis: parsed });
    } catch (error: any) {
      console.error('Error generating project analysis:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate AI analysis'
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
