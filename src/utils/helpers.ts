import { Client, Task, TaskPriority } from '../types';

export const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
  Unassigned: 0,
};

export function getProjectCompletionStats(client: Client) {
  const totalTasks = client.tasks.length;
  const completedTasks = client.tasks.filter(t => t.status === 'Complete').length;
  const percentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  
  return {
    totalTasks,
    completedTasks,
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

export function sortPriorityTasks(tasks: (Task & { clientName?: string; clientType?: string })[]): (Task & { clientName?: string; clientType?: string })[] {
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
