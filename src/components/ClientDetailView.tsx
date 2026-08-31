import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Building2, 
  Repeat, 
  FolderKanban, 
  Building, 
  Plus, 
  Edit3, 
  Save, 
  X, 
  CheckCircle2, 
  Clock, 
  Archive, 
  History, 
  Sparkles, 
  ListTodo, 
  MessageSquare, 
  Send, 
  ExternalLink, 
  RotateCcw, 
  Check, 
  AlertTriangle,
  Trash2,
  Lock,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon
} from 'lucide-react';
import { Client, Task, TaskPriority, TaskStatus, TeamMember, TaskNote } from '../types';
import { getProjectCompletionStats, getProgressBarColor, formatDate, isOverdue, isDueToday } from '../utils/helpers';
import { GanttTimelineVisualizer } from './GanttTimelineVisualizer';
import { ProspectingTimeline } from './ProspectingTimeline';

interface ClientDetailViewProps {
  client: Client;
  currentUser: TeamMember;
  teamMembers: TeamMember[];
  onBack: () => void;
  onUpdateClient: (updatedClient: Client) => void;
  onAddTask: (clientId: string, task: Omit<Task, 'id' | 'clientId' | 'notes'>) => void;
  onUpdateTaskStatus: (clientId: string, taskId: string, status: TaskStatus) => void;
  onUpdateTaskAssignee: (clientId: string, taskId: string, assigneeEmail: string | null) => void;
  onAddNote: (clientId: string, taskId: string, text: string) => void;
  onUpdateDeliverableUrl: (clientId: string, taskId: string, url: string) => void;
  onDeleteTask: (clientId: string, taskId: string) => void;
  onResetRecurringTask: (clientId: string, taskId: string) => void;
  onPromptWonProspect?: (client: Client) => void;
}

