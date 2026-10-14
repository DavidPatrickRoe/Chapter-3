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
  RotateCcw
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

  // Gather tasks: assigned and unassigned
  const allAssignedTasks: (Task & { clientName: string; clientType: string; clientStatus: string })[] = [];
  const allUnassignedTasks: (Task & { clientName: string; clientType: string; clientStatus: string })[] = [];

  clients.forEach(client => {
    client.tasks.forEach(task => {
      if (task.isArchivedFromFeed) return;
      if (task.assignedTo) {
        allAssignedTasks.push({
          ...task,
          clientName: client.name,
          clientType: client.type,
          clientStatus: client.status
        });
      } else if (task.status !== 'Complete' && task.status !== 'Cancelled') {
        allUnassignedTasks.push({
          ...task,
          clientName: client.name,
          clientType: client.type,
          clientStatus: client.status
        });
      }
    });
  });

  // Filter selection
  const filteredTasks = filterMode === 'unassigned'
    ? allUnassignedTasks
    : allAssignedTasks.filter(task => {
        if (filterMode === 'mine') {
          return task.assignedTo === currentUser.email;
        }
        return true;
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

  return (
    <div className="bg-stone-100/60 rounded-3xl p-5 border border-stone-200/80 shadow-2xs flex flex-col h-full">
      
      {/* Header of Feed */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="font-serif text-lg font-normal text-stone-950 tracking-tight">
              Deliverables Queue
            </h2>
            <span className="font-mono text-xs text-stone-600 tabular-nums">
              ({sortedTasks.length})
            </span>
          </div>
          <p className="text-xs text-stone-600 mt-0.5">
            Ranked priority queue for active consulting deliverables
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <div className="bg-white p-0.5 rounded-xl border border-stone-200 shadow-2xs flex items-center text-xs">
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

          {/* End-of-Day Cleanup */}
          <button
            type="button"
            onClick={handleCleanupClick}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-950 border border-stone-200 rounded-xl text-xs font-medium transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
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
        </div>
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
      <div className="mt-3.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
        {sortedTasks.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-stone-200">
            <CheckCircle2 className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <h4 className="text-xs font-semibold text-stone-800">Queue is Clear</h4>
            <p className="text-[11px] text-stone-500 max-w-xs mx-auto mt-0.5">
              {filterMode === 'mine'
                ? `No pending deliverables assigned to ${currentUser.name}.`
                : 'All assigned tasks are completed, or no deliverables are currently open.'}
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
            const client = clients.find(c => c.id === task.clientId);

            return (
              <div
                key={task.id}
                className={`bg-white rounded-xl p-4 border transition-all duration-150 shadow-2xs ${
                  isFinishedWorkday
                    ? 'border-stone-200/60 opacity-60 bg-stone-50/70'
                    : overdue
                    ? 'border-rose-300/80 bg-rose-50/20'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                {/* Top Row: Client Name & Priority */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <button
                    type="button"
                    onClick={() => client && onSelectClient(client)}
                    className="text-left font-serif text-sm font-normal text-stone-900 hover:text-stone-600 truncate max-w-[220px] transition-colors cursor-pointer"
                    title={`Open client: ${task.clientName}`}
                  >
                    {task.clientName}
                  </button>

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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-stone-100 text-xs items-center">
                  
                  {/* Assignee Control */}
                  <div className="flex items-center space-x-1.5">
                    <select
                      value={task.assignedTo || ''}
                      onChange={(e) => onUpdateTaskAssignee(task.clientId, task.id, e.target.value || null)}
                      className={`w-full rounded-lg px-2 py-1 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-stone-400 cursor-pointer border transition-colors ${
                        task.assignedTo
                          ? 'bg-stone-50 border-stone-200 text-stone-800'
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
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-[11px] font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400 cursor-pointer"
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
                      : 'bg-stone-50 border-stone-200 text-stone-600'
                  }`}>
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>{formatDate(task.dueDate)}</span>
                    {overdue && <span className="font-bold text-[9px] uppercase">!</span>}
                  </div>

                </div>

                {/* Sub-toolbar: Deliverable & Notes */}
                <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-stone-100 text-xs text-stone-500">
                  
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
                  <div className="mt-2.5 pt-2.5 border-t border-stone-100 bg-stone-50/60 -mx-4 -mb-4 p-3 rounded-b-xl animate-in fade-in duration-100">
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
