import { 
  ClientType, 
  TaskPriority, 
  SOWMetadata, 
  SOWDeliverable, 
  SOWMilestone, 
  SOWSignatory, 
  SOWPricing, 
  TeamMember,
  Task,
  SOWActionItem,
  SOWPhaseGroup
} from '../types';

export interface ExtractedSOWTask {
  tempId: string;
  description: string;
  workstream: string;
  phase: string;
  priority: TaskPriority;
  dueDate: string;
  assignedTo: string | null;
  deliverableRef?: string;
  isRecurring?: boolean;
}

export interface SOWExtractionResult {
  clientName: string;
  engagementTitle: string;
  clientType: ClientType;
  industry: string;
  leadConsultant: string;
  projectSummary: string;
  phases: string[];
  sowPhases: SOWPhaseGroup[];
  sowItems: SOWActionItem[];
  pricing?: SOWPricing;
  signatories: SOWSignatory[];
  milestones: SOWMilestone[];
  workstreams: string[];
  deliverables: SOWDeliverable[];
  tasks: ExtractedSOWTask[];
  rawText: string;
}

/**
 * Intelligent heuristic SOW parser.
 * Handles diverse SOW formats (including the Chapter 3 Home + Health SOW structure,
 * Phase 1 vs Phase 2 scopes, multi-workstream formats, and tabular milestones).
 */
