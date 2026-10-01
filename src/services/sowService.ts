import { 
  Client, 
  Task, 
  TaskPriority, 
  TeamMember, 
  SOWMetadata, 
  SOWDeliverable, 
  SOWMilestone, 
  SOWSignatory, 
  SOWPricing 
} from '../types';
import { parseSOWHeuristic, SOWExtractionResult, ExtractedSOWTask } from '../utils/sowParser';

export interface SOWExtractionResponse {
  success: boolean;
  mode: 'gemini' | 'heuristic' | 'fallback';
  data: SOWExtractionResult;
  warning?: string;
}

/**
 * Extracts and breaks down an SOW text into structured client metadata, phases, and actionable tasks.
 */
export async function extractSOW(
  sowText: string, 
  teamMembers: TeamMember[]
): Promise<SOWExtractionResponse> {
  const fallbackResult = parseSOWHeuristic(sowText, teamMembers);

  try {
    const res = await fetch('/api/gemini/extract-sow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sowText,
        teamMembers: teamMembers.map(m => ({ name: m.name, role: m.role, email: m.email }))
      })
    });

    if (!res.ok) {
      console.warn('Backend extract-sow HTTP error, falling back to heuristic engine:', res.statusText);
      return {
        success: true,
        mode: 'heuristic',
        data: fallbackResult
      };
    }

    const json = await res.json();
    if (json.mode === 'gemini' && json.extracted) {
      const ext = json.extracted;

      // Transform raw extracted tasks into ExtractedSOWTask format
      const today = new Date();
      const mappedTasks: ExtractedSOWTask[] = (ext.tasks || []).map((t: any, idx: number) => {
        const due = new Date(today);
        due.setDate(due.getDate() + (typeof t.dayOffset === 'number' ? t.dayOffset : 14));
        
        return {
          tempId: `gemini-t-${idx + 1}`,
          description: t.description || 'Deliverable Task',
          workstream: t.workstream || '1. Strategic Execution',
          phase: t.phase || (ext.phases && ext.phases[0]) || 'Phase 1: Project Kickoff',
          priority: (t.priority === 'High' || t.priority === 'Medium' || t.priority === 'Low') ? t.priority : 'Medium',
          dueDate: due.toISOString().split('T')[0],
          assignedTo: null, // Strictly default to Unassigned
          deliverableRef: t.deliverableRef,
          isRecurring: Boolean(t.isRecurring)
        };
      });

      const structuredResult: SOWExtractionResult = {
        clientName: ext.clientName || fallbackResult.clientName,
        engagementTitle: ext.engagementTitle || fallbackResult.engagementTitle,
        clientType: ext.clientType || 'Project',
        industry: ext.industry || fallbackResult.industry,
        leadConsultant: ext.leadConsultant || fallbackResult.leadConsultant,
        projectSummary: ext.projectSummary || fallbackResult.projectSummary,
        phases: (ext.phases && ext.phases.length > 0) ? ext.phases : fallbackResult.phases,
        pricing: ext.pricing || fallbackResult.pricing,
        signatories: (ext.signatories && ext.signatories.length > 0) ? ext.signatories : fallbackResult.signatories,
        milestones: (ext.milestones && ext.milestones.length > 0) ? ext.milestones : fallbackResult.milestones,
        workstreams: (ext.workstreams && ext.workstreams.length > 0) ? ext.workstreams : fallbackResult.workstreams,
        deliverables: (ext.deliverables && ext.deliverables.length > 0) ? ext.deliverables : fallbackResult.deliverables,
        tasks: mappedTasks.length > 0 ? mappedTasks : fallbackResult.tasks,
        rawText: sowText
      };

      return {
        success: true,
        mode: 'gemini',
        data: structuredResult
      };
    }

    return {
      success: true,
      mode: 'heuristic',
      data: fallbackResult
    };
  } catch (error: any) {
    console.warn('Network or Gemini parsing failure, utilizing client heuristic parser:', error);
    return {
      success: true,
      mode: 'fallback',
      data: fallbackResult,
      warning: error.message
    };
  }
}

/**
 * Builds a fresh new Client and Task records from an accepted SOW extraction result.
 */
