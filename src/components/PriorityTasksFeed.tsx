import React, { useState } from 'react';
import { 
  Sparkles, 
  Filter, 
  UserCheck, 
  Users, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  MessageSquare, 
  Send, 
  Archive, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  Link as LinkIcon, 
  Plus, 
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { Client, Task, TaskPriority, TaskStatus, TeamMember, PriorityTasksFilter } from '../types';
import { sortPriorityTasks, formatDate, isOverdue, isDueToday } from '../utils/helpers';

interface PriorityTasksFeedProps {
  clients: Client[];
  currentUser: TeamMember;
  teamMembers: TeamMember[];
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
  onUpdateTaskStatus,
  onUpdateTaskAssignee,
  onAddNote,
  onUpdateDeliverableUrl,
  onRunEndOfDayCleanup,
  onSelectClient
}) => {
  const [filterMode, setFilterMode] = useState<PriorityTasksFilter>('all');
  const [expandedNotesTaskId, setExpandedNotesTaskId] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [editingDeliverableTaskId, setEditingDeliverableTaskId] = useState<string | null>(null);
  const [deliverableInput, setDeliverableInput] = useState<string>('');
  const [cleanupSuccessMessage, setCleanupSuccessMessage] = useState<string | null>(null);

  // 1. Gather all tasks across active clients (and inactive if needed) that have an assigned team member
  // RULE: "Includes only tasks assigned to a specific team member. Unassigned tasks do NOT appear here."
  // RULE: "isArchivedFromFeed" hides tasks that were cleaned up via End-of-Day Cleanup.
  const allAssignedTasks: (Task & { clientName: string; clientType: string; clientStatus: string })[] = [];

  clients.forEach(client => {
    client.tasks.forEach(task => {
      // Must be assigned and not archived from live feed by EOD cleanup
      if (task.assignedTo && !task.isArchivedFromFeed) {
        allAssignedTasks.push({
          ...task,
          clientName: client.name,
          clientType: client.type,
          clientStatus: client.status
        });
      }
    });
  });

  // 2. Filter by "All Priority Tasks" vs "My Tasks"
  const filteredTasks = allAssignedTasks.filter(task => {
    if (filterMode === 'mine') {
      return task.assignedTo === currentUser.email;
    }
    return true;
  });

  // 3. Strict Priority Sorting: High -> Medium -> Low, then Due Date
  const sortedTasks = sortPriorityTasks(filteredTasks);

  // Count how many completed or cancelled tasks are currently in the feed ready for EOD cleanup
  const cleanupCandidates = filteredTasks.filter(t => t.status === 'Complete' || t.status === 'Cancelled');

  const handleCleanupClick = () => {
    onRunEndOfDayCleanup();
    setCleanupSuccessMessage(`End-of-day cleanup completed! ${cleanupCandidates.length} finished task(s) moved to client historical records.`);
    setTimeout(() => setCleanupSuccessMessage(null), 4000);
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

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'High':
        return 'bg-rose-100 text-rose-700 border-rose-300 font-bold';
      case 'Medium':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
      case 'Low':
        return 'bg-sky-100 text-sky-700 border-sky-300 font-medium';
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'Not Started':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-300 font-semibold';
      case 'Complete':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
      case 'Cancelled':
        return 'bg-slate-200 text-slate-600 border-slate-300 line-through';
    }
  };

  return (
    <div className="bg-slate-900/5 rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col h-full">
      
      {/* Top Header of Feed */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
            </span>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight font-serif">
              Priority Tasks Live Feed
            </h2>
            <span className="text-xs bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
              {sortedTasks.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict priority queue (High → Medium → Low) for assigned consulting deliverables
          </p>
        </div>

        {/* Action Controls: Filter Buttons & End-of-Day Cleanup */}
        <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
          {/* Filter Toggles: All vs My Tasks */}
          <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex items-center text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center space-x-1.5 ${
                filterMode === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>All Priority</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('mine')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center space-x-1.5 ${
                filterMode === 'mine'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>My Tasks</span>
            </button>
          </div>

          {/* End-of-Day Cleanup Button */}
          <button
            type="button"
            onClick={handleCleanupClick}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl text-xs font-semibold shadow-sm transition-all group"
            title="Archive completed/cancelled tasks from the live daily feed into permanent client history"
          >
            <Archive className="w-3.5 h-3.5 text-teal-600 group-hover:rotate-12 transition-transform" />
            <span>End-of-Day Cleanup</span>
            {cleanupCandidates.length > 0 && (
              <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-teal-300">
                {cleanupCandidates.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Success Notification Banner for Cleanup */}
      {cleanupSuccessMessage && (
        <div className="mt-3 p-3 bg-teal-50 border border-teal-200 text-teal-900 rounded-xl text-xs flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{cleanupSuccessMessage}</span>
          </div>
          <button onClick={() => setCleanupSuccessMessage(null)} className="text-teal-700 hover:text-teal-900 font-bold">×</button>
        </div>
      )}

      {/* Feed List Container */}
      <div className="mt-4 space-y-3.5 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
        {sortedTasks.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300">
            <CheckCircle className="w-10 h-10 text-teal-500 mx-auto mb-2 opacity-80" />
            <h4 className="text-sm font-bold text-slate-800">No Priority Tasks in Feed</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {filterMode === 'mine'
                ? `You have no assigned tasks open under "${currentUser.name}". Switch to "All Priority" or assign tasks in a Client Card.`
                : 'All assigned tasks are completed and archived, or no tasks are currently assigned to team members.'}
            </p>
          </div>
        ) : (
          sortedTasks.map((task) => {
            const isCompleted = task.status === 'Complete';
            const isCancelled = task.status === 'Cancelled';
            const isFinishedWorkday = isCompleted || isCancelled;
            const overdue = isOverdue(task.dueDate, task.status);
            const dueToday = isDueToday(task.dueDate);
            const isNotesExpanded = expandedNotesTaskId === task.id;
            const assignee = teamMembers.find(m => m.email === task.assignedTo);
            const client = clients.find(c => c.id === task.clientId);

            return (
              <div
                key={task.id}
                className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-150 shadow-sm hover:shadow-md ${
                  isFinishedWorkday
                    ? 'bg-slate-50/90 border-slate-200 opacity-85'
                    : overdue
                    ? 'border-rose-300 bg-rose-50/20'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Top Row: Client Badge & Priority Badge */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => client && onSelectClient(client)}
                    className="text-left font-bold text-xs text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-0.5 rounded-lg truncate max-w-[240px] transition-colors"
                    title={`Open client: ${task.clientName}`}
                  >
                    🏢 {task.clientName}
                  </button>

                  <div className="flex items-center space-x-1.5">
                    {task.isRecurring && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 flex items-center space-x-1">
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Recurring</span>
                      </span>
                    )}
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-md border uppercase tracking-wider ${getPriorityBadge(task.priority)}`}>
                      {task.priority} Priority
                    </span>
                  </div>
                </div>

                {/* Task Description */}
                <div className="mb-3">
                  <p className={`text-sm font-semibold leading-snug ${
                    isFinishedWorkday ? 'text-slate-600 line-through' : 'text-slate-900'
                  }`}>
                    {task.description}
                  </p>
                  {isFinishedWorkday && (
                    <span className="inline-flex items-center space-x-1 text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md mt-1.5 font-medium border border-teal-200/60">
                      <CheckCircle2 className="w-3 h-3 text-teal-600" />
                      <span>Finished today • Will archive on End-of-Day Cleanup</span>
                    </span>
                  )}
                </div>

                {/* Interactive Controls Row: Assignee, Status, Due Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2.5 border-t border-slate-100 text-xs">
                  
                  {/* Inline Assignee Selector */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Assigned To
                    </label>
                    <select
                      value={task.assignedTo || ''}
                      onChange={(e) => onUpdateTaskAssignee(task.clientId, task.id, e.target.value || null)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">-- Unassigned --</option>
                      {teamMembers.map(m => (
                        <option key={m.id} value={m.email}>
                          {m.name} ({m.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Inline Status Dropdown */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Task Status
                    </label>
                    <select
                      value={task.status}
                      onChange={(e) => onUpdateTaskStatus(task.clientId, task.id, e.target.value as TaskStatus)}
                      className={`w-full border rounded-xl px-2 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 ${getStatusBadge(task.status)}`}
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Complete">Complete ✓</option>
                      <option value="Cancelled">Cancelled ✗</option>
                    </select>
                  </div>

                  {/* Due Date Indicator */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Target Due Date
                    </label>
                    <div className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border font-semibold ${
                      overdue
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : dueToday
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{formatDate(task.dueDate)}</span>
                      {overdue && <span className="text-[9px] font-black uppercase text-rose-600 bg-rose-200/60 px-1 rounded">Overdue</span>}
                      {dueToday && <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-200/60 px-1 rounded">Today</span>}
                    </div>
                  </div>

                </div>

                {/* Deliverable Link & Expandable Notes Toolbar */}
                <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs">
                  
                  {/* Deliverable Link View / Edit */}
                  <div className="flex items-center space-x-2 flex-1 mr-2">
                    {task.deliverableUrl ? (
                      <div className="flex items-center space-x-1.5 max-w-[220px]">
                        <a
                          href={task.deliverableUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-1 rounded-lg text-xs font-semibold truncate transition-colors"
                          title={`Open Deliverable: ${task.deliverableUrl}`}
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
                          className="text-slate-400 hover:text-slate-600 text-[10px] underline"
                        >
                          Edit
                        </button>
                      </div>
                    ) : (
                      editingDeliverableTaskId === task.id ? (
                        <div className="flex items-center space-x-1 flex-1">
                          <input
                            type="url"
                            placeholder="https://docs.google.com/..."
                            value={deliverableInput}
                            onChange={(e) => setDeliverableInput(e.target.value)}
                            className="flex-1 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveDeliverable(task.clientId, task.id)}
                            className="px-2 py-1 bg-teal-600 text-white rounded-lg text-xs font-bold"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDeliverableTaskId(null)}
                            className="px-2 py-1 text-slate-500 text-xs"
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
                          className="inline-flex items-center space-x-1 text-slate-500 hover:text-teal-700 text-xs font-medium"
                        >
                          <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span>+ Attach Deliverable URL</span>
                        </button>
                      )
                    )}
                  </div>

                  {/* Expand Notes Toggle */}
                  <button
                    type="button"
                    onClick={() => setExpandedNotesTaskId(isNotesExpanded ? null : task.id)}
                    className="inline-flex items-center space-x-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg font-medium transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                    <span>Notes ({task.notes?.length || 0})</span>
                    {isNotesExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {/* Expanded Notes Section */}
                {isNotesExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-100 bg-slate-50/80 -mx-4 -mb-4 p-4 rounded-b-2xl animate-in fade-in duration-100">
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Collaborative Activity & Notes</span>
                      <span className="text-[10px] text-slate-400 font-normal">Signed as {currentUser.name}</span>
                    </h5>

                    {/* Past Notes List */}
                    <div className="space-y-2 mb-3 max-h-48 overflow-y-auto pr-1">
                      {task.notes && task.notes.length > 0 ? (
                        task.notes.map((note) => (
                          <div key={note.id} className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
                            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                              <span className="font-bold text-slate-800">{note.authorName} ({note.authorEmail})</span>
                              <span>{note.timestamp}</span>
                            </div>
                            <p className="text-slate-700 leading-relaxed">{note.text}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic">No notes attached yet. Add the first update below.</p>
                      )}
                    </div>

                    {/* Add Note Input */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder={`Add an update as ${currentUser.name}...`}
                        value={noteInputs[task.id] || ''}
                        onChange={(e) => setNoteInputs({ ...noteInputs, [task.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNoteSubmit(task.clientId, task.id);
                          }
                        }}
                        className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddNoteSubmit(task.clientId, task.id)}
                        disabled={!noteInputs[task.id]?.trim()}
                        className="p-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl shadow-sm transition-all"
                        title="Submit Note"
                      >
                        <Send className="w-3.5 h-3.5" />
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
