import { Client, Task, TaskPriority } from '../types';

export const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
  Unassigned: 0,
};

export function getClientSOWPhases(client: Client) {
  if (client.sowPhases && client.sowPhases.length > 0) {
    return client.sowPhases;
  }
  if (client.sowItems && client.sowItems.length > 0) {
    const groups: Record<string, typeof client.sowItems> = {};
    client.sowItems.forEach(item => {
      const p = item.phaseName || 'Phase 1: Project Scope';
      if (!groups[p]) groups[p] = [];
      groups[p].push(item);
    });
    return Object.entries(groups).map(([name, items], idx) => ({
      id: `phase-${idx + 1}`,
      name,
      items
    }));
  }
  if (client.sow?.milestones && client.sow.milestones.length > 0) {
    return client.sow.milestones.map((ms, idx) => {
      const phaseName = client.phases?.[idx] || `${ms.milestone} (${ms.timeline})`;
      const acts = ms.keyActivities.split(/(?<=[.?!])\s+/).filter(a => a.trim().length > 5);
      const items = acts.map((act, aIdx) => ({
        id: `sow-legacy-ms-${idx}-${aIdx}`,
        phaseName,
        wording: act.trim(),
        dueDate: client.targetEndDate || '2026-10-31',
        status: 'Not Started' as const,
        deliverableRef: ms.milestone
      }));
      return {
        id: `phase-${idx + 1}`,
        name: phaseName,
        timeline: ms.timeline,
        items
      };
    });
  }
  if (client.sow?.deliverables && client.sow.deliverables.length > 0) {
    const phaseName = client.phases?.[0] || 'Phase 1: Scope Deliverables';
    const items = client.sow.deliverables.map((d, dIdx) => ({
      id: `sow-legacy-deliv-${dIdx}`,
      phaseName,
      wording: d.title ? `${d.title}: ${d.description}` : d.description,
      dueDate: client.targetEndDate || '2026-10-31',
      status: 'Not Started' as const,
      deliverableRef: d.title,
      workstream: d.workstream
    }));
    return [{
      id: 'phase-1',
      name: phaseName,
      items
    }];
  }
  return [];
}

export function getProjectCompletionStats(client: Client) {
  const sowItems = client.sowItems || (client.sowPhases ? client.sowPhases.flatMap(p => p.items) : []);
  if (sowItems.length > 0) {
    const totalTasks = sowItems.length;
    const completedTasks = sowItems.filter(i => i.status === 'Complete').length;
    const inProgressTasks = sowItems.filter(i => i.status === 'In Progress').length;
    const percentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      openTasks: totalTasks - completedTasks,
      percentage
    };
  }

  const totalTasks = client.tasks.length;
  const completedTasks = client.tasks.filter(t => t.status === 'Complete').length;
  const inProgressTasks = client.tasks.filter(t => t.status === 'In Progress').length;
  const percentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  
  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    openTasks: totalTasks - completedTasks,
    percentage
  };
}

export function getProgressBarColor(percentage: number): {
  bgClass: string;
  textClass: string;
  badgeClass: string;
  label: string;
} {
  if (percentage < 50) {
    return {
      bgClass: 'bg-rose-500',
      textClass: 'text-rose-600',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      label: 'Needs Acceleration'
    };
  } else if (percentage <= 75) {
    return {
      bgClass: 'bg-amber-500',
      textClass: 'text-amber-600',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      label: 'Progressing'
    };
  } else if (percentage < 100) {
    return {
      bgClass: 'bg-emerald-500',
      textClass: 'text-emerald-600',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: 'Near Completion'
    };
  } else {
    return {
      bgClass: 'bg-teal-600',
      textClass: 'text-teal-700',
      badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
      label: 'Delivered / Complete'
    };
  }
}

export function formatDate(dateString?: string): string {
  if (!dateString) return 'No date';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[monthIndex]} ${day}, ${year}`;
    }
    return dateString;
  } catch {
    return dateString;
  }
}

export function isOverdue(dueDateStr: string, status: string): boolean {
  if (status === 'Complete' || status === 'Cancelled') return false;
  if (!dueDateStr) return false;
  const today = new Date().toISOString().split('T')[0];
  return dueDateStr < today;
}

export function isDueToday(dueDateStr: string): boolean {
  if (!dueDateStr) return false;
  const today = new Date().toISOString().split('T')[0];
  return dueDateStr === today;
}

export function sortPriorityTasks<T extends Task>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    // 1. Strict Priority sorting: High (3) -> Medium (2) -> Low (1)
    const priorityDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // 2. Secondary sorting: Due Date ascending (earliest first)
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
}