export function buildClientFromSOW(
  result: SOWExtractionResult,
  customTasks?: ExtractedSOWTask[]
): { client: Client; tasks: Task[] } {
  const clientId = `c-${Date.now().toString(36)}`;
  const tasksToUse = customTasks || result.tasks;

  const sowMetadata: SOWMetadata = {
    id: `sow-${Date.now().toString(36)}`,
    title: result.engagementTitle,
    phaseTitle: result.phases[0] || 'Phase 1',
    clientName: result.clientName,
    summary: result.projectSummary,
    workstreams: result.workstreams,
    deliverables: result.deliverables,
    milestones: result.milestones,
    pricing: result.pricing,
    signatories: result.signatories,
    rawText: result.rawText,
    uploadedAt: new Date().toISOString()
  };

  const tasks: Task[] = tasksToUse.map((t, idx) => ({
    id: `t-${Date.now().toString(36)}-${idx}`,
    clientId,
    description: t.description,
    priority: t.priority,
    dueDate: t.dueDate,
    assignedTo: t.assignedTo,
    status: 'Not Started',
    phase: t.phase,
    workstream: t.workstream,
    sowDeliverableRef: t.deliverableRef,
    isRecurring: t.isRecurring,
    notes: [
      {
        id: `n-${Date.now().toString(36)}-${idx}`,
        authorEmail: 'sow-engine@chapter3.ca',
        authorName: 'Chapter 3 SOW Engine',
        text: `Extracted from SOW deliverable [${t.workstream}]. Target milestone: ${t.phase}.`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16)
      }
    ],
    createdAt: new Date().toISOString().split('T')[0]
  }));

  const client: Client = {
    id: clientId,
    name: result.clientName,
    type: result.clientType,
    status: 'Active',
    projectSummary: result.projectSummary,
    industry: result.industry,
    leadConsultant: result.leadConsultant,
    startDate: new Date().toISOString().split('T')[0],
    phases: result.phases,
    tasks,
    sow: sowMetadata,
    sowHistory: [sowMetadata]
  };

  return { client, tasks };
}

/**
 * Updates an existing Client by appending a new SOW phase and merging or adding new tasks.
 */
export function updateClientWithSOWPhase(
  existingClient: Client,
  result: SOWExtractionResult,
  customTasks?: ExtractedSOWTask[],
  phaseStrategy: 'append_phases' | 'replace_phases' = 'append_phases'
): Client {
  const tasksToUse = customTasks || result.tasks;

  const newSowMetadata: SOWMetadata = {
    id: `sow-${Date.now().toString(36)}`,
    title: result.engagementTitle,
    phaseTitle: result.phases[0] || 'New Phase',
    clientName: existingClient.name,
    summary: result.projectSummary,
    workstreams: result.workstreams,
    deliverables: result.deliverables,
    milestones: result.milestones,
    pricing: result.pricing,
    signatories: result.signatories,
    rawText: result.rawText,
    uploadedAt: new Date().toISOString()
  };

  const newTasks: Task[] = tasksToUse.map((t, idx) => ({
    id: `t-${Date.now().toString(36)}-${idx}`,
    clientId: existingClient.id,
    description: t.description,
    priority: t.priority,
    dueDate: t.dueDate,
    assignedTo: t.assignedTo,
    status: 'Not Started',
    phase: t.phase,
    workstream: t.workstream,
    sowDeliverableRef: t.deliverableRef,
    isRecurring: t.isRecurring,
    notes: [
      {
        id: `n-${Date.now().toString(36)}-${idx}`,
        authorEmail: 'sow-engine@chapter3.ca',
        authorName: 'Chapter 3 SOW Engine',
        text: `Added via SOW update [${result.engagementTitle}]. Workstream: ${t.workstream}.`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16)
      }
    ],
    createdAt: new Date().toISOString().split('T')[0]
  }));

  // Merge phases without duplicates
  let updatedPhases = existingClient.phases ? [...existingClient.phases] : [];
  if (phaseStrategy === 'replace_phases') {
    updatedPhases = result.phases;
  } else {
    for (const p of result.phases) {
      if (!updatedPhases.includes(p)) {
        updatedPhases.push(p);
      }
    }
  }

  // Prepend new tasks to existing tasks
  const updatedTasks = [...newTasks, ...existingClient.tasks];

  // Update sow history
  const previousHistory = existingClient.sowHistory || (existingClient.sow ? [existingClient.sow] : []);
  const updatedHistory = [newSowMetadata, ...previousHistory];

  return {
    ...existingClient,
    projectSummary: result.projectSummary || existingClient.projectSummary,
    phases: updatedPhases,
    tasks: updatedTasks,
    sow: newSowMetadata,
    sowHistory: updatedHistory
  };
}