export const ClientDetailView: React.FC<ClientDetailViewProps> = ({
  client,
  currentUser,
  teamMembers,
  onBack,
  onUpdateClient,
  onAddTask,
  onUpdateTaskStatus,
  onUpdateTaskAssignee,
  onAddNote,
  onUpdateDeliverableUrl,
  onDeleteTask,
  onResetRecurringTask,
  onPromptWonProspect
}) => {
  const isAdmin = currentUser.role === 'Admin';
  const [activeTab, setActiveTab] = useState<'tasks' | 'history' | 'visualizer'>('tasks');
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryText, setSummaryText] = useState(client.projectSummary);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);

  // New task form state
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('Medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('');
  const [newTaskRecurring, setNewTaskRecurring] = useState(false);
  const [newTaskDeliverable, setNewTaskDeliverable] = useState('');

  // Expandable notes state
  const [expandedNotesId, setExpandedNotesId] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  // Filter state inside task list
  const [priorityFilter, setPriorityFilter] = useState<'All' | TaskPriority>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const stats = getProjectCompletionStats(client);
  const progressTheme = getProgressBarColor(stats.percentage);

  // Active tasks (Open workstreams) vs Completed History
  const activeTasks = client.tasks.filter(t => t.status !== 'Complete' && t.status !== 'Cancelled');
  const completedTasks = client.tasks.filter(t => t.status === 'Complete' || t.status === 'Cancelled');

  const filteredActiveTasks = activeTasks.filter(t => {
    if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
    if (searchQuery.trim() && !t.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleSaveSummary = () => {
    if (!isAdmin) return;
    onUpdateClient({
      ...client,
      projectSummary: summaryText
    });
    setIsEditingSummary(false);
  };

  const handleToggleClientStatus = () => {
    if (!isAdmin) return;
    const nextStatus = client.status === 'Active' ? 'Inactive' : 'Active';
    onUpdateClient({
      ...client,
      status: nextStatus
    });
  };

  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskDesc.trim()) return;

    onAddTask(client.id, {
      description: newTaskDesc.trim(),
      priority: newTaskPriority,
      dueDate: newTaskDueDate,
      assignedTo: newTaskAssignee || null,
      status: 'Not Started',
      deliverableUrl: newTaskDeliverable.trim() || undefined,
      isRecurring: newTaskRecurring
    });

    // Reset form
    setNewTaskDesc('');
    setNewTaskDeliverable('');
    setNewTaskPriority('Medium');
    setNewTaskRecurring(false);
    setIsAddTaskModalOpen(false);
  };

  const handleAddNoteSubmit = (taskId: string) => {
    const text = (noteInputs[taskId] || '').trim();
    if (!text) return;
    onAddNote(client.id, taskId, text);
    setNoteInputs(prev => ({ ...prev, [taskId]: '' }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="bg-slate-900 border-b border-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 hidden sm:inline">Active User:</span>
              <div className="flex items-center space-x-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 text-xs">
                <span className="font-semibold text-white">{currentUser.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                  isAdmin ? 'bg-amber-400/20 text-amber-300' : 'bg-sky-400/20 text-sky-300'
                }`}>
                  {currentUser.role}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        
        {/* 1. Header: Client Title, Type Badge, Status, Admin Archival Controls */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              <span className={`inline-flex items-center space-x-1.5 text-xs font-bold px-3 py-1 rounded-full border ${
                client.type === 'Project' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                client.type === 'Retainer' ? 'bg-purple-100 text-purple-900 border-purple-300' :
                client.type === 'Internal' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                'bg-orange-100 text-orange-950 border-orange-300'
              }`}>
                {client.type === 'Project' && <FolderKanban className="w-3.5 h-3.5" />}
                {client.type === 'Retainer' && <Repeat className="w-3.5 h-3.5" />}
                {client.type === 'Internal' && <Building className="w-3.5 h-3.5" />}
                {client.type === 'Prospecting' && <Sparkles className="w-3.5 h-3.5" />}
                <span>{client.type === 'Prospecting' ? 'Prospecting Deal' : `${client.type} Engagement`}</span>
              </span>

              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                client.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-300'
              }`}>
                {client.status === 'Active' ? '● Active Client' : '○ Inactive / Archived'}
              </span>

              {client.industry && (
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {client.industry}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight">
              {client.name}
            </h1>
            {client.type === 'Prospecting' && (
              <p className="text-xs font-bold text-orange-700 italic">
                Exploring New Engagement
              </p>
            )}

            {/* Changeable Lead Practice Consultant */}
            <div className="flex items-center space-x-2 pt-1 flex-wrap gap-y-1 text-xs">
              <span className="text-slate-500 font-medium">Lead Practice Consultant:</span>
              <select
                value={client.leadConsultant || 'All'}
                onChange={(e) => {
                  onUpdateClient({
                    ...client,
                    leadConsultant: e.target.value
                  });
                }}
                className="bg-slate-100 hover:bg-slate-200/80 border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer transition-colors"
                title="Change Lead Practice Consultant at any time"
              >
                <option value="All">All</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Archival & Status Controls (Admins for all, or any user for Prospecting) */}
          <div className="flex items-center space-x-3 shrink-0">
            {(isAdmin || client.type === 'Prospecting') ? (
              <button
                type="button"
                onClick={handleToggleClientStatus}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm ${
                  client.status === 'Active'
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                }`}
                title={client.type === 'Prospecting' ? "Manual archive/unarchive for prospecting engagement" : "Admin permission: Toggle client between Active and Archived/Inactive"}
              >
                <Archive className="w-4 h-4" />
                <span>{client.status === 'Active' ? (client.type === 'Prospecting' ? 'Archive Deal' : 'Set as Inactive / Archive') : 'Reactivate Client Card'}</span>
              </button>
            ) : (
              <div className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 rounded-xl text-slate-400 text-xs font-medium border border-slate-200">
                <Lock className="w-3.5 h-3.5" />
                <span>Admin controls locked for {currentUser.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Prospecting Visual Pipeline Banner (Interactive for any user) */}
        {client.type === 'Prospecting' && (
          <div className="bg-orange-50/90 rounded-3xl p-6 border-2 border-orange-500 shadow-sm">
            <ProspectingTimeline
              client={client}
              onUpdateClient={onUpdateClient}
              onPromptWonProspect={onPromptWonProspect}
              compact={false}
            />
          </div>
        )}

        {/* 2. Project Summary Section: Editable for Admins */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-sky-600" />
              <span>Project Summary & Strategic Scope</span>
            </h3>

            {isAdmin && (
              !isEditingSummary ? (
                <button
                  type="button"
                  onClick={() => setIsEditingSummary(true)}
                  className="flex items-center space-x-1 text-xs text-sky-600 hover:text-sky-800 font-bold px-2.5 py-1 rounded-lg hover:bg-sky-50 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Scope</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleSaveSummary}
                    className="flex items-center space-x-1 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-lg transition-colors shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSummaryText(client.projectSummary);
                      setIsEditingSummary(false);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
                  >
                    Cancel
                  </button>
                </div>
              )
            )}
          </div>

          {isEditingSummary ? (
            <textarea
              rows={4}
              value={summaryText}
              onChange={(e) => setSummaryText(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none leading-relaxed"
              placeholder="Enter client scope, objectives, and deliverables..."
            />
          ) : (
            <p className="text-sm text-slate-700 leading-relaxed">
              {client.projectSummary || 'No project summary provided.'}
            </p>
          )}

          {/* If Project type, show completion summary */}
          {client.type === 'Project' && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
                <span className="text-slate-600">
                  Deliverables Progress ({stats.completedTasks}/{stats.totalTasks} Completed)
                </span>
                <span className={`font-bold ${progressTheme.textClass}`}>
                  {stats.percentage}% • {progressTheme.label}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${progressTheme.bgClass}`}
                  style={{ width: `${Math.min(100, Math.max(stats.percentage, 4))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* View Tabs: Active Tasks vs Historical Completed Tasks vs Gemini Visualizer */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'tasks'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            <span>Active Workstreams</span>
            <span className="bg-sky-500/30 text-sky-200 px-2 py-0.2 rounded-full text-[10px]">
              {activeTasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historical Completed Tasks</span>
            <span className="bg-slate-700 text-slate-300 px-2 py-0.2 rounded-full text-[10px]">
              {completedTasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('visualizer')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'visualizer'
                ? 'bg-gradient-to-r from-sky-600 to-teal-600 text-white shadow-md shadow-sky-900/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>Gemini AI Visualizer Tab</span>
          </button>
        </div>

        {/* Tab 1: Active Tasks Management */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            
            {/* Action Bar & Search / Filter Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center space-x-2 flex-1">
                <input
                  type="text"
                  placeholder="Filter client tasks by keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full max-w-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />

                <div className="flex items-center space-x-1 text-xs">
                  {(['All', 'High', 'Medium', 'Low', 'Unassigned'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriorityFilter(p)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                        priorityFilter === p ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Task Button (Admins & Users can create tasks) */}
              <button
                type="button"
                onClick={() => setIsAddTaskModalOpen(true)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Task</span>
              </button>
            </div>

            {/* Active Tasks List */}
            {filteredActiveTasks.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-slate-300">
                <CheckCircle2 className="w-10 h-10 text-teal-500 mx-auto mb-2 opacity-80" />
                <h4 className="text-sm font-bold text-slate-800">No Active Tasks</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  All workstreams for {client.name} are completed or archived. Click "Add Task" to create a new deliverable.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActiveTasks.map((task) => {
                  const overdue = isOverdue(task.dueDate, task.status);
                  const isNotesExpanded = expandedNotesId === task.id;

                  return (
                    <div
                      key={task.id}
                      className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1.5 flex-wrap gap-y-1">
                            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border ${
                              task.priority === 'High' ? 'bg-rose-100 text-rose-700 border-rose-300' :
                              task.priority === 'Medium' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                              task.priority === 'Low' ? 'bg-sky-100 text-sky-700 border-sky-300' :
                              'bg-slate-100 text-slate-600 border-slate-300'
                            }`}>
                              {task.priority} Priority
                            </span>

                            {task.isRecurring && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 flex items-center space-x-1">
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Recurring Cadence</span>
                              </span>
                            )}

                            <span className={`inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg border ${
                              overdue
                                ? 'bg-rose-100 text-rose-800 border-rose-400 font-bold shadow-xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 font-medium'
                            }`}>
                              <Clock className={`w-3.5 h-3.5 shrink-0 ${overdue ? 'text-rose-700' : 'text-slate-400'}`} />
                              <span>Due: {formatDate(task.dueDate)}</span>
                              {overdue && <span className="text-rose-700 font-black uppercase ml-0.5">(OVERDUE)</span>}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 leading-snug">
                            {task.description}
                          </h4>
                        </div>

                        {/* Status dropdown & quick actions */}
                        <div className="flex items-center space-x-2 shrink-0">
                          <select
                            value={task.status}
                            onChange={(e) => onUpdateTaskStatus(client.id, task.id, e.target.value as TaskStatus)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500"
                          >
                            <option value="Not Started">Not Started</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Complete">Complete ✓</option>
                            <option value="Cancelled">Cancelled ✗</option>
                          </select>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => onDeleteTask(client.id, task.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                              title="Delete task"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Controls Row: Assignee, Deliverable Link, Notes Toggle */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-slate-100 text-xs">
                        
                        {/* Assignee Selector */}
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] font-bold text-slate-400 uppercase">Assignee:</span>
                          <select
                            value={task.assignedTo || ''}
                            onChange={(e) => onUpdateTaskAssignee(client.id, task.id, e.target.value || null)}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700"
                          >
                            <option value="">-- Unassigned --</option>
                            {teamMembers.map(m => (
                              <option key={m.id} value={m.email}>{m.name} ({m.role})</option>
                            ))}
                          </select>
                        </div>

                        {/* Deliverable Link */}
                        <div className="flex items-center space-x-2">
                          {task.deliverableUrl ? (
                            <a
                              href={task.deliverableUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-lg font-semibold truncate max-w-[200px]"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{task.deliverableUrl.replace(/^https?:\/\//, '')}</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No deliverable linked</span>
                          )}

                          {/* Notes toggle */}
                          <button
                            type="button"
                            onClick={() => setExpandedNotesId(isNotesExpanded ? null : task.id)}
                            className="inline-flex items-center space-x-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg font-semibold"
                          >
                            <MessageSquare className="w-3 h-3 text-slate-500" />
                            <span>Notes ({task.notes?.length || 0})</span>
                            {isNotesExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Notes */}
                      {isNotesExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-100 bg-slate-50/80 -mx-5 -mb-5 p-4 rounded-b-2xl">
                          <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                            {task.notes && task.notes.length > 0 ? (
                              task.notes.map(n => (
                                <div key={n.id} className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                                    <span className="font-bold text-slate-800">{n.authorName}</span>
                                    <span>{n.timestamp}</span>
                                  </div>
                                  <p className="text-slate-700">{n.text}</p>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-400 italic">No notes yet.</p>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              placeholder={`Add note as ${currentUser.name}...`}
                              value={noteInputs[task.id] || ''}
                              onChange={(e) => setNoteInputs({ ...noteInputs, [task.id]: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddNoteSubmit(task.id);
                                }
                              }}
                              className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddNoteSubmit(task.id)}
                              disabled={!noteInputs[task.id]?.trim()}
                              className="p-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* Tab 2: Historical Completed Tasks */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <History className="w-4 h-4 text-teal-600" />
                  <span>Permanent Completed & Archived Records</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Historical deliverables preserved permanently with notes and deliverables
                </p>
              </div>
              <span className="text-xs bg-teal-50 text-teal-800 font-bold px-3 py-1 rounded-full border border-teal-200">
                {completedTasks.length} Milestones Archived
              </span>
            </div>

            {completedTasks.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-400">No completed tasks archived yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedTasks.map((task) => {
                  const assignee = teamMembers.find(m => m.email === task.assignedTo);
                  return (
                    <div key={task.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                          <span className="font-bold text-slate-800 text-sm">{task.description}</span>
                        </div>

                        <div className="flex items-center space-x-2">
                          {task.completedAt && (
                            <span className="text-[11px] text-slate-500">
                              Completed: {formatDate(task.completedAt)}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            task.status === 'Complete' ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-[11px] text-slate-500">
                        <span>Assignee: <strong>{assignee ? assignee.name : 'Unassigned'}</strong></span>

                        <div className="flex items-center space-x-2">
                          {task.deliverableUrl && (
                            <a
                              href={task.deliverableUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-teal-700 hover:text-teal-900 font-bold flex items-center space-x-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>View Deliverable</span>
                            </a>
                          )}

                          {/* Re-open Task Button */}
                          <button
                            type="button"
                            onClick={() => onUpdateTaskStatus(client.id, task.id, 'In Progress')}
                            className="text-sky-600 hover:text-sky-800 font-semibold underline ml-2"
                          >
                            Re-open
                          </button>
                        </div>
                      </div>

                      {/* Notes count */}
                      {task.notes && task.notes.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                          <p className="font-semibold text-slate-700 mb-1">Archived Notes ({task.notes.length}):</p>
                          <div className="space-y-1">
                            {task.notes.map(n => (
                              <p key={n.id} className="text-slate-600">
                                • <strong className="text-slate-700">{n.authorName}:</strong> {n.text} ({n.timestamp})
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Gemini AI Visualizer Tab */}
        {activeTab === 'visualizer' && (
          <GanttTimelineVisualizer client={client} teamMembers={teamMembers} />
        )}

      </div>

      {/* Add Task Modal */}
      {isAddTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 font-serif">
                Add New Task / Deliverable
              </h3>
              <button
                type="button"
                onClick={() => setIsAddTaskModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Task Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Conduct ICP buyer persona validation interviews"
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                    <option value="Unassigned">Unassigned</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Target Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Assign To Team Member
                </label>
                <select
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold"
                >
                  <option value="">-- Unassigned (Not in live priority feed) --</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.email}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Deliverable URL / Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://docs.google.com/..."
                  value={newTaskDeliverable}
                  onChange={(e) => setNewTaskDeliverable(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>

              {/* Recurring checkbox for Retainer / Internal clients */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="recurringCheck"
                  checked={newTaskRecurring}
                  onChange={(e) => setNewTaskRecurring(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                />
                <label htmlFor="recurringCheck" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Recurring task cadence (resets fresh copy on completion cleanup)
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-900/20"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
