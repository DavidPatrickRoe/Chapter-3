import React, { useState } from 'react';
import { 
  Users, 
  UserCheck, 
  HelpCircle, 
  Archive, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  MessageSquare, 
  Send, 
  ChevronDown, 
  ChevronUp, 
  Link as LinkIcon, 
  RotateCcw,
  Search,
  X
} from 'lucide-react';
import { Client, Task, TaskPriority, TaskStatus, TeamMember, PriorityTasksFilter } from '../types';
import { sortPriorityTasks, formatDate, isOverdue, isDueToday } from '../utils/helpers';

interface PriorityTasksFeedProps {
  clients: Client[];
  currentUser: TeamMember;
  teamMembers: TeamMember[];
  showInactive?: boolean;
  onToggleShowInactive?: (show: boolean) => void;
  onUpdateTaskStatus: (clientId: string, taskId: string, status: TaskStatus) => void;
  onUpdateTaskAssignee: (clientId: string, taskId: string, assigneeEmail: string | null) => void;
  onAddNote: (clientId: string, taskId: string, text: string) => void;
  onUpdateDeliverableUrl: (clientId: string, taskId: string, url: string) => void;
  onRunEndOfDayCleanup: () => void;
  onSelectClient: (client: Client) => void;
}

export const PriorityTasksFeed: React.FC<PriorityTasksFeedProps> = ({
  clients,
  currentUser,
  teamMembers,
  showInactive = false,
  onToggleShowInactive,
  onUpdateTaskStatus,
  onUpdateTaskAssignee,
  onAddNote,
  onUpdateDeliverableUrl,
  onRunEndOfDayCleanup,
  onSelectClient
}) => {
  const isArchiveMode = showInactive === true;
  const [filterMode, setFilterMode] = useState<PriorityTasksFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedNotesTaskId, setExpandedNotesTaskId] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [editingDeliverableTaskId, setEditingDeliverableTaskId] = useState<string | null>(null);
  const [deliverableInput, setDeliverableInput] = useState<string>('');
  const [cleanupSuccessMessage, setCleanupSuccessMessage] = useState<string | null>(null);

  // Compute counts for Active vs Archived deliverables queues
  const activeTasksCount = clients
    .filter(c => c.status === 'Active')
    .reduce((acc, c) => acc + c.tasks.filter(t => !t.isArchivedFromFeed && (t.assignedTo || (t.status !== 'Complete' && t.status !== 'Cancelled'))).length, 0);

  // Archived deliverables include: all tasks from archived clients PLUS cleaned-up tasks from active clients
  const archivedTasksCount = clients.reduce((acc, c) => {
    if (c.status === 'Inactive') {
      return acc + c.tasks.length;
    }
    return acc + c.tasks.filter(t => t.isArchivedFromFeed).length;
  }, 0);

  type FeedTaskItem = Task & {
    clientName: string;
    clientType: string;
    clientStatus: string;
    isCleanedUpFromActive?: boolean;
  };

  // Gather tasks strictly separated:
  // Active engagements queue: ONLY active clients and un-cleaned-up deliverables
  // Archive queue: ALL tasks from archived clients PLUS all cleaned-up tasks from active clients
  const allTasks: FeedTaskItem[] = [];
  const allAssignedTasks: FeedTaskItem[] = [];
  const allUnassignedTasks: FeedTaskItem[] = [];

  clients.forEach(client => {
    const isClientArchived = client.status === 'Inactive';

    client.tasks.forEach(task => {
      const isTaskArchived = isClientArchived || Boolean(task.isArchivedFromFeed);

      if (isArchiveMode) {
        // In Archive mode: ONLY show archived tasks (either from archived clients, or cleaned up tasks from active clients)
        if (!isTaskArchived) return;
      } else {
        // In Active mode: ONLY show active, non-archived tasks from active clients
        if (isTaskArchived) return;
      }

      const taskWithClient: FeedTaskItem = {
        ...task,
        clientName: client.name,
        clientType: client.type,
        clientStatus: client.status,
        isCleanedUpFromActive: !isClientArchived && Boolean(task.isArchivedFromFeed)
      };

      if (isArchiveMode) {
        // In archive view, gather all archived and cleaned up tasks
        allTasks.push(taskWithClient);
        if (task.assignedTo) {
          allAssignedTasks.push(taskWithClient);
        } else {
          allUnassignedTasks.push(taskWithClient);
        }
      } else {
        // In active view:
        if (task.assignedTo) {
          allAssignedTasks.push(taskWithClient);
          allTasks.push(taskWithClient);
        } else if (task.status !== 'Complete' && task.status !== 'Cancelled') {
          allUnassignedTasks.push(taskWithClient);
          allTasks.push(taskWithClient);
        }
      }
    });
  });

  // Filter selection: 'all' shows all tasks, 'assigned' shows tasks assigned to anyone, 'mine' shows currentUser's tasks, 'unassigned' shows unassigned
  const baseFilteredTasks = filterMode === 'unassigned'
    ? allUnassignedTasks
    : filterMode === 'assigned'
    ? allAssignedTasks
    : filterMode === 'mine'
    ? allAssignedTasks.filter(task => task.assignedTo === currentUser.email)
    : allTasks;

  // Text search filter placed directly to the right of filter buttons
  const filteredTasks = baseFilteredTasks.filter(task => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchDesc = task.description.toLowerCase().includes(q);
    const matchClient = task.clientName.toLowerCase().includes(q);
    const matchWorkstream = task.workstream?.toLowerCase().includes(q);
    const matchPhase = task.phase?.toLowerCase().includes(q);
    const matchDeliverable = task.deliverableUrl?.toLowerCase().includes(q);
    const matchAssignee = teamMembers.find(m => m.email === task.assignedTo)?.name.toLowerCase().includes(q);
    const matchNotes = task.notes?.some(n => n.text.toLowerCase().includes(q) || n.authorName.toLowerCase().includes(q));
    return matchDesc || matchClient || matchWorkstream || matchPhase || matchDeliverable || matchAssignee || matchNotes;
  });

  // Priority sort
  const sortedTasks = sortPriorityTasks(filteredTasks);

  const cleanupCandidates = filteredTasks.filter(t => t.status === 'Complete' || t.status === 'Cancelled');

  const handleCleanupClick = () => {
    onRunEndOfDayCleanup();
    setCleanupSuccessMessage(`Cleaned up ${cleanupCandidates.length} finished task(s). Archived to client records.`);
    setTimeout(() => setCleanupSuccessMessage(null), 3500);
  };

  const handleAddNoteSubmit = (clientId: string, taskId: string) => {
    const text = (noteInputs[taskId] || '').trim();
    if (!text) return;
    onAddNote(clientId, taskId, text);
    setNoteInputs(prev => ({ ...prev, [taskId]: '' }));
  };

  const handleSaveDeliverable = (clientId: string, taskId: string) => {
    onUpdateDeliverableUrl(clientId, taskId, deliverableInput.trim());
    setEditingDeliverableTaskId(null);
    setDeliverableInput('');
  };

  // Category-matched light shading for Deliverables Queue cards
  const getDeliverableCategoryStyles = (category?: string) => {
    switch (category) {
      case 'Project':
        return {
          cardBg: 'bg-blue-100/75 hover:bg-blue-100/95',
          border: 'border-blue-300/80 hover:border-blue-400',
          dotClass: 'bg-blue-600',
          badge: 'bg-blue-200/80 text-blue-950 border-blue-300',
          hoverText: 'hover:text-blue-900',
          dividerClass: 'border-blue-200/80',
          inputBg: 'bg-white/95 border-blue-300/70',
        };
      case 'Retainer':
        return {
          cardBg: 'bg-purple-100/75 hover:bg-purple-100/95',
          border: 'border-purple-300/80 hover:border-purple-400',
          dotClass: 'bg-purple-600',
          badge: 'bg-purple-200/80 text-purple-950 border-purple-300',
          hoverText: 'hover:text-purple-900',
          dividerClass: 'border-purple-200/80',
          inputBg: 'bg-white/95 border-purple-300/70',
        };
      case 'Internal':
        return {
          cardBg: 'bg-emerald-100/75 hover:bg-emerald-100/95',
          border: 'border-emerald-300/80 hover:border-emerald-400',
          dotClass: 'bg-emerald-600',
          badge: 'bg-emerald-200/80 text-emerald-950 border-emerald-300',
          hoverText: 'hover:text-emerald-900',
          dividerClass: 'border-emerald-200/80',
          inputBg: 'bg-white/95 border-emerald-300/70',
        };
      case 'Prospecting':
        return {
          cardBg: 'bg-orange-100/75 hover:bg-orange-100/95',
          border: 'border-orange-300/80 hover:border-orange-400',
          dotClass: 'bg-orange-600',
          badge: 'bg-orange-200/80 text-orange-950 border-orange-300',
          hoverText: 'hover:text-orange-900',
          dividerClass: 'border-orange-200/80',
          inputBg: 'bg-white/95 border-orange-300/70',
        };
      default:
        return {
          cardBg: 'bg-stone-50/60 hover:bg-stone-50/90',
          border: 'border-stone-200 hover:border-stone-300',
          dotClass: 'bg-stone-500',
          badge: 'bg-stone-100 text-stone-800 border-stone-200',
          hoverText: 'hover:text-stone-900',
          dividerClass: 'border-stone-200/60',
          inputBg: 'bg-white border-stone-200',
        };
    }
  };

  return (
    <div className="bg-stone-100/60 rounded-3xl p-5 border border-stone-200/80 shadow-2xs flex flex-col h-full">
      
      {/* Header of Feed */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="font-serif text-lg font-normal text-stone-950 tracking-tight">
              {isArchiveMode ? 'Archived Deliverables Queue' : 'Deliverables Queue'}
            </h2>
            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border font-semibold ${
              isArchiveMode
                ? 'bg-amber-100 text-amber-950 border-amber-300'
                : 'bg-stone-200 text-stone-800 border-stone-300'
            }`}>
              {isArchiveMode ? 'Archive' : 'Engagements'}
            </span>
            <span className="font-mono text-xs text-stone-600 tabular-nums">
              ({sortedTasks.length})
            </span>
          </div>
          <p className="text-xs text-stone-600 mt-0.5">
            {isArchiveMode
              ? 'Deliverables and workstreams from archived client accounts'
              : 'Ranked priority queue for active consulting deliverables'}
          </p>
        </div>

        {/* View Switcher: Active Engagements vs Archive Queue */}
        {onToggleShowInactive && (
          <div className="flex items-center space-x-1 bg-stone-200/70 p-1 rounded-xl text-xs font-medium shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onToggleShowInactive(false)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium ${
                !isArchiveMode
                  ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                  : 'text-stone-600 hover:text-stone-950'
              }`}
              title="Switch to Active Engagements Deliverables Queue"
            >
              Active ({activeTasksCount})
            </button>
            <button
              type="button"
              onClick={() => onToggleShowInactive(true)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium flex items-center space-x-1 ${
                isArchiveMode
                  ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                  : 'text-stone-600 hover:text-stone-950'
              }`}
              title="Switch to Archived Deliverables Queue"
            >
              <Archive className="w-3 h-3 text-stone-500" />
              <span>Archive ({archivedTasksCount})</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter & Search Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 pb-1">
        
        {/* Left cluster: Filter buttons + Search placed directly to the right */}
        <div className="flex items-center space-x-2 flex-1 min-w-0 flex-wrap sm:flex-nowrap gap-y-2">
          {/* Segmented Filter Buttons */}
          <div className="bg-white p-0.5 rounded-xl border border-stone-200 shadow-2xs flex items-center text-xs shrink-0">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium ${
                filterMode === 'all'
                  ? 'bg-stone-900 text-white font-semibold'
                  : 'text-stone-600 hover:text-stone-950'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('assigned')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium ${
                filterMode === 'assigned'
                  ? 'bg-stone-900 text-white font-semibold'
                  : 'text-stone-600 hover:text-stone-950'
              }`}
            >
              All Assigned
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('mine')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium ${
                filterMode === 'mine'
                  ? 'bg-stone-900 text-white font-semibold'
                  : 'text-stone-600 hover:text-stone-950'
              }`}
            >
              My Tasks
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('unassigned')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium flex items-center space-x-1 ${
                filterMode === 'unassigned'
                  ? 'bg-amber-800 text-white font-semibold'
                  : 'text-stone-600 hover:text-stone-950'
              }`}
            >
              <span>Unassigned</span>
              {allUnassignedTasks.length > 0 && (
                <span className="font-mono text-[10px] tabular-nums font-bold">
                  ({allUnassignedTasks.length})
                </span>
              )}
            </button>
          </div>

          {/* Search Box Placed Directly to the Right of Filter Buttons */}
          <div className="relative flex-1 min-w-[130px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search deliverables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-xl pl-8 pr-7 py-1 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* End-of-Day Cleanup: Only on active engagements queue */}
        {!isArchiveMode && (
          <button
            type="button"
            onClick={handleCleanupClick}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-950 border border-stone-200 rounded-xl text-xs font-medium transition-all shadow-2xs cursor-pointer active:scale-[0.98] shrink-0 self-start sm:self-auto"
            title="Archive finished tasks out of the live queue"
          >
            <Archive className="w-3.5 h-3.5 text-stone-400" />
            <span>Cleanup</span>
            {cleanupCandidates.length > 0 && (
              <span className="font-mono text-[10px] text-stone-500 tabular-nums">
                ({cleanupCandidates.length})
              </span>
            )}
          </button>
        )}
      </div>

      {/* Success Notification */}
      {cleanupSuccessMessage && (
        <div className="mt-3 p-3 bg-stone-900 text-stone-100 rounded-xl text-xs flex items-center justify-between animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{cleanupSuccessMessage}</span>
          </div>
          <button onClick={() => setCleanupSuccessMessage(null)} className="text-stone-400 hover:text-white font-bold px-1">×</button>
        </div>
      )}

      {/* Feed List Container */}
      <div className="mt-3 space-y-2.5 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
        {sortedTasks.length === 0 ? (
          searchQuery.trim() ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-stone-200">
              <Search className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <h4 className="text-xs font-semibold text-stone-800">No deliverables matched "{searchQuery}"</h4>
              <p className="text-[11px] text-stone-500 max-w-xs mx-auto mt-0.5">
                Try searching for different keywords, client names, or assignees.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs rounded-lg font-medium transition-colors cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-stone-200">
              <CheckCircle2 className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <h4 className="text-xs font-semibold text-stone-800">
                {isArchiveMode ? 'Archive Queue is Clear' : 'Queue is Clear'}
              </h4>
              <p className="text-[11px] text-stone-500 max-w-xs mx-auto mt-0.5">
                {isArchiveMode
                  ? 'No deliverables found for archived accounts or cleaned-up tasks.'
                  : filterMode === 'mine'
                  ? `No pending deliverables assigned to ${currentUser.name}.`
                  : filterMode === 'assigned'
                  ? 'No deliverables currently assigned to team members.'
                  : filterMode === 'unassigned'
                  ? 'No unassigned deliverables. All active tasks have an assignee!'
                  : 'All tasks are completed, or no deliverables are currently open.'}
              </p>
            </div>
          )
        ) : (
          sortedTasks.map((task) => {
            const isCompleted = task.status === 'Complete';
            const isCancelled = task.status === 'Cancelled';
            const isFinishedWorkday = isCompleted || isCancelled;
            const overdue = isOverdue(task.dueDate, task.status);
            const dueToday = isDueToday(task.dueDate);
            const isNotesExpanded = expandedNotesTaskId === task.id;
            const client = clients.find(c => c.id === task.clientId);
            const category = client?.type || task.clientType || 'Project';
            const catStyles = getDeliverableCategoryStyles(category);

            return (
              <div
                key={task.id}
                className={`${catStyles.cardBg} rounded-xl p-4 border transition-all duration-150 shadow-2xs ${
                  isFinishedWorkday
                    ? 'border-stone-200/60 opacity-60'
                    : overdue
                    ? 'border-rose-400 ring-1 ring-rose-400/40'
                    : `${catStyles.border}`
                }`}
              >
                {/* Top Row: Client Name, Category Badge & Priority */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center space-x-1.5 truncate">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${catStyles.dotClass}`} />
                    <button
                      type="button"
                      onClick={() => client && onSelectClient(client)}
                      className={`text-left font-serif text-sm font-normal text-stone-900 ${catStyles.hoverText} truncate max-w-[190px] transition-colors cursor-pointer`}
                      title={`Open client: ${task.clientName} (${category})`}
                    >
                      {task.clientName}
                    </button>
                    <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${catStyles.badge} shrink-0`}>
                      {category === 'Prospecting' ? 'Prospect' : category}
                    </span>
                    {task.isCleanedUpFromActive && (
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold shrink-0" title="Cleaned up completed deliverable from active engagement">
                        Completed · Archived
                      </span>
                    )}
                    {task.clientStatus === 'Inactive' && (
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border bg-amber-50 text-amber-900 border-amber-300 font-semibold shrink-0" title="Archived Account">
                        Archived
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] font-mono shrink-0">
                    {task.isRecurring && (
                      <span className="text-stone-400 flex items-center space-x-0.5" title="Recurring task">
                        <RotateCcw className="w-3 h-3" />
                      </span>
                    )}
                    <span className={`font-semibold ${
                      task.priority === 'High' ? 'text-rose-700' :
                      task.priority === 'Medium' ? 'text-amber-800' :
                      task.priority === 'Low' ? 'text-stone-600' :
                      'text-stone-500'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                </div>

                {/* Task Description */}
                <p className={`text-xs leading-relaxed mb-3 ${
                  isFinishedWorkday ? 'text-stone-600 line-through' : 'text-stone-800 font-medium'
                }`}>
                  {task.description}
                </p>

                {/* Controls Row: Assignee, Status, Due Date */}
                <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t ${catStyles.dividerClass} text-xs items-center`}>
                  
                  {/* Assignee Control */}
                  <div className="flex items-center space-x-1.5">
                    <select
                      value={task.assignedTo || ''}
                      onChange={(e) => onUpdateTaskAssignee(task.clientId, task.id, e.target.value || null)}
                      className={`w-full rounded-lg px-2 py-1 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-stone-400 cursor-pointer border transition-colors ${
                        task.assignedTo
                          ? `${catStyles.inputBg} text-stone-800`
                          : 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                      }`}
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map(m => (
                        <option key={m.id} value={m.email}>
                          {m.name}
                        </option>
                      ))}
                    </select>

                    {!task.assignedTo && (
                      <button
                        type="button"
                        onClick={() => onUpdateTaskAssignee(task.clientId, task.id, currentUser.email)}
                        className="px-2 py-1 bg-stone-900 hover:bg-stone-800 text-white font-mono text-[10px] rounded-lg shrink-0 transition-all cursor-pointer"
                        title="Take task"
                      >
                        Take
                      </button>
                    )}
                  </div>

                  {/* Status Dropdown */}
                  <div>
                    <select
                      value={task.status}
                      onChange={(e) => onUpdateTaskStatus(task.clientId, task.id, e.target.value as TaskStatus)}
                      className={`w-full ${catStyles.inputBg} rounded-lg px-2 py-1 text-[11px] font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400 cursor-pointer`}
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Complete">Complete ✓</option>
                      <option value="Cancelled">Cancelled ✗</option>
                    </select>
                  </div>

                  {/* Due Date */}
                  <div className={`flex items-center space-x-1 font-mono text-[11px] tabular-nums px-2 py-1 rounded-lg border justify-center ${
                    overdue
                      ? 'bg-rose-50 border-rose-200 text-rose-800 font-semibold'
                      : dueToday
                      ? 'bg-amber-50 border-amber-200 text-amber-900 font-semibold'
                      : `${catStyles.inputBg} text-stone-600`
                  }`}>
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>{formatDate(task.dueDate)}</span>
                    {overdue && <span className="font-bold text-[9px] uppercase">!</span>}
                  </div>

                </div>

                {/* Sub-toolbar: Deliverable & Notes */}
                <div className={`flex items-center justify-between pt-2.5 mt-2 border-t ${catStyles.dividerClass} text-xs text-stone-500`}>
                  
                  {/* Deliverable link */}
                  <div className="flex items-center space-x-1.5 flex-1 min-w-0 mr-2">
                    {task.deliverableUrl ? (
                      <div className="flex items-center space-x-1.5 truncate">
                        <a
                          href={task.deliverableUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-stone-700 hover:text-stone-950 font-mono text-[11px] truncate"
                          title={task.deliverableUrl}
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{task.deliverableUrl.replace(/^https?:\/\//, '')}</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDeliverableTaskId(task.id);
                            setDeliverableInput(task.deliverableUrl || '');
                          }}
                          className="text-stone-400 hover:text-stone-700 text-[10px]"
                        >
                          edit
                        </button>
                      </div>
                    ) : (
                      editingDeliverableTaskId === task.id ? (
                        <div className="flex items-center space-x-1 flex-1">
                          <input
                            type="url"
                            placeholder="URL..."
                            value={deliverableInput}
                            onChange={(e) => setDeliverableInput(e.target.value)}
                            className="flex-1 px-2 py-0.5 bg-stone-50 border border-stone-300 rounded text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveDeliverable(task.clientId, task.id)}
                            className="px-2 py-0.5 bg-stone-900 text-white rounded text-[10px] font-medium"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDeliverableTaskId(null)}
                            className="text-stone-400 text-[10px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDeliverableTaskId(task.id);
                            setDeliverableInput('');
                          }}
                          className="inline-flex items-center space-x-1 text-stone-400 hover:text-stone-700 text-[11px]"
                        >
                          <LinkIcon className="w-3 h-3" />
                          <span>Link deliverable</span>
                        </button>
                      )
                    )}
                  </div>

                  {/* Notes toggle */}
                  <button
                    type="button"
                    onClick={() => setExpandedNotesTaskId(isNotesExpanded ? null : task.id)}
                    className="inline-flex items-center space-x-1 text-stone-600 hover:text-stone-950 text-[11px] font-mono cursor-pointer shrink-0"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>{task.notes?.length || 0} notes</span>
                    {isNotesExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {/* Expandable Notes */}
                {isNotesExpanded && (
                  <div className={`mt-2.5 pt-2.5 border-t ${catStyles.dividerClass} bg-white/70 -mx-4 -mb-4 p-3 rounded-b-xl animate-in fade-in duration-100`}>
                    <div className="space-y-1.5 mb-2.5 max-h-36 overflow-y-auto pr-1">
                      {task.notes && task.notes.length > 0 ? (
                        task.notes.map((note) => (
                          <div key={note.id} className="bg-white p-2 rounded-lg border border-stone-200 text-xs">
                            <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono mb-0.5">
                              <span className="font-semibold text-stone-700">{note.authorName}</span>
                              <span>{note.timestamp}</span>
                            </div>
                            <p className="text-stone-700 leading-relaxed text-[11px]">{note.text}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-stone-400 italic">No notes recorded yet.</p>
                      )}
                    </div>

                    {/* Add note input */}
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="text"
                        placeholder="Add update..."
                        value={noteInputs[task.id] || ''}
                        onChange={(e) => setNoteInputs({ ...noteInputs, [task.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNoteSubmit(task.clientId, task.id);
                          }
                        }}
                        className="flex-1 bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddNoteSubmit(task.clientId, task.id)}
                        disabled={!noteInputs[task.id]?.trim()}
                        className="p-1.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-30 text-white rounded-lg transition-all"
                        title="Add Note"
                      >
                        <Send className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
