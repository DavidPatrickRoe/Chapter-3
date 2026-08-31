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
  completedAt?: string | null;
  isArchivedFromFeed?: boolean; // When true, hidden from priority feed by EOD cleanup, preserved in client history
  createdAt?: string;
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
}

export type ClientCategoryFilter = 'All' | 'Project' | 'Retainer' | 'Internal' | 'Prospecting';
export type PriorityTasksFilter = 'all' | 'mine';
