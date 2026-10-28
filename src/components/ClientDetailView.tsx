import React, { useState, useEffect } from 'react';
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
  Calendar,
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
  Link as LinkIcon,
  FileSpreadsheet,
  LogIn,
  LogOut,
  FileText,
  Upload
} from 'lucide-react';
import { Client, Task, TaskPriority, TaskStatus, TeamMember, TaskNote, SOWActionItem, SOWItemStatus } from '../types';
import { getProjectCompletionStats, getProgressBarColor, formatDate, isOverdue, isDueToday, getClientSOWPhases } from '../utils/helpers';
import { GanttTimelineVisualizer } from './GanttTimelineVisualizer';
import { ProspectingTimeline } from './ProspectingTimeline';
import { TaskDescriptionInput } from './TaskDescriptionInput';
import { SOWDetailTab } from './SOWDetailTab';
import { FirebaseUser } from '../firebase/config';

interface ClientDetailViewProps {
  client: Client;
  currentUser: TeamMember;
  teamMembers: TeamMember[];
  onBack: () => void;
  onUpdateClient: (updatedClient: Client) => void;
  onAddTask: (clientId: string, task: Omit<Task, 'id' | 'clientId' | 'notes'>) => void;
  onUpdateTaskStatus: (clientId: string, taskId: string, status: TaskStatus) => void;
  onUpdateTaskAssignee: (clientId: string, taskId: string, assigneeEmail: string | null) => void;
  onUpdateTaskPriority: (clientId: string, taskId: string, priority: TaskPriority) => void;
  onUpdateTaskDueDate: (clientId: string, taskId: string, dueDate: string) => void;
  onUpdateTaskPhase?: (clientId: string, taskId: string, phase?: string) => void;
  onAddNote: (clientId: string, taskId: string, text: string) => void;
  onUpdateDeliverableUrl: (clientId: string, taskId: string, url: string) => void;
  onDeleteTask: (clientId: string, taskId: string) => void;
  onResetRecurringTask: (clientId: string, taskId: string) => void;
  onPromptWonProspect?: (client: Client) => void;
  onOpenSOWUpload?: (clientId?: string) => void;
  onDeleteClient?: (clientId: string) => void;
  firebaseUser?: FirebaseUser | null;
  onSignInGoogle?: () => void;
  onSignOutGoogle?: () => void;
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
  onUpdateTaskPriority,
  onUpdateTaskDueDate,
  onUpdateTaskPhase,
  onAddNote,
  onUpdateDeliverableUrl,
  onDeleteTask,
  onResetRecurringTask,
  onPromptWonProspect,
  onOpenSOWUpload,
  onDeleteClient,
  firebaseUser,
  onSignInGoogle,
  onSignOutGoogle
}) => {
  const isAdmin = currentUser.role === 'Admin';
  const [activeTab, setActiveTab] = useState<'tasks' | 'history' | 'sow'>('tasks');
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryText, setSummaryText] = useState(client.projectSummary);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameText, setNameText] = useState(client.name);

  useEffect(() => {
    setNameText(client.name);
  }, [client.name]);

  const handleSaveName = () => {
    if (!isAdmin) return;
    const trimmed = nameText.trim();
    if (!trimmed) {
      setNameText(client.name);
      setIsEditingName(false);
      return;
    }
    if (trimmed !== client.name) {
      onUpdateClient({
        ...client,
        name: trimmed
      });
    }
    setIsEditingName(false);
  };

  const getEngagementTypeLabel = (type: string) => {
    switch (type) {
      case 'Internal':
        return 'Internal';
      case 'Retainer':
        return 'Retainer';
      case 'Project':
        return 'Project';
      case 'Prospecting':
        return 'Prospect';
      default:
        return type;
    }
  };

  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingClient, setIsDeletingClient] = useState(false);

  // Gemini AI Strategic Assessment state
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    executiveSummary: string;
    healthScore: number;
    healthStatus?: string;
    keyStrengths?: string[];
    bottlenecks: string[];
    workloadAssessment?: string;
    recommendations: string[];
  } | null>(null);

  // Workstream filter for tasks
  const [workstreamFilter, setWorkstreamFilter] = useState<string>('All');

  // New task form state
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPhase, setNewTaskPhase] = useState('');
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
  const [priorityFilter, setPriorityFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [assigneeFilter, setAssigneeFilter] = useState<'All' | 'unassigned' | string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const stats = getProjectCompletionStats(client);
  const progressTheme = getProgressBarColor(stats.percentage);

  const sowPhases = getClientSOWPhases(client);
  const totalSOWActionItems = sowPhases.reduce((acc, p) => acc + p.items.length, 0);

  const handleUpdateSOWItemStatus = (itemId: string, newStatus: SOWItemStatus) => {
    const basePhases = client.sowPhases && client.sowPhases.length > 0 ? client.sowPhases : sowPhases;
    const updatedSOWPhases = basePhases.map(p => ({
      ...p,
      items: p.items.map(item => item.id === itemId ? { ...item, status: newStatus } : item)
    }));
    const allItems = updatedSOWPhases.flatMap(p => p.items);

    onUpdateClient({
      ...client,
      sowPhases: updatedSOWPhases,
      sowItems: allItems
    });
  };

  const handleUpdateSOWItemDueDate = (itemId: string, newDueDate: string) => {
    const basePhases = client.sowPhases && client.sowPhases.length > 0 ? client.sowPhases : sowPhases;
    const updatedSOWPhases = basePhases.map(p => ({
      ...p,
      items: p.items.map(item => item.id === itemId ? { ...item, dueDate: newDueDate } : item)
    }));
    const allItems = updatedSOWPhases.flatMap(p => p.items);

    onUpdateClient({
      ...client,
      sowPhases: updatedSOWPhases,
      sowItems: allItems
    });
  };

  // Active tasks (Open workstreams) vs Completed History
  const activeTasks = client.tasks.filter(t => t.status !== 'Complete' && t.status !== 'Cancelled');
  const completedTasks = client.tasks.filter(t => t.status === 'Complete' || t.status === 'Cancelled');

  const unassignedTasksCount = activeTasks.filter(t => !t.assignedTo).length;
  const highPriorityCount = activeTasks.filter(t => t.priority === 'High').length;

  const filteredActiveTasks = activeTasks.filter(t => {
    if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
    if (workstreamFilter !== 'All' && t.workstream !== workstreamFilter) return false;
    if (assigneeFilter === 'unassigned') {
      if (t.assignedTo) return false;
    } else if (assigneeFilter !== 'All') {
      if (t.assignedTo !== assigneeFilter) return false;
    }
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
    // Non-admin users are strictly not allowed to archive active clients
    if (client.status === 'Active' && !isAdmin) {
      return;
    }
    if (!isAdmin) {
      return;
    }
    const nextStatus = client.status === 'Active' ? 'Inactive' : 'Active';
    onUpdateClient({
      ...client,
      status: nextStatus
    });
  };

  const handleConfirmDeleteClient = async () => {
    if (!isAdmin || !onDeleteClient) return;
    setIsDeletingClient(true);
    try {
      await onDeleteClient(client.id);
      setIsDeleteConfirmOpen(false);
      onBack();
    } catch (err) {
      console.error('Failed to delete client:', err);
    } finally {
      setIsDeletingClient(false);
    }
  };

  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskDesc.trim()) return;

    const chosenPhase = newTaskPhase.trim() ? newTaskPhase.trim() : undefined;

    onAddTask(client.id, {
      description: newTaskDesc.trim(),
      priority: newTaskPriority,
      dueDate: newTaskDueDate,
      assignedTo: newTaskAssignee || null,
      status: 'Not Started',
      phase: chosenPhase,
      deliverableUrl: newTaskDeliverable.trim() || undefined,
      isRecurring: newTaskRecurring
    });

    // Reset form
    setNewTaskDesc('');
    setNewTaskDeliverable('');
    setNewTaskPriority('Medium');
    setNewTaskPhase('');
    setNewTaskRecurring(false);
    setIsAddTaskModalOpen(false);
  };

  const handleAddNoteSubmit = (taskId: string) => {
    const text = (noteInputs[taskId] || '').trim();
    if (!text) return;
    onAddNote(client.id, taskId, text);
    setNoteInputs(prev => ({ ...prev, [taskId]: '' }));
  };

  const handleRunAIAnalysis = async () => {
    setIsLoadingAI(true);
    try {
      const res = await fetch('/api/gemini/analyze-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client,
          activeTasks,
          completedTasks,
          teamMembers
        })
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        setAiAnalysis(data.analysis);
      }
    } catch (err) {
      console.error('Failed to run project analysis with Gemini:', err);
    } finally {
      setIsLoadingAI(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-stone-900 pb-16">
      
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="bg-[#FAF9F5]/90 backdrop-blur-md border-b border-stone-200/90 text-stone-900 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-800 text-xs font-medium transition-all border border-stone-200 cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-stone-500" />
              <span>Dashboard</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-stone-200 text-xs shadow-2xs">
                {firebaseUser?.photoURL ? (
                  <img
                    src={firebaseUser.photoURL}
                    alt={currentUser.name}
                    className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-stone-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-stone-900 text-white font-mono text-[9px] font-medium flex items-center justify-center shrink-0">
                    {currentUser.initials}
                  </div>
                )}
                <span className="font-medium text-stone-900">{currentUser.name}</span>
                <span className="text-[10px] font-mono text-stone-400">
                  ({currentUser.role})
                </span>
                <span className="text-[10px] text-emerald-600 font-mono flex items-center space-x-0.5 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Tenant</span>
                </span>
              </div>

              {firebaseUser && (
                <button
                  type="button"
                  onClick={onSignOutGoogle}
                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-stone-500 hover:text-stone-900 text-xs transition-all cursor-pointer"
                  title="Sign out of workspace"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* 1. Header: Client Title, Type Badge, Status, Admin Archival Controls */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-stone-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-xs text-stone-500 flex-wrap">
              <span className="font-medium text-stone-800">
                {getEngagementTypeLabel(client.type)}
              </span>
              <span aria-hidden="true">·</span>
              <span className={client.status === 'Active' ? 'text-emerald-700 font-medium' : 'text-stone-400'}>
                {client.status === 'Active' ? 'Active' : 'Archived'}
              </span>
              {client.industry && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{client.industry}</span>
                </>
              )}
            </div>

            {/* Client Title / Editable for Admins Only */}
            {isEditingName ? (
              <div className="flex items-center space-x-2 py-1 flex-wrap gap-y-2">
                <input
                  type="text"
                  value={nameText}
                  onChange={(e) => setNameText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveName();
                    } else if (e.key === 'Escape') {
                      setIsEditingName(false);
                      setNameText(client.name);
                    }
                  }}
                  autoFocus
                  className="font-serif text-2xl sm:text-3xl font-normal text-stone-950 bg-stone-50 border border-stone-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-stone-500 w-full max-w-md shadow-2xs"
                  placeholder="Engagement name"
                />
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={handleSaveName}
                    disabled={!nameText.trim()}
                    className="inline-flex items-center space-x-1 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNameText(client.name);
                      setIsEditingName(false);
                    }}
                    className="text-xs text-stone-500 hover:text-stone-700 px-2.5 py-2 cursor-pointer rounded-xl hover:bg-stone-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3 group/name">
                <h1 className="font-serif text-3xl sm:text-4xl font-normal text-stone-950 tracking-tight">
                  {client.name}
                </h1>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setNameText(client.name);
                      setIsEditingName(true);
                    }}
                    className="inline-flex items-center space-x-1 text-xs text-stone-500 hover:text-stone-950 font-medium px-2 py-1 rounded-md hover:bg-stone-100 transition-colors cursor-pointer"
                    title="Rename engagement (Admin only)"
                  >
                    <Edit3 className="w-3 h-3 text-stone-400" />
                    <span>Edit Name</span>
                  </button>
                )}
              </div>
            )}

            {/* Changeable Lead Practice Consultant */}
            <div className="flex items-center space-x-2 pt-1 flex-wrap gap-y-1 text-xs">
              <span className="text-stone-400">Lead Consultant:</span>
              <select
                value={client.leadConsultant || 'All'}
                onChange={(e) => {
                  onUpdateClient({
                    ...client,
                    leadConsultant: e.target.value
                  });
                }}
                className="bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg px-2.5 py-1 text-xs font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 cursor-pointer transition-colors"
                title="Change Lead Practice Consultant"
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

          {/* Archival & Status Controls & SOW Upload */}
          <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-2">
            {isAdmin && onOpenSOWUpload && (
              <button
                type="button"
                onClick={() => onOpenSOWUpload(client.id)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-stone-900 hover:bg-stone-800 text-white shadow-2xs transition-all cursor-pointer"
                title="Upload SOW or add new SOW Phase to this client"
              >
                <Upload className="w-3.5 h-3.5 text-stone-400" />
                <span>Upload SOW / Phase</span>
              </button>
            )}

            {/* Archive Account / Reactivate Controls: Strictly Admin Only */}
            {isAdmin ? (
              <button
                type="button"
                onClick={handleToggleClientStatus}
                className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
                  client.status === 'Active'
                    ? 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200 shadow-2xs'
                    : 'bg-stone-900 hover:bg-stone-800 text-white border-transparent shadow-2xs'
                }`}
                title={client.status === 'Active' ? 'Archive this active client engagement (Admin only)' : 'Reactivate archived client engagement (Admin only)'}
              >
                <Archive className="w-3.5 h-3.5 text-stone-400" />
                <span>{client.status === 'Active' ? 'Archive Account' : 'Reactivate'}</span>
              </button>
            ) : (
              <div 
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-stone-50 rounded-xl text-stone-400 text-xs font-mono border border-stone-200 select-none"
                title={client.status === 'Active' ? 'Non-admin users are not permitted to archive active clients' : 'Non-admin users are not permitted to reactivate inactive clients'}
              >
                <Lock className="w-3 h-3 text-stone-400" />
                <span>{client.status === 'Active' ? 'Archival Locked (Admin Only)' : 'Reactivation Locked (Admin Only)'}</span>
              </div>
            )}

            {/* Permanent Delete Client Control: Strictly Admin Only */}
            {isAdmin && onDeleteClient && (
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 hover:text-rose-800 border border-rose-200 shadow-2xs transition-all cursor-pointer active:scale-[0.98]"
                title="Permanently delete this client card and all associated deliverables (Admin only)"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete Client</span>
              </button>
            )}
          </div>
        </div>

        {/* Prospecting Visual Pipeline Banner (Interactive for any user) */}
        {client.type === 'Prospecting' && (
          <div className="bg-orange-50/90 rounded-3xl p-6 border-2 border-orange-500 shadow-sm">
            <ProspectingTimeline
              client={client}
              currentUser={currentUser}
              isAdmin={isAdmin}
              onUpdateClient={onUpdateClient}
              onPromptWonProspect={onPromptWonProspect}
              compact={false}
            />
          </div>
        )}

        {/* 2. Project Summary Section: Editable for Admins */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
            <h3 className="text-xs font-mono uppercase tracking-wider text-stone-500 flex items-center space-x-2">
              <Building2 className="w-3.5 h-3.5 text-stone-500" />
              <span>Project Summary & Strategic Scope</span>
            </h3>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleRunAIAnalysis}
                disabled={isLoadingAI}
                className="inline-flex items-center space-x-1.5 px-3 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-medium transition-all shadow-2xs cursor-pointer active:scale-[0.98] disabled:opacity-60"
                title="Run Chapter 3 Gemini AI Project Health Assessment"
              >
                <Sparkles className={`w-3.5 h-3.5 text-stone-300 ${isLoadingAI ? 'animate-spin' : ''}`} />
                <span>{isLoadingAI ? 'Analyzing...' : aiAnalysis ? 'Refresh Assessment' : 'AI Health Assessment'}</span>
              </button>

              {isAdmin && (
                !isEditingSummary ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingSummary(true)}
                    className="inline-flex items-center space-x-1 text-xs text-stone-700 hover:text-stone-950 font-medium px-2 py-1 rounded-md hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3 text-stone-400" />
                    <span>Edit Scope</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleSaveSummary}
                      className="inline-flex items-center space-x-1 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium px-3 py-1 rounded-lg transition-colors shadow-2xs cursor-pointer"
                    >
                      <Save className="w-3 h-3" />
                      <span>Save</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSummaryText(client.projectSummary);
                        setIsEditingSummary(false);
                      }}
                      className="text-xs text-stone-500 hover:text-stone-700 px-2 py-1 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )
              )}
            </div>
          </div>

          {isEditingSummary ? (
            <textarea
              rows={4}
              value={summaryText}
              onChange={(e) => setSummaryText(e.target.value)}
              className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:ring-1 focus:ring-stone-400 focus:outline-none leading-relaxed"
              placeholder="Enter client scope, objectives, and deliverables..."
            />
          ) : (
            <p className="text-sm text-stone-700 leading-relaxed font-normal">
              {client.projectSummary || 'No project summary provided.'}
            </p>
          )}

          {/* AI Strategic Assessment Results Card */}
          {aiAnalysis && (
            <div className="mt-4 p-5 bg-stone-900 text-stone-100 rounded-2xl border border-stone-800 shadow-md space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-stone-800 flex items-center justify-center text-amber-400 border border-stone-700">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-serif text-stone-100 tracking-tight text-sm font-normal">
                      Executive Strategic Assessment
                    </h4>
                    <p className="text-[10px] text-stone-400 font-mono">
                      Powered by Gemini 3.8 Flash · Chapter 3 Operations Advisory
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1.5 bg-stone-800 px-3 py-1 rounded-xl border border-stone-700 text-xs font-mono">
                    <span className="text-stone-400 text-[11px]">Health:</span>
                    <strong className="text-stone-100 font-bold">{aiAnalysis.healthScore}/100</strong>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-sans font-medium ${
                      aiAnalysis.healthScore >= 80 ? 'bg-emerald-950 text-emerald-300' :
                      aiAnalysis.healthScore >= 60 ? 'bg-amber-950 text-amber-300' :
                      'bg-rose-950 text-rose-300'
                    }`}>
                      {aiAnalysis.healthStatus || (aiAnalysis.healthScore >= 80 ? 'On Track' : 'Attention Needed')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAiAnalysis(null)}
                    className="text-stone-400 hover:text-stone-200 p-1 cursor-pointer"
                    title="Dismiss Assessment"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Assessment Narrative */}
              <p className="text-xs text-stone-300 leading-relaxed">
                {aiAnalysis.executiveSummary}
              </p>

              {/* Bottlenecks & Recommendations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Bottlenecks / Risks */}
                <div className="bg-stone-950/60 p-3.5 rounded-xl border border-stone-800/80 space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400/90 block font-semibold">
                    Identified Bottlenecks & Timeline Risks:
                  </span>
                  {aiAnalysis.bottlenecks && aiAnalysis.bottlenecks.length > 0 ? (
                    <ul className="space-y-1 text-stone-300 text-[11px]">
                      {aiAnalysis.bottlenecks.map((b, idx) => (
                        <li key={idx} className="flex items-start space-x-1.5">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-stone-400 text-[11px] italic">No active bottlenecks detected.</p>
                  )}
                </div>

                {/* Recommendations */}
                <div className="bg-stone-950/60 p-3.5 rounded-xl border border-stone-800/80 space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/90 block font-semibold">
                    Consulting Action Items:
                  </span>
                  {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 ? (
                    <ul className="space-y-1 text-stone-300 text-[11px]">
                      {aiAnalysis.recommendations.map((r, idx) => (
                        <li key={idx} className="flex items-start space-x-1.5">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-stone-400 text-[11px] italic">Maintain current execution cadence.</p>
                  )}
                </div>
              </div>

              {aiAnalysis.workloadAssessment && (
                <p className="text-[11px] text-stone-400 font-mono pt-1 border-t border-stone-800">
                  Workload: {aiAnalysis.workloadAssessment}
                </p>
              )}
            </div>
          )}

          {isLoadingAI && !aiAnalysis && (
            <div className="mt-4 p-4 bg-stone-100 rounded-2xl border border-stone-200 text-xs flex items-center space-x-3 text-stone-600 animate-pulse">
              <Sparkles className="w-4 h-4 text-stone-500 animate-spin" />
              <span>Chapter 3 Strategic Operations Engine analyzing milestones & team workload with Gemini 3.8 Flash...</span>
            </div>
          )}

          {/* If Project type, show completion summary */}
          {client.type === 'Project' && (
            <div className="mt-4 pt-4 border-t border-stone-100">
              <div className="flex items-center justify-between text-xs mb-1.5 font-mono tabular-nums">
                <span className="text-stone-500">
                  Deliverables ({stats.completedTasks}/{stats.totalTasks} Completed)
                </span>
                <span className="font-semibold text-stone-900">
                  {stats.percentage}%
                </span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-stone-900 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(stats.percentage, 3))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Scope of Work (SOW) Section: Exact wording and phases from uploaded SOW */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <h3 className="font-serif text-lg font-normal text-stone-950 tracking-tight">
                  Scope of Work
                </h3>
                {sowPhases.length > 0 && (
                  <span className="text-[11px] font-mono bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-full border border-stone-200">
                    {sowPhases.length} {sowPhases.length === 1 ? 'Phase' : 'Phases'} · {totalSOWActionItems} SOW Items
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Direct literal wording and phases pulled from the uploaded SOW contract. Action items are tracked separately from manually created CRM workstreams.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {isAdmin && onOpenSOWUpload && (
                <button
                  type="button"
                  onClick={() => onOpenSOWUpload(client.id)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors cursor-pointer border border-stone-200/80"
                  title="Upload or update SOW document"
                >
                  <Upload className="w-3.5 h-3.5 text-stone-500" />
                  <span>{sowPhases.length > 0 ? 'Update SOW' : 'Upload SOW'}</span>
                </button>
              )}
            </div>
          </div>

          {sowPhases.length === 0 ? (
            <div className="p-8 text-center bg-stone-50/60 rounded-xl border border-dashed border-stone-200 space-y-3">
              <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
                <FileText className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-stone-700">No Scope of Work phases found</p>
                <p className="text-[11px] text-stone-500 max-w-md mx-auto">
                  Upload an SOW document to automatically extract and populate contract phases and literal action items here.
                </p>
              </div>
              {isAdmin && onOpenSOWUpload && (
                <button
                  type="button"
                  onClick={() => onOpenSOWUpload(client.id)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-stone-900 hover:bg-stone-800 text-white transition-colors cursor-pointer shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Statement of Work</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {sowPhases.map((phase, pIdx) => {
                const phaseCompletedCount = phase.items.filter(i => i.status === 'Complete').length;
                return (
                  <div key={phase.id || `phase-${pIdx}`} className="space-y-3">
                    {/* Phase Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-stone-200/80">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold bg-stone-100 px-2 py-0.5 rounded">
                          Phase {pIdx + 1}
                        </span>
                        <h4 className="text-sm font-semibold text-stone-900">
                          {phase.name}
                        </h4>
                        {phase.timeline && (
                          <span className="text-[11px] font-mono text-stone-500 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-md">
                            {phase.timeline}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-stone-500">
                        {phaseCompletedCount}/{phase.items.length} completed
                      </span>
                    </div>

                    {/* Cards for each SOW action item organized under Phase header */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {phase.items.map((item) => {
                        const isComplete = item.status === 'Complete';
                        const isInProgress = item.status === 'In Progress';
                        const isBlocked = item.status === 'Blocked';

                        return (
                          <div
                            key={item.id}
                            className={`rounded-xl p-4 border transition-all flex flex-col justify-between space-y-3.5 ${
                              isComplete
                                ? 'bg-stone-50/70 border-stone-200/60 opacity-85'
                                : isInProgress
                                ? 'bg-amber-50/40 border-amber-200/80 shadow-2xs'
                                : isBlocked
                                ? 'bg-rose-50/40 border-rose-200/80 shadow-2xs'
                                : 'bg-white border-stone-200/90 shadow-2xs hover:border-stone-300'
                            }`}
                          >
                            {/* Exact wording from SOW */}
                            <div className="space-y-2">
                              <p className={`text-xs leading-relaxed font-normal ${
                                isComplete ? 'line-through text-stone-400' : 'text-stone-850'
                              }`}>
                                {item.wording}
                              </p>

                              {item.workstream && (
                                <span className="inline-block text-[10px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                                  {item.workstream}
                                </span>
                              )}
                            </div>

                            {/* Simple Layout: Due Date & "In Progress" Dropdown */}
                            <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-stone-100 text-xs">
                              {/* Due Date */}
                              <div className="flex items-center space-x-1.5 text-stone-600">
                                <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                <label className="text-[11px] text-stone-500 font-mono">Due:</label>
                                <input
                                  type="date"
                                  value={item.dueDate || ''}
                                  onChange={(e) => handleUpdateSOWItemDueDate(item.id, e.target.value)}
                                  className="text-[11px] font-mono bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded px-1.5 py-0.5 text-stone-700 cursor-pointer focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                                  title="Change SOW item due date"
                                />
                              </div>

                              {/* "In Progress" Dropdown */}
                              <div className="flex items-center space-x-1.5">
                                <select
                                  value={item.status || 'Not Started'}
                                  onChange={(e) => handleUpdateSOWItemStatus(item.id, e.target.value as SOWItemStatus)}
                                  className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border cursor-pointer focus:outline-none transition-colors ${
                                    isComplete
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                                      : isInProgress
                                      ? 'bg-amber-50 text-amber-900 border-amber-300 font-semibold'
                                      : isBlocked
                                      ? 'bg-rose-50 text-rose-800 border-rose-300 font-semibold'
                                      : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200/70'
                                  }`}
                                  title="Update status"
                                >
                                  <option value="Not Started">Not Started</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Complete">Complete</option>
                                  <option value="Blocked">Blocked</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* View Tabs */}
        <div className="flex items-center space-x-1 bg-stone-200/60 p-1 rounded-xl w-fit text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'tasks'
                ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5 text-stone-500" />
            <span>Active Workstreams</span>
            <span className="font-mono text-[10px] tabular-nums text-stone-400">
              ({activeTasks.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-stone-500" />
            <span>Completed History</span>
            <span className="font-mono text-[10px] tabular-nums text-stone-400">
              ({completedTasks.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sow')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'sow'
                ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-stone-500" />
            <span>Statement of Work (SOW)</span>
            <span className="font-mono text-[10px] tabular-nums text-stone-400">
              ({client.tasks.length})
            </span>
          </button>
        </div>

        {/* Tab 1: Active Tasks Management */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            
            {/* Action Bar & Search / Filter Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-stone-200/90 shadow-2xs">
              <div className="flex items-center space-x-2 flex-1 flex-wrap gap-y-2">
                <input
                  type="text"
                  placeholder="Filter tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-44 px-2.5 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400"
                />

                {/* Workstream Filter if client has workstreams */}
                {client.sow?.workstreams && client.sow.workstreams.length > 0 && (
                  <div className="flex items-center space-x-1.5 text-xs">
                    <span className="text-slate-400 font-medium text-[11px]">Workstream:</span>
                    <select
                      value={workstreamFilter}
                      onChange={(e) => setWorkstreamFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none"
                    >
                      <option value="All">All Workstreams</option>
                      {client.sow.workstreams.map(ws => (
                        <option key={ws} value={ws}>{ws.replace(/^\d+\.\s*/, '')}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Assignee Filter Dropdown */}
                <div className="flex items-center space-x-1.5 text-xs">
                  <span className="text-slate-400 font-medium text-[11px]">Assignee:</span>
                  <select
                    value={assigneeFilter}
                    onChange={(e) => setAssigneeFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none"
                  >
                    <option value="All">All Members ({activeTasks.length})</option>
                    <option value="unassigned">⚡ Needs Assignee ({unassignedTasksCount})</option>
                    {teamMembers.map(m => {
                      const count = activeTasks.filter(t => t.assignedTo === m.email).length;
                      return (
                        <option key={m.id} value={m.email}>{m.name} ({count})</option>
                      );
                    })}
                  </select>
                </div>

                {/* Priority Pills */}
                <div className="flex items-center space-x-1 text-xs">
                  {(['All', 'High', 'Medium', 'Low'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriorityFilter(p)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                        priorityFilter === p ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Quick Needs Assignee Pill */}
                {unassignedTasksCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setAssigneeFilter(assigneeFilter === 'unassigned' ? 'All' : 'unassigned')}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-all flex items-center space-x-1 cursor-pointer ${
                      assigneeFilter === 'unassigned'
                        ? 'bg-amber-800 text-white font-semibold'
                        : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 font-medium'
                    }`}
                  >
                    <span>Needs Assignee</span>
                    <span className="font-mono text-[10px] tabular-nums font-bold">
                      ({unassignedTasksCount})
                    </span>
                  </button>
                )}
              </div>

              {/* Add Task Button (Admins & Users can create tasks) */}
              <button
                type="button"
                onClick={() => setIsAddTaskModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-medium shadow-2xs transition-all cursor-pointer active:scale-[0.98]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>

            {/* Active Tasks List */}
            {filteredActiveTasks.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-stone-200">
                <CheckCircle2 className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <h4 className="text-xs font-semibold text-stone-800">No Active Tasks</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mt-0.5">
                  All workstreams for {client.name} are completed or archived. Click "Add Task" to create a new deliverable.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredActiveTasks.map((task) => {
                  const overdue = isOverdue(task.dueDate, task.status);
                  const isNotesExpanded = expandedNotesId === task.id;
                  const assignedMember = teamMembers.find(m => m.email === task.assignedTo);

                  return (
                    <div
                      key={task.id}
                      className="bg-white rounded-xl p-4 border border-stone-200/90 shadow-2xs hover:border-stone-300 transition-all space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1 text-xs">
                            {/* PRIORITY: Editable by Admin, Read-only for Users */}
                            {isAdmin ? (
                              <div className="relative inline-flex items-center">
                                <select
                                  value={task.priority}
                                  onChange={(e) => onUpdateTaskPriority(client.id, task.id, e.target.value as TaskPriority)}
                                  title="Admin: Change Priority"
                                  className={`text-[10px] font-mono uppercase px-2 py-0.5 pr-5 rounded-md border appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-stone-400 transition-colors font-semibold ${
                                    task.priority === 'High' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    task.priority === 'Medium' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                    task.priority === 'Low' ? 'bg-stone-50 text-stone-700 border-stone-200' :
                                    'bg-stone-50 text-stone-500 border-stone-200'
                                  }`}
                                >
                                  <option value="High">High</option>
                                  <option value="Medium">Medium</option>
                                  <option value="Low">Low</option>
                                  <option value="Unassigned">Unassigned</option>
                                </select>
                                <ChevronDown className="w-2.5 h-2.5 absolute right-1.5 pointer-events-none opacity-50 text-stone-500" />
                              </div>
                            ) : (
                              <span
                                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border font-semibold ${
                                  task.priority === 'High' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                  task.priority === 'Medium' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                  task.priority === 'Low' ? 'bg-stone-50 text-stone-700 border-stone-200' :
                                  'bg-stone-50 text-stone-500 border-stone-200'
                                }`}
                              >
                                {task.priority}
                              </span>
                            )}

                            {/* DUE DATE: Editable by Admin, Read-only for Users */}
                            {isAdmin ? (
                              <label
                                title="Admin: Click to edit due date"
                                className={`inline-flex items-center space-x-1.5 text-xs px-2.5 py-0.5 rounded-lg border cursor-pointer hover:border-slate-400 transition-all ${
                                  overdue
                                    ? 'bg-rose-100 text-rose-800 border-rose-400 font-bold shadow-xs'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 font-medium'
                                }`}
                              >
                                <Calendar className={`w-3.5 h-3.5 shrink-0 ${overdue ? 'text-rose-700' : 'text-slate-500'}`} />
                                <span className="font-bold text-[11px] text-slate-600">Due:</span>
                                <input
                                  type="date"
                                  value={task.dueDate}
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      onUpdateTaskDueDate(client.id, task.id, e.target.value);
                                    }
                                  }}
                                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer border-none p-0 outline-none"
                                />
                                {overdue && <span className="text-rose-700 font-black uppercase text-[10px] ml-0.5">(OVERDUE)</span>}
                              </label>
                            ) : (
                              <span
                                title="Due date set by Admin (Admin role required to edit)"
                                className={`inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg border ${
                                  overdue
                                    ? 'bg-rose-100 text-rose-800 border-rose-400 font-bold shadow-xs'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 font-medium'
                                }`}
                              >
                                <Clock className={`w-3.5 h-3.5 shrink-0 ${overdue ? 'text-rose-700' : 'text-slate-400'}`} />
                                <span>Due: {formatDate(task.dueDate)}</span>
                                {overdue && <span className="text-rose-700 font-black uppercase ml-0.5">(OVERDUE)</span>}
                              </span>
                            )}

                            {/* SOW Phase Link & Selector */}
                            {isAdmin && onUpdateTaskPhase ? (
                              <div className="relative inline-flex items-center">
                                <select
                                  value={task.phase || ''}
                                  onChange={(e) => onUpdateTaskPhase(client.id, task.id, e.target.value || undefined)}
                                  title="Admin: Assign or change SOW Phase"
                                  className={`text-[10px] font-bold px-2 py-1 pr-5 rounded-md border appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors ${
                                    task.phase
                                      ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                                      : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200'
                                  }`}
                                >
                                  <option value="">-- Not in SOW --</option>
                                  {((client.phases && client.phases.length > 0) ? client.phases : ['Phase 1: Discovery', 'Phase 2: Strategy & Design', 'Phase 3: Execution & Delivery']).map(p => (
                                    <option key={p} value={p}>SOW: {p}</option>
                                  ))}
                                </select>
                                <ChevronDown className="w-2.5 h-2.5 absolute right-1.5 pointer-events-none opacity-60 text-slate-500" />
                              </div>
                            ) : (
                              task.phase && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center space-x-1" title="Synced with SOW Gantt">
                                  <FolderKanban className="w-2.5 h-2.5" />
                                  <span>SOW: {task.phase}</span>
                                </span>
                              )
                            )}

                            {task.workstream && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 flex items-center space-x-1" title={`SOW Workstream: ${task.workstream}`}>
                                <span>{task.workstream.replace(/^\d+\.\s*/, '')}</span>
                              </span>
                            )}

                            {task.isRecurring && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 flex items-center space-x-1">
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Recurring Cadence</span>
                              </span>
                            )}
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
                        
                        {/* Assignee Selector with Avatar and Quick Claim */}
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="text-[11px] font-bold text-slate-400 uppercase">Assignee:</span>
                          <div className="flex items-center space-x-1.5">
                            {assignedMember ? (
                              <div
                                className={`w-5 h-5 rounded-full bg-gradient-to-br ${assignedMember.avatarColor} text-white font-bold text-[9px] flex items-center justify-center shrink-0 shadow-xs`}
                                title={assignedMember.name}
                              >
                                {assignedMember.initials}
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-amber-100 border border-dashed border-amber-400 text-amber-700 font-bold text-[9px] flex items-center justify-center shrink-0" title="Unassigned deliverable">
                                ?
                              </div>
                            )}

                            <select
                              value={task.assignedTo || ''}
                              onChange={(e) => onUpdateTaskAssignee(client.id, task.id, e.target.value || null)}
                              className={`rounded-lg px-2 py-1 text-xs font-semibold cursor-pointer border transition-colors ${
                                task.assignedTo
                                  ? 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                                  : 'bg-amber-50 border-amber-300 text-amber-900 font-bold hover:bg-amber-100'
                              }`}
                            >
                              <option value="">-- Unassigned --</option>
                              {teamMembers.map(m => (
                                <option key={m.id} value={m.email}>{m.name} ({m.title || m.role})</option>
                              ))}
                            </select>

                            {!task.assignedTo && (
                              <button
                                type="button"
                                onClick={() => onUpdateTaskAssignee(client.id, task.id, currentUser.email)}
                                className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-md text-[10px] font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
                                title={`Assign this deliverable to yourself (${currentUser.name})`}
                              >
                                Take Task ({currentUser.initials})
                              </button>
                            )}
                          </div>
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

        {/* Tab 3: SOW Executive Document & Phase Board */}
        {activeTab === 'sow' && (
          <SOWDetailTab
            client={client}
            currentUser={currentUser}
            teamMembers={teamMembers}
            onOpenSOWUpload={onOpenSOWUpload || (() => {})}
            onAddTask={onAddTask}
            onUpdateClient={onUpdateClient}
            onUpdateTaskStatus={onUpdateTaskStatus}
            onUpdateTaskAssignee={onUpdateTaskAssignee}
            onUpdateTaskPriority={onUpdateTaskPriority}
            onUpdateTaskDueDate={onUpdateTaskDueDate}
            onDeleteTask={onDeleteTask}
          />
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
              <TaskDescriptionInput
                id="active-workstream-task-desc"
                value={newTaskDesc}
                onChange={setNewTaskDesc}
                label="Task Description *"
                labelClassName="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1"
                placeholder="e.g. Conduct ICP buyer persona validation interviews"
                required
                autoFocus
              />

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  SOW Phase Assignment (Optional)
                </label>
                <select
                  value={newTaskPhase}
                  onChange={(e) => setNewTaskPhase(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold"
                >
                  <option value="">-- None (General Workstream, not in SOW) --</option>
                  {((client.phases && client.phases.length > 0) ? client.phases : ['Phase 1: Discovery', 'Phase 2: Strategy & Design', 'Phase 3: Execution & Delivery']).map(p => (
                    <option key={p} value={p}>SOW: {p}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Leave as None for general tasks, or choose an SOW Phase to automatically sync with the SOW Gantt chart.
                </p>
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
                  <option value="">-- Unassigned (Needs Assignee) --</option>
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

      {/* Admin Permanent Delete Client Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div 
          className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsDeleteConfirmOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 border border-stone-200 shadow-2xl space-y-4 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-normal text-stone-950">
                    Permanently Delete Client?
                  </h3>
                  <span className="text-[10px] font-mono text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md font-semibold">
                    Admin Action · Irreversible
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-stone-600 space-y-2 leading-relaxed">
              <p>
                Are you sure you want to permanently delete <strong className="text-stone-950">{client.name}</strong>?
              </p>
              <p className="bg-stone-50 border border-stone-200 p-3 rounded-xl text-[11px] text-stone-500 font-mono">
                This will permanently delete this client card, all <strong className="text-stone-800 font-semibold">{client.tasks?.length || 0}</strong> deliverables, consultant notes, deliverable URLs, and any attached SOW files from Firestore. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={isDeletingClient}
                className="px-3.5 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 rounded-xl border border-stone-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteClient}
                disabled={isDeletingClient}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-2xs transition-colors cursor-pointer disabled:opacity-50 active:scale-[0.98]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingClient ? 'Deleting...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
