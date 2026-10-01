export type Role = 'Admin' | 'User';

export type ClientType = 'Project' | 'Retainer' | 'Internal' | 'Prospecting';

export type ProspectingStage = 'Discovery' | 'Active Deal' | 'Quoted' | 'Won' | 'Lost';

export type ClientStatus = 'Active' | 'Inactive';

export type TaskPriority = 'High' | 'Medium' | 'Low' | 'Unassigned';

export type TaskStatus = 'Not Started' | 'In Progress' | 'Complete' | 'Cancelled';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  avatarColor: string;
  initials: string;
}

export interface TaskNote {
  id: string;
  authorEmail: string;
  authorName: string;
  text: string;
  timestamp: string;
}

export interface Task {
  id: string;
  clientId: string;
  description: string;
  assignedTo: string | null; // email of team member or null
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD
  status: TaskStatus;
  deliverableUrl?: string;
  notes: TaskNote[];
  isRecurring?: boolean;
  phase?: string; // e.g. "Phase 1: Discovery", "Phase 2: Strategy", etc.
  workstream?: string; // Workstream / Deliverable category from SOW (e.g. "Coordinated PR & Brand Awareness")
  sowDeliverableRef?: string;
  completedAt?: string | null;
  isArchivedFromFeed?: boolean; // When true, hidden from priority feed by EOD cleanup, preserved in client history
  createdAt?: string;
}

export interface SOWDeliverable {
  title: string;
  description: string;
  workstream: string;
}

export interface SOWMilestone {
  timeline: string; // e.g. "Month 1: Weeks 1–2"
  milestone: string; // e.g. "Project Kickoff & Infrastructure Setup"
  keyActivities: string;
}

export interface SOWSignatory {
  party: string; // "Chapter 3 Ltd." or "Home + Health"
  name: string;
  title: string;
  date?: string;
  signature?: string;
}

export interface SOWPricing {
  fee: string; // e.g. "$8,650 CAD plus applicable taxes"
  model: string; // "Flat Rate" | "Retainer" | "Hourly" | "Milestone"
  terms: string; // e.g. "Payment due upon receipt"
  estimatedDuration: string; // e.g. "8 weeks" / "2 months"
}

export interface SOWMetadata {
  id?: string;
  title: string; // e.g. "Home + Health SOW - Campaign Execution & Strategic Advisory"
  phaseTitle?: string; // e.g. "Phase 1: Launch & Acquisition"
  clientName: string;
  clientAddress?: string;
  providerName?: string;
  providerAddress?: string;
  summary: string;
  workstreams: string[];
  deliverables?: SOWDeliverable[];
  milestones?: SOWMilestone[];
  pricing?: SOWPricing;
  signatories?: SOWSignatory[];
  rawText?: string;
  uploadedAt?: string;
}

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  status: ClientStatus;
  projectSummary: string;
  industry?: string;
  leadConsultant?: string;
  startDate?: string;
  targetEndDate?: string;
  prospectingStage?: ProspectingStage;
  phases?: string[]; // Custom defined phases for SOW grouping
  tasks: Task[];
  sow?: SOWMetadata;
  sowHistory?: SOWMetadata[];
}

export type ClientCategoryFilter = 'All' | 'Project' | 'Retainer' | 'Internal' | 'Prospecting';
export type PriorityTasksFilter = 'all' | 'mine' | 'unassigned';