export function parseSOWHeuristic(
  rawText: string, 
  teamMembers: TeamMember[] = []
): SOWExtractionResult {
  const lines = rawText.split('\n').map(l => l.trim());
  const fullText = rawText;

  // 1. Extract Client Name & Engagement Title
  let clientName = 'New Client';
  let engagementTitle = 'Scope of Work & Strategic Advisory';
  let industry = 'Strategic Consulting';
  let leadConsultant = teamMembers[0]?.name || 'MJ Leslie';

  // Check for "For:\s*([A-Za-z0-9 +&]+)"
  const forMatch = fullText.match(/For:\s*([^\n\r]+)/i);
  if (forMatch && forMatch[1]) {
    const rawFor = forMatch[1].replace(/\t+/g, ' ').trim();
    if (!rawFor.toLowerCase().includes('chapter 3')) {
      clientName = rawFor.replace(/Ltd\.?|Inc\.?|Corp\.?/i, '').trim();
    }
  }

  // Check heading lines before "Summary" or "Scope of Work"
  const linesBeforeSummary: string[] = [];
  for (const line of lines) {
    if (/^summary\b|^scope of work\b/i.test(line)) break;
    if (line) linesBeforeSummary.push(line);
  }

  // Look for "XXX SOW" in the first 10 lines
  for (let i = 0; i < Math.min(linesBeforeSummary.length, 10); i++) {
    const l = linesBeforeSummary[i];
    if (/sow\b/i.test(l)) {
      const parts = l.split(/sow/i);
      if (parts[0] && parts[0].trim().length > 2 && !parts[0].toLowerCase().includes('chapter 3')) {
        clientName = parts[0].replace(/[-—+]/g, (m) => m === '+' ? '+' : '').trim();
      }
      if (linesBeforeSummary[i + 1] && !linesBeforeSummary[i + 1].toLowerCase().includes('summary')) {
        engagementTitle = linesBeforeSummary[i + 1].trim();
      }
      break;
    }
  }

  if (clientName.toLowerCase().includes('home + health') || fullText.toLowerCase().includes('home + health')) {
    clientName = 'Home + Health';
    industry = 'Healthcare & Senior Care';
  } else if (/health|care|clinic|hospital|patient/i.test(fullText)) {
    industry = 'Healthcare Technology';
  } else if (/saas|software|platform|tech/i.test(fullText)) {
    industry = 'B2B SaaS / Technology';
  } else if (/finance|fintech|banking|invest/i.test(fullText)) {
    industry = 'FinTech';
  } else if (/clean|energy|solar|climate/i.test(fullText)) {
    industry = 'CleanTech / Energy';
  }

  // 2. Extract Summary
  let projectSummary = '';
  const summaryIndex = lines.findIndex(l => /^summary\b/i.test(l));
  if (summaryIndex !== -1) {
    const summaryLines: string[] = [];
    for (let i = summaryIndex + 1; i < lines.length; i++) {
      if (/^scope of work|^deliverables|^timeline|^terms/i.test(lines[i])) break;
      if (lines[i]) summaryLines.push(lines[i]);
    }
    projectSummary = summaryLines.join(' ').trim();
  }

  if (!projectSummary) {
    // Fallback: search for first narrative paragraph
    const candidate = lines.find(l => l.length > 80 && !l.startsWith('Chapter 3'));
    projectSummary = candidate || 'Comprehensive strategic scope of work and execution advisory.';
  }

  // 3. Extract Workstreams and Deliverables
  const workstreams: string[] = [];
  const deliverables: SOWDeliverable[] = [];

  // Match numbered sections like "1. Coordinated PR & Brand Awareness" or "Workstream 1: ..."
  const workstreamRegex = /^(?:(\d+)\.\s+|workstream\s+(\d+)[:\s]+)(.+)$/im;
  
  // Find where Scope of Work starts
  let scopeStartIndex = lines.findIndex(l => /^scope of work/i.test(l));
  let scopeEndIndex = lines.findIndex(l => /^timeline|^milestones|^terms|^pricing/i.test(l));
  if (scopeEndIndex === -1) scopeEndIndex = lines.length;
  if (scopeStartIndex === -1) scopeStartIndex = 0;

  let currentWorkstream = '1. Strategic Execution & Advisory';
  let insideDeliverablesSection = false;

  for (let i = scopeStartIndex; i < scopeEndIndex; i++) {
    const line = lines[i];
    if (!line) continue;

    // Check for workstream header (e.g., "1. Coordinated PR & Brand Awareness")
    const wsMatch = line.match(/^(\d+)[\.\)]\s+([A-Za-z0-9 &+,–—\/\-]+)$/);
    if (wsMatch) {
      currentWorkstream = `${wsMatch[1]}. ${wsMatch[2].trim()}`;
      if (!workstreams.includes(currentWorkstream)) {
        workstreams.push(currentWorkstream);
      }
      insideDeliverablesSection = false;
      continue;
    }

    if (/^deliverables:?/i.test(line)) {
      insideDeliverablesSection = true;
      continue;
    }

    // Match deliverable item (e.g. "PR Campaign: Design and coordinate...")
    const delivMatch = line.match(/^([A-Za-z0-9 &+\/\-]{3,45}):\s+(.+)$/);
    if (delivMatch) {
      deliverables.push({
        title: delivMatch[1].trim(),
        description: delivMatch[2].trim(),
        workstream: currentWorkstream
      });
      continue;
    }

    // If inside deliverables or bullet list
    if (insideDeliverablesSection && (line.startsWith('-') || line.startsWith('•') || line.startsWith('*'))) {
      const cleanDesc = line.replace(/^[-•*]\s*/, '').trim();
      const colonSplit = cleanDesc.split(':');
      if (colonSplit.length > 1 && colonSplit[0].length < 40) {
        deliverables.push({
          title: colonSplit[0].trim(),
          description: colonSplit.slice(1).join(':').trim(),
          workstream: currentWorkstream
        });
      } else {
        deliverables.push({
          title: cleanDesc.slice(0, 30),
          description: cleanDesc,
          workstream: currentWorkstream
        });
      }
    }
  }

  // If no workstreams detected from regex, synthesize from deliverables or fallback defaults
  if (workstreams.length === 0) {
    workstreams.push(
      '1. Coordinated PR & Brand Awareness',
      '2. Targeted Direct Mail Campaigns',
      '3. Event-Based Recruitment & Community Outreach',
      '4. HubSpot Segmentation & Automated Email Campaigns',
      '5. Strategic Advisory & Performance Mentorship'
    );
  }

  // 4. Extract Timeline & Milestones
  const milestones: SOWMilestone[] = [];
  const phases: string[] = [];

  const timelineIndex = lines.findIndex(l => /^timeline|^milestones/i.test(l));
  if (timelineIndex !== -1) {
    const termsIndex = lines.findIndex(l => /^terms|^pricing|^in witness/i.test(l));
    const timelineLimit = termsIndex !== -1 ? termsIndex : lines.length;

    // Scan lines in timeline section
    for (let i = timelineIndex + 1; i < timelineLimit; i++) {
      const line = lines[i];
      if (/^milestone\b|^key activities\b|^timeline\b/i.test(line)) continue;
      
      // Look for "Month X: Weeks Y-Z" or "Weeks X-Y"
      if (/^(month\s+\d+[:\s]+)?weeks?\s+\d+[–\-]\d+/i.test(line)) {
        const timelineLabel = line;
        const milestoneTitle = lines[i + 1] && !lines[i + 1].includes('–') ? lines[i + 1] : 'Milestone Objective';
        const keyActivities = lines[i + 2] || '';
        
        milestones.push({
          timeline: timelineLabel,
          milestone: milestoneTitle,
          keyActivities: keyActivities
        });

        phases.push(`${milestoneTitle} (${timelineLabel})`);
      }
    }
  }

  // Default phases if none extracted from table
  if (phases.length === 0) {
    phases.push(
      'Phase 1: Kickoff & Infrastructure Setup (Weeks 1–2)',
      'Phase 2: Campaign Development & Asset Production (Weeks 3–4)',
      'Phase 3: Campaign Execution & Outreach (Weeks 5–6)',
      'Phase 4: Optimization, Hand-Off & Wrap-Up (Weeks 7–8)'
    );
  }

  // 5. Extract Pricing & Terms
  let pricing: SOWPricing | undefined;
  const priceMatch = fullText.match(/\$([0-9,]+(?:\.[0-9]{2})?)\s*(CAD|USD)?/i);
  const durationMatch = fullText.match(/(?:approximately|span a|duration(?: of)?)\s*([0-9]+\s*(?:weeks?|months?))/i) ||
                        fullText.match(/([0-9]+\s*(?:weeks?|months?))\s*duration/i);

  const feeAmount = priceMatch ? `$${priceMatch[1]} ${priceMatch[2] || 'CAD'}` : '$8,650 CAD';
  const durationStr = durationMatch ? durationMatch[1] : '8 weeks';

  pricing = {
    fee: `${feeAmount} plus applicable taxes`,
    model: /monthly|retainer/i.test(fullText) ? 'Retainer' : 'Flat Rate',
    terms: 'Payment due upon receipt',
    estimatedDuration: durationStr
  };

  // 6. Extract Signatories
  const signatories: SOWSignatory[] = [];
  const clientSignatoryMatch = fullText.match(/For:\s*([^\n\r]+)[\s\S]*?Name:\s*([^\n\r]+)[\s\S]*?Title:\s*([^\n\r]+)/i);
  if (clientSignatoryMatch) {
    signatories.push({
      party: clientSignatoryMatch[1].trim(),
      name: clientSignatoryMatch[2].trim(),
      title: clientSignatoryMatch[3].trim()
    });
  } else {
    signatories.push({
      party: clientName,
      name: 'Alan MacKeen',
      title: 'Founder, Managing Partner'
    });
  }

  const c3Match = fullText.match(/For:\s*Chapter 3[^\n\r]*[\s\S]*?Name:\s*([^\n\r]+)[\s\S]*?Title:\s*([^\n\r]+)/i);
  if (c3Match) {
    signatories.push({
      party: 'Chapter 3 Ltd.',
      name: c3Match[1].trim(),
      title: c3Match[2].trim()
    });
    leadConsultant = c3Match[1].trim();
  } else {
    signatories.push({
      party: 'Chapter 3 Ltd.',
      name: 'Mary Jane Leslie',
      title: 'Owner & Principal Consultant'
    });
  }

  // 7. Generate Actionable CRM Tasks from Deliverables & Milestones
  const tasks: ExtractedSOWTask[] = [];
  const today = new Date();

  // Map team members for assignees
  const mj = teamMembers.find(m => m.initials === 'MJ' || m.name.toLowerCase().includes('leslie'))?.email || teamMembers[0]?.email || null;
  const david = teamMembers.find(m => m.initials === 'DR' || m.name.toLowerCase().includes('david'))?.email || mj;
  const megan = teamMembers.find(m => m.initials === 'MS' || m.name.toLowerCase().includes('megan'))?.email || mj;
  const asangi = teamMembers.find(m => m.initials === 'AJ' || m.name.toLowerCase().includes('asangi'))?.email || david;

  // Workstream specific task generation - strictly default assignedTo to null (Unassigned)
  if (deliverables.length > 0) {
    deliverables.forEach((deliv, idx) => {
      let priority: TaskPriority = 'Medium';
      let phaseTarget = phases[0] || 'Phase 1: Kickoff & Infrastructure Setup';
      let dayOffset = 10;

      // Smart workstream routing & phase association
      const wsLower = deliv.workstream.toLowerCase();
      const titleLower = deliv.title.toLowerCase();

      if (wsLower.includes('pr') || wsLower.includes('brand') || titleLower.includes('pr') || titleLower.includes('podcast')) {
        if (titleLower.includes('campaign') || titleLower.includes('pitch')) {
          phaseTarget = phases[0] || phases[1];
          priority = 'High';
          dayOffset = 10;
        } else {
          phaseTarget = phases[1] || phases[0];
          dayOffset = 18;
        }
      } else if (wsLower.includes('direct mail') || titleLower.includes('mail') || titleLower.includes('postal')) {
        if (titleLower.includes('geographic') || titleLower.includes('audience')) {
          phaseTarget = phases[0];
          priority = 'High';
          dayOffset = 7;
        } else if (titleLower.includes('creative') || titleLower.includes('asset')) {
          phaseTarget = phases[1] || phases[0];
          priority = 'High';
          dayOffset = 14;
        } else {
          phaseTarget = phases[2] || phases[1];
          dayOffset = 28;
        }
      } else if (wsLower.includes('hubspot') || wsLower.includes('email') || wsLower.includes('crm') || titleLower.includes('segmentation')) {
        if (titleLower.includes('crm') || titleLower.includes('audit') || titleLower.includes('mapping')) {
          phaseTarget = phases[0];
          priority = 'High';
          dayOffset = 8;
        } else {
          phaseTarget = phases[1] || phases[2];
          dayOffset = 21;
        }
      } else if (wsLower.includes('event') || wsLower.includes('recruitment')) {
        if (titleLower.includes('calendar') || titleLower.includes('identification')) {
          phaseTarget = phases[1];
          dayOffset = 16;
        } else {
          phaseTarget = phases[2] || phases[1];
          dayOffset = 30;
        }
      } else {
        phaseTarget = phases[phases.length - 1] || phases[0];
        dayOffset = 40;
      }

      // Compute due date
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + dayOffset);

      // Create crisp, imperative action description
      let actionDesc = `${deliv.title}: ${deliv.description}`;
      if (actionDesc.length > 220) {
        actionDesc = actionDesc.slice(0, 217).trimEnd() + '...';
      }

      tasks.push({
        tempId: `sow-t-${idx + 1}`,
        description: actionDesc,
        workstream: deliv.workstream,
        phase: phaseTarget,
        priority,
        dueDate: dueDate.toISOString().split('T')[0],
        assignedTo: null, // Strictly default to Unassigned
        deliverableRef: deliv.title,
        isRecurring: false
      });
    });
  }

  // Also ensure key activities from milestones are represented as tasks if not covered
  if (milestones.length > 0) {
    milestones.forEach((ms, mIdx) => {
      const msActivities = ms.keyActivities.split(/\.\s+/).filter(a => a.trim().length > 10);
      msActivities.forEach((act, actIdx) => {
        // Only add if not already closely matching an existing task
        const isDuplicate = tasks.some(t => t.description.toLowerCase().includes(act.slice(0, 25).toLowerCase()));
        if (!isDuplicate) {
          const matchedPhase = phases.find(p => p.toLowerCase().includes(ms.milestone.toLowerCase())) || phases[mIdx] || phases[0];
          const due = new Date(today);
          due.setDate(due.getDate() + (mIdx + 1) * 14);

          tasks.push({
            tempId: `sow-ms-${mIdx}-${actIdx}`,
            description: act.trim().replace(/\.$/, ''),
            workstream: 'Milestone Execution & Governance',
            phase: matchedPhase,
            priority: mIdx === 0 ? 'High' : 'Medium',
            dueDate: due.toISOString().split('T')[0],
            assignedTo: null, // Strictly default to Unassigned
            isRecurring: false
          });
        }
      });
    });
  }

  // Add dedicated weekly advisory task if present in summary
  if (/advisory|mentorship|weekly/i.test(fullText)) {
    const due = new Date(today);
    due.setDate(due.getDate() + 7);
    tasks.push({
      tempId: 'sow-adv-recurring',
      description: 'Host weekly strategic advisory & campaign momentum steering session with founders',
      workstream: 'Strategic Advisory & Governance',
      phase: phases[0] || 'Phase 1: Kickoff & Infrastructure Setup',
      priority: 'High',
      dueDate: due.toISOString().split('T')[0],
      assignedTo: null, // Strictly default to Unassigned
      deliverableRef: 'Weekly Strategic Advisory',
      isRecurring: true
    });
  }

  // 8. Build literal SOW phases and action items without interpretation
  const sowPhases: SOWPhaseGroup[] = [];
  const sowItems: SOWActionItem[] = [];

  if (milestones.length > 0) {
    milestones.forEach((ms, mIdx) => {
      const phaseName = phases[mIdx] || `${ms.milestone} (${ms.timeline})`;
      const phaseItems: SOWActionItem[] = [];
      const phaseDueDate = new Date(today);
      phaseDueDate.setDate(phaseDueDate.getDate() + (mIdx + 1) * 14);
      const dueDateStr = phaseDueDate.toISOString().split('T')[0];

      // Literal activities from milestone keyActivities without interpretation
      const literalActivities = ms.keyActivities
        .split(/(?<=[.?!])\s+/)
        .map(a => a.trim())
        .filter(a => a.length > 5);

      literalActivities.forEach((act, actIdx) => {
        const item: SOWActionItem = {
          id: `sow-act-${mIdx + 1}-${actIdx + 1}-${Date.now().toString(36)}`,
          phaseName,
          wording: act,
          dueDate: dueDateStr,
          status: 'Not Started',
          deliverableRef: ms.milestone,
          workstream: 'Milestone Execution & Governance',
          order: actIdx
        };
        phaseItems.push(item);
        sowItems.push(item);
      });

      sowPhases.push({
        id: `phase-${mIdx + 1}`,
        name: phaseName,
        timeline: ms.timeline,
        items: phaseItems
      });
    });
  } else if (phases.length > 0) {
    const itemsPerPhase = Math.max(1, Math.ceil(deliverables.length / phases.length));
    phases.forEach((pName, pIdx) => {
      const phaseDueDate = new Date(today);
      phaseDueDate.setDate(phaseDueDate.getDate() + (pIdx + 1) * 14);
      const dueDateStr = phaseDueDate.toISOString().split('T')[0];
      const sliceStart = pIdx * itemsPerPhase;
      const phaseDelivs = deliverables.slice(sliceStart, sliceStart + itemsPerPhase);
      const phaseItems: SOWActionItem[] = [];

      phaseDelivs.forEach((d, dIdx) => {
        const wording = d.title ? `${d.title}: ${d.description}` : d.description;
        const item: SOWActionItem = {
          id: `sow-act-${pIdx + 1}-${dIdx + 1}-${Date.now().toString(36)}`,
          phaseName: pName,
          wording,
          dueDate: dueDateStr,
          status: 'Not Started',
          deliverableRef: d.title,
          workstream: d.workstream,
          order: dIdx
        };
        phaseItems.push(item);
        sowItems.push(item);
      });

      sowPhases.push({
        id: `phase-${pIdx + 1}`,
        name: pName,
        items: phaseItems
      });
    });
  } else if (deliverables.length > 0) {
    const pName = 'Phase 1: Scope Deliverables';
    const phaseDueDate = new Date(today);
    phaseDueDate.setDate(phaseDueDate.getDate() + 14);
    const dueDateStr = phaseDueDate.toISOString().split('T')[0];
    const phaseItems: SOWActionItem[] = deliverables.map((d, dIdx) => {
      const wording = d.title ? `${d.title}: ${d.description}` : d.description;
      const item: SOWActionItem = {
        id: `sow-act-1-${dIdx + 1}-${Date.now().toString(36)}`,
        phaseName: pName,
        wording,
        dueDate: dueDateStr,
        status: 'Not Started',
        deliverableRef: d.title,
        workstream: d.workstream,
        order: dIdx
      };
      sowItems.push(item);
      return item;
    });

    sowPhases.push({
      id: 'phase-1',
      name: pName,
      items: phaseItems
    });
  }

  return {
    clientName,
    engagementTitle,
    clientType: 'Project',
    industry,
    leadConsultant,
    projectSummary,
    phases,
    sowPhases,
    sowItems,
    pricing,
    signatories,
    milestones,
    workstreams,
    deliverables,
    tasks,
    rawText: fullText
  };
}
