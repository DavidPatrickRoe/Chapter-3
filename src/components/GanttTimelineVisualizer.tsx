import React, { useState } from 'react';
import { 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Users, 
  Plus,
  Edit3,
  Save,
  X,
  Trash2,
  GripVertical,
  ExternalLink,
  Layers,
  ArrowRight,
  FolderKanban,
  Check,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet
} from 'lucide-react';
import { Client, Task, TaskPriority, TaskStatus, TeamMember } from '../types';
import { formatDate, getProjectCompletionStats, isOverdue } from '../utils/helpers';

interface GanttTimelineVisualizerProps {
  client: Client;
  currentUser: TeamMember;
  teamMembers: TeamMember[];
  onAddTask?: (clientId: string, task: Omit<Task, 'id' | 'clientId' | 'notes'>) => void;
  onUpdateClient?: (updatedClient: Client) => void;
  onUpdateTaskStatus?: (clientId: string, taskId: string, status: TaskStatus) => void;
  onUpdateTaskAssignee?: (clientId: string, taskId: string, assigneeEmail: string | null) => void;
  onDeleteTask?: (clientId: string, taskId: string) => void;
}

interface AIAnalysisResult {
  executiveSummary: string;
  healthScore: number;
  healthStatus?: string;
  keyStrengths?: string[];
  bottlenecks: string[];
  workloadAssessment?: string;
  recommendations: string[];
}

export const GanttTimelineVisualizer: React.FC<GanttTimelineVisualizerProps> = ({
  client,
  currentUser,
  teamMembers,
  onAddTask,
  onUpdateClient,
  onUpdateTaskStatus,
  onUpdateTaskAssignee,
  onDeleteTask
}) => {
  const isAdmin = currentUser.role === 'Admin';

  // AI assessment state
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [selectedTimelineFilter, setSelectedTimelineFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Add Task Modal State (mimicking the Active Workstream modal)
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [newTaskPhase, setNewTaskPhase] = useState<string>('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('Unassigned');
  const [newTaskDueDate, setNewTaskDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('');
  const [newTaskRecurring, setNewTaskRecurring] = useState(false);
  const [newTaskDeliverable, setNewTaskDeliverable] = useState('');

  // Phase management state
  const [isAddPhaseModalOpen, setIsAddPhaseModalOpen] = useState(false);
  const [newPhaseNameInput, setNewPhaseNameInput] = useState('');
  const [editingPhaseIdx, setEditingPhaseIdx] = useState<number | null>(null);
  const [editingPhaseName, setEditingPhaseName] = useState('');

  // Drag and Drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverPhase, setDragOverPhase] = useState<string | null>(null);

  // Compute active phases for this client
  const defaultPhases = ['Phase 1: Discovery', 'Phase 2: Strategy & Design', 'Phase 3: Execution & Delivery'];
  const phases = (client.phases && client.phases.length > 0) ? client.phases : defaultPhases;

  const stats = getProjectCompletionStats(client);
  const activeTasks = client.tasks.filter(t => t.status !== 'Complete' && t.status !== 'Cancelled');
  const completedTasks = client.tasks.filter(t => t.status === 'Complete');

  // Helper to truncate text to a maximum character count before adding ellipsis
  const truncateText = (text: string, maxLength: number = 300): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trimEnd() + '...';
  };

  // Helper to get normalized phase for a task
  const getTaskPhase = (task: Task): string => {
    if (task.phase && phases.includes(task.phase)) {
      return task.phase;
    }
    // Default to first phase
    return phases[0] || 'Phase 1: Discovery';
  };

  // Open add task modal with preselected phase
  const handleOpenAddTask = (phaseName?: string) => {
    const targetPhase = phaseName || phases[0] || 'Phase 1: Discovery';
    setNewTaskPhase(targetPhase);
    setNewTaskDesc('');
    setNewTaskPriority('Unassigned'); // Default Unassigned as requested
    setNewTaskAssignee(''); // Default Unassigned user as requested
    setNewTaskRecurring(false); // Default unchecked as requested
    setNewTaskDeliverable('');
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setNewTaskDueDate(d.toISOString().split('T')[0]);
    setIsAddTaskModalOpen(true);
  };

  // Submit new task handler
  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskDesc.trim()) return;

    const chosenPhase = newTaskPhase.trim() || phases[0] || 'Phase 1: Discovery';

    if (onAddTask) {
      onAddTask(client.id, {
        description: newTaskDesc.trim(),
        priority: newTaskPriority, // Defaults to 'Unassigned'
        assignedTo: newTaskAssignee ? newTaskAssignee : null, // Defaults to 'Unassigned' (null)
        dueDate: newTaskDueDate,
        status: 'Not Started',
        phase: chosenPhase,
        deliverableUrl: newTaskDeliverable.trim() || undefined,
        isRecurring: newTaskRecurring // Defaults to false
      });
    }

    setIsAddTaskModalOpen(false);
  };

  // Add a new phase
  const handleAddPhaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPhaseNameInput.trim();
    if (!name || !onUpdateClient) return;

    if (phases.includes(name)) {
      setIsAddPhaseModalOpen(false);
      setNewPhaseNameInput('');
      return;
    }

    const updatedPhases = [...phases, name];
    onUpdateClient({
      ...client,
      phases: updatedPhases
    });

    setNewPhaseNameInput('');
    setIsAddPhaseModalOpen(false);
  };

  // Save renamed phase
  const handleSaveRenamePhase = (idx: number) => {
    const oldName = phases[idx];
    const newName = editingPhaseName.trim();
    if (!newName || !onUpdateClient || oldName === newName) {
      setEditingPhaseIdx(null);
      return;
    }

    const updatedPhases = [...phases];
    updatedPhases[idx] = newName;

    // Also update all tasks that were in oldName to newName
    const updatedTasks = client.tasks.map(t => {
      const currentPhase = getTaskPhase(t);
      if (currentPhase === oldName) {
        return { ...t, phase: newName };
      }
      return t;
    });

    onUpdateClient({
      ...client,
      phases: updatedPhases,
      tasks: updatedTasks
    });

    setEditingPhaseIdx(null);
    setEditingPhaseName('');
  };

  // Delete phase
  const handleDeletePhase = (phaseToDelete: string) => {
    if (!onUpdateClient || phases.length <= 1) return;

    const remainingPhases = phases.filter(p => p !== phaseToDelete);
    const fallbackPhase = remainingPhases[0] || 'Phase 1: Discovery';

    // Move any tasks in the deleted phase to fallbackPhase
    const updatedTasks = client.tasks.map(t => {
      if (getTaskPhase(t) === phaseToDelete) {
        return { ...t, phase: fallbackPhase };
      }
      return t;
    });

    onUpdateClient({
      ...client,
      phases: remainingPhases,
      tasks: updatedTasks
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, phaseName: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverPhase !== phaseName) {
      setDragOverPhase(phaseName);
    }
  };

  const handleDragLeave = (e: React.DragEvent, phaseName: string) => {
    if (dragOverPhase === phaseName) {
      setDragOverPhase(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetPhase: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDragOverPhase(null);
    setDraggedTaskId(null);

    if (!taskId || !onUpdateClient) return;

    const updatedTasks = client.tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, phase: targetPhase };
      }
      return t;
    });

    onUpdateClient({
      ...client,
      tasks: updatedTasks
    });
  };

  // Move task to phase via dropdown/button
  const handleMoveTaskPhase = (taskId: string, targetPhase: string) => {
    if (!onUpdateClient) return;
    const updatedTasks = client.tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, phase: targetPhase };
      }
      return t;
    });
    onUpdateClient({
      ...client,
      tasks: updatedTasks
    });
  };

  // Calculate consultant workload map
  const workloadByMember = teamMembers.map(member => {
    const memberTasks = client.tasks.filter(t => t.assignedTo === member.email);
    const activeCount = memberTasks.filter(t => t.status !== 'Complete' && t.status !== 'Cancelled').length;
    const completedCount = memberTasks.filter(t => t.status === 'Complete').length;
    const highPriorityCount = memberTasks.filter(t => t.priority === 'High' && t.status !== 'Complete').length;
    
    return {
      member,
      total: memberTasks.length,
      activeCount,
      completedCount,
      highPriorityCount
    };
  }).filter(w => w.total > 0 || w.activeCount > 0);

  // Call the server Gemini AI Analysis endpoint
  const handleRunAIAnalysis = async () => {
    setLoadingAI(true);
    try {
      const response = await fetch('/api/gemini/analyze-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client,
          activeTasks,
          completedTasks,
          teamMembers
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.analysis) {
        setAiAnalysis(data.analysis);
      } else {
        throw new Error(data.error || 'Failed to parse AI assessment');
      }
    } catch (err: any) {
      console.error('AI Analysis failed:', err);
      // Fallback local heuristic analysis
      const highCount = activeTasks.filter(t => t.priority === 'High').length;
      const score = Math.max(40, Math.min(95, 100 - highCount * 12));
      setAiAnalysis({
        executiveSummary: `Project "${client.name}" has ${activeTasks.length} active deliverables underway across ${workloadByMember.length} team consultants, with a milestone completion rate of ${stats.percentage}%.`,
        healthScore: score,
        healthStatus: score > 75 ? 'On Track' : 'Attention Needed',
        keyStrengths: [
          `Structured into ${phases.length} distinct SOW execution phases.`,
          `${completedTasks.length} verified milestone deliverables completed.`
        ],
        bottlenecks: highCount > 0 
          ? [`${highCount} high-priority workstreams currently in progress requiring executive review.`]
          : ['No critical timeline blockers detected.'],
        workloadAssessment: 'Deliverables are structured across practice phases.',
        recommendations: [
          'Review upcoming SOW phase deadlines with project steering committee.',
          'Assign unassigned deliverables prior to phase kickoffs.',
          'Validate deliverable URLs before final milestone sign-offs.'
        ]
      });
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* SOW Hero & Executive Control Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1.5 flex-wrap gap-y-1">
              <span className="bg-sky-500/20 text-sky-300 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-sky-400/30 flex items-center space-x-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
                <span>Statement of Work (SOW) Deliverables</span>
              </span>
              <span className="text-slate-400 text-xs">• {phases.length} Execution Phases</span>
              <span className="text-slate-400 text-xs">• {client.tasks.length} Total Deliverables</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white font-serif">
              SOW Phase Breakdown & Gantt Deliverables
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Enumerate SOW deliverables by phase, schedule target delivery dates, and drag-and-drop tasks between phases. All tasks populate directly into Active Workstreams.
            </p>
          </div>

          {/* Action Buttons: Add Task (Admin), Add Phase, Run AI */}
          <div className="flex items-center space-x-2.5 flex-wrap gap-y-2 shrink-0">
            {isAdmin ? (
              <button
                type="button"
                onClick={() => handleOpenAddTask()}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-bold text-xs shadow-lg shadow-sky-900/40 transition-all cursor-pointer"
                title="Add a new deliverable as enumerated in the SOW"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add SOW Task</span>
              </button>
            ) : (
              <div className="px-3 py-2 bg-slate-800/80 rounded-2xl border border-slate-700 text-[11px] text-slate-400">
                <span>Admin required to add SOW tasks</span>
              </div>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsAddPhaseModalOpen(true)}
                className="flex items-center space-x-1 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-2xl font-bold text-xs transition-all cursor-pointer"
                title="Create a new Phase section"
              >
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>+ Add Phase</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRunAIAnalysis}
              disabled={loadingAI}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-2xl font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-60"
              title="Run Gemini strategic delivery review"
            >
              <Sparkles className={`w-3.5 h-3.5 ${loadingAI ? 'animate-spin' : ''}`} />
              <span>{loadingAI ? 'Analyzing...' : 'Strategic Assessment'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Assessment Section (If Available) */}
      {aiAnalysis && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <h4 className="text-sm font-bold text-slate-900">
                Strategic SOW Delivery Assessment
              </h4>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500">Health Score:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                aiAnalysis.healthScore >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {aiAnalysis.healthScore}/100 • {aiAnalysis.healthStatus || 'On Track'}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed mb-3">
            {aiAnalysis.executiveSummary}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <p className="font-bold text-slate-800 mb-1 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Key Milestones & Strengths</span>
              </p>
              <ul className="space-y-1 text-slate-600 text-[11px]">
                {(aiAnalysis.keyStrengths || []).map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <p className="font-bold text-slate-800 mb-1 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Recommendations</span>
              </p>
              <ul className="space-y-1 text-slate-600 text-[11px]">
                {(aiAnalysis.recommendations || []).map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main SOW Gantt Timeline by Phase */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
        
        {/* Timeline Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h4 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Calendar className="w-4.5 h-4.5 text-sky-600" />
              <span>Gantt Deliverables Timeline & Phase Board</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Drag and drop tasks between phases or click "+ Add SOW Task" to schedule milestone deliverables
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setSelectedTimelineFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                selectedTimelineFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({client.tasks.length})
            </button>
            <button
              onClick={() => setSelectedTimelineFilter('active')}
              className={`px-3 py-1 rounded-lg transition-all ${
                selectedTimelineFilter === 'active' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Active ({activeTasks.length})
            </button>
            <button
              onClick={() => setSelectedTimelineFilter('completed')}
              className={`px-3 py-1 rounded-lg transition-all ${
                selectedTimelineFilter === 'completed' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Completed ({completedTasks.length})
            </button>
          </div>
        </div>

        {/* Phase-by-Phase Grouped Gantt Board */}
        <div className="space-y-6">
          {phases.map((phaseName, phaseIdx) => {
            // Find tasks belonging to this phase
            const phaseAllTasks = client.tasks.filter(t => getTaskPhase(t) === phaseName);
            
            // Filter according to active/completed/all
            const phaseTasks = phaseAllTasks
              .filter(t => {
                if (selectedTimelineFilter === 'active') return t.status !== 'Complete' && t.status !== 'Cancelled';
                if (selectedTimelineFilter === 'completed') return t.status === 'Complete';
                return true;
              })
              .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));

            const completedPhaseCount = phaseAllTasks.filter(t => t.status === 'Complete').length;
            const isEditingThisPhase = editingPhaseIdx === phaseIdx;
            const isDropTarget = dragOverPhase === phaseName;

            return (
              <div
                key={phaseName}
                onDragOver={(e) => handleDragOver(e, phaseName)}
                onDragLeave={(e) => handleDragLeave(e, phaseName)}
                onDrop={(e) => handleDrop(e, phaseName)}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isDropTarget 
                    ? 'border-2 border-sky-500 bg-sky-50/50 shadow-md ring-2 ring-sky-200' 
                    : 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
                }`}
              >
                {/* Phase Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-white/90 border-b border-slate-200/80">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      P{phaseIdx + 1}
                    </div>

                    {isEditingThisPhase ? (
                      <div className="flex items-center space-x-2 flex-1 max-w-md">
                        <input
                          type="text"
                          value={editingPhaseName}
                          onChange={(e) => setEditingPhaseName(e.target.value)}
                          className="px-2.5 py-1 bg-white border border-sky-400 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 w-full"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRenamePhase(phaseIdx);
                            if (e.key === 'Escape') setEditingPhaseIdx(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRenamePhase(phaseIdx)}
                          className="p-1 text-emerald-600 hover:text-emerald-700 bg-emerald-50 rounded-md"
                          title="Save Phase Name"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPhaseIdx(null)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 min-w-0">
                        <h5 className="text-sm font-extrabold text-slate-900 font-serif truncate">
                          {phaseName}
                        </h5>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPhaseIdx(phaseIdx);
                              setEditingPhaseName(phaseName);
                            }}
                            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors"
                            title="Rename this Phase"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Phase Stats and Phase Actions */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      {completedPhaseCount}/{phaseAllTasks.length} Deliverables Completed
                    </span>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleOpenAddTask(phaseName)}
                        className="flex items-center space-x-1 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title={`Add deliverable to ${phaseName}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Deliverable</span>
                      </button>
                    )}

                    {isAdmin && phases.length > 1 && phaseAllTasks.length === 0 && (
                      <button
                        type="button"
                        onClick={() => handleDeletePhase(phaseName)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                        title="Delete empty phase"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Tasks List inside Phase */}
                <div className="p-3 sm:p-4 space-y-2.5">
                  {phaseTasks.length === 0 ? (
                    <div 
                      className={`text-center py-6 px-4 rounded-xl border border-dashed text-xs transition-colors ${
                        isDropTarget 
                          ? 'border-sky-400 bg-sky-100/50 text-sky-800 font-bold' 
                          : 'border-slate-200 text-slate-400'
                      }`}
                    >
                      {isDropTarget 
                        ? 'Release to drop task into this phase' 
                        : (
                          <div className="flex flex-col items-center justify-center space-y-1">
                            <p>No deliverables in this phase.</p>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleOpenAddTask(phaseName)}
                                className="text-sky-600 hover:text-sky-800 font-bold underline cursor-pointer"
                              >
                                Click here to add a task, or drag an existing task here
                              </button>
                            )}
                          </div>
                        )}
                    </div>
                  ) : (
                    phaseTasks.map((task, index) => {
                      const isDone = task.status === 'Complete';
                      const isProg = task.status === 'In Progress';
                      const overdue = isOverdue(task.dueDate, task.status);
                      const assignee = teamMembers.find(m => m.email === task.assignedTo);
                      const isDragging = draggedTaskId === task.id;

                      const getPriorityGanttBar = () => {
                        if (isDone) return 'bg-teal-500 text-white';
                        if (task.priority === 'High') return 'bg-rose-500 text-white';
                        if (task.priority === 'Medium') return 'bg-amber-500 text-white';
                        if (task.priority === 'Low') return 'bg-sky-500 text-white';
                        return 'bg-slate-400 text-white';
                      };

                      return (
                        <div
                          key={task.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          className={`flex flex-col md:flex-row md:items-start justify-between gap-3 p-3.5 bg-white hover:bg-slate-50/90 rounded-xl border border-slate-200/90 shadow-2xs transition-all cursor-grab active:cursor-grabbing ${
                            isDragging ? 'opacity-40 border-dashed border-sky-400 scale-[0.99]' : ''
                          }`}
                          title="Click and drag to move task to another phase"
                        >
                          {/* Left: Drag Handle, Number, Assignee & Info */}
                          <div className="flex items-start space-x-2.5 flex-1 min-w-0">
                            <div className="text-slate-300 hover:text-slate-600 shrink-0 cursor-grab mt-0.5">
                              <GripVertical className="w-4 h-4" />
                            </div>

                            <div className="flex items-center space-x-2 shrink-0 mt-0.5">
                              <span className="text-[11px] font-mono font-bold text-slate-400 w-5">
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              {assignee ? (
                                <div
                                  title={`Assigned to ${assignee.name} (${assignee.role})`}
                                  className={`w-7 h-7 rounded-full bg-gradient-to-br ${assignee.avatarColor} text-white font-bold text-[13px] flex items-center justify-center text-center leading-none select-none shadow-2xs shrink-0 pt-0.5`}
                                >
                                  {assignee.initials}
                                </div>
                              ) : (
                                <div 
                                  title="Unassigned deliverable"
                                  className="w-7 h-7 rounded-full bg-slate-100 border border-slate-300 text-slate-400 text-[11px] font-bold flex items-center justify-center text-center leading-none select-none shrink-0"
                                >
                                  --
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1 pr-2">
                              <div>
                                <p 
                                  className={`text-xs font-semibold leading-relaxed break-words ${isDone ? 'text-slate-400 line-through' : 'text-slate-900'}`}
                                  title={task.description.length > 300 ? task.description : undefined}
                                >
                                  {truncateText(task.description, 300)}
                                </p>
                              </div>

                              <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-1.5 flex-wrap gap-y-1">
                                <span className="font-medium text-slate-600">
                                  {assignee ? assignee.name : 'Unassigned'}
                                </span>
                                <span>•</span>
                                <span className={overdue ? 'text-rose-700 font-bold' : ''}>
                                  Due: <strong className={overdue ? 'text-rose-700 font-bold' : 'text-slate-600 font-semibold'}>{formatDate(task.dueDate)}</strong>
                                  {overdue && <span className="ml-1 text-rose-700 font-extrabold uppercase">(OVERDUE)</span>}
                                </span>
                                {task.deliverableUrl && (
                                  <>
                                    <span>•</span>
                                    <a
                                      href={task.deliverableUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-teal-600 hover:text-teal-700 font-semibold flex items-center space-x-0.5"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ExternalLink className="w-2.5 h-2.5" />
                                      <span>Deliverable</span>
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Phase selector, Priority, Status Bar */}
                          <div className="flex items-center space-x-2.5 shrink-0 self-end md:self-start mt-0.5" onClick={(e) => e.stopPropagation()}>
                            
                            {/* Move Phase Dropdown (Accessibility & quick selector) */}
                            {phases.length > 1 && (
                              <select
                                value={getTaskPhase(task)}
                                onChange={(e) => handleMoveTaskPhase(task.id, e.target.value)}
                                className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-sky-500 max-w-[120px] truncate"
                                title="Change Phase"
                              >
                                {phases.map(p => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            )}

                            {/* Priority Badge */}
                            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                              task.priority === 'High' ? 'bg-rose-100 text-rose-700 border-rose-300' :
                              task.priority === 'Medium' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                              task.priority === 'Low' ? 'bg-sky-100 text-sky-700 border-sky-300' :
                              'bg-slate-100 text-slate-600 border-slate-300'
                            }`}>
                              {task.priority}
                            </span>

                            {/* Gantt Progress Status Pill */}
                            <button
                              type="button"
                              onClick={() => {
                                if (onUpdateTaskStatus) {
                                  const nextStatus: TaskStatus = isDone ? 'In Progress' : 'Complete';
                                  onUpdateTaskStatus(client.id, task.id, nextStatus);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center space-x-1 shadow-2xs cursor-pointer transition-transform hover:scale-102 ${getPriorityGanttBar()}`}
                              title="Click to toggle Complete/In Progress"
                            >
                              {isDone ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Complete</span>
                                </>
                              ) : isProg ? (
                                <>
                                  <Clock className="w-3 h-3 animate-spin" />
                                  <span>In Progress</span>
                                </>
                              ) : (
                                <span>Not Started</span>
                              )}
                            </button>

                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Consultant Capacity & Workload Allocation Matrix */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <h4 className="text-base font-bold text-slate-900 flex items-center space-x-2 mb-1">
          <Users className="w-4 h-4 text-teal-600" />
          <span>Consultant SOW Allocation & Practice Capacity</span>
        </h4>
        <p className="text-xs text-slate-500 mb-4">
          Distribution of active and delivered SOW workstreams across Chapter 3 team members
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {teamMembers.map(member => {
            const memberStats = workloadByMember.find(w => w.member.id === member.id) || {
              total: 0,
              activeCount: 0,
              completedCount: 0,
              highPriorityCount: 0
            };

            return (
              <div key={member.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${member.avatarColor} text-white font-bold text-[16px] flex items-center justify-center text-center leading-none select-none shadow-xs shrink-0 pt-0.5`}>
                    {member.initials}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 leading-tight">{member.name}</h5>
                    <span className="text-[10px] font-semibold text-slate-400">{member.role}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Active SOW Tasks:</span>
                    <strong className="text-slate-900 font-bold">{memberStats.activeCount}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Delivered Milestones:</span>
                    <strong className="text-teal-700 font-bold">{memberStats.completedCount}</strong>
                  </div>
                  {memberStats.highPriorityCount > 0 && (
                    <div className="flex items-center justify-between text-rose-600 font-semibold pt-1 border-t border-slate-200">
                      <span>High Priority Load:</span>
                      <span className="bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold">{memberStats.highPriorityCount}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SOW Add Task Modal (Mimics Active Workstreams Add Task Modal, defaults Priority & User to Unassigned, recurring to unchecked) */}
      {isAddTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-serif">
                  Add SOW Deliverable / Task
                </h3>
                <p className="text-xs text-slate-500">
                  Tasks added here will populate in the SOW Gantt chart and Active Workstreams.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTaskModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="mt-4 space-y-4">
              
              {/* Task Description */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Deliverable Description / SOW Item *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Conduct ICP buyer persona validation interviews"
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Phase Selection */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  SOW Phase *
                </label>
                <select
                  value={newTaskPhase}
                  onChange={(e) => setNewTaskPhase(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-semibold"
                >
                  {phases.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Deliverable URL */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Deliverable URL / Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://docs.google.com/... or Notion/Figma link"
                  value={newTaskDeliverable}
                  onChange={(e) => setNewTaskDeliverable(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900"
                />
              </div>

              {/* Priority & Due Date (Priority defaults to Unassigned) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Priority (Default: Unassigned)
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium"
                  >
                    <option value="Unassigned">Unassigned</option>
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Target Delivery Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* Assignee Selection (Defaults to Unassigned) */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Assignee (Default: Unassigned)
                </label>
                <select
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium"
                >
                  <option value="">-- Unassigned (Not in live priority feed) --</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.email}>
                      {m.name} ({m.title} - {m.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Recurring Checkbox (Defaults to UNCHECKED) */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="sow-recurring"
                  checked={newTaskRecurring}
                  onChange={(e) => setNewTaskRecurring(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                />
                <label htmlFor="sow-recurring" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Recurring deliverable cadence (Weekly/Bi-weekly check-in)
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Add SOW Deliverable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Phase Modal */}
      {isAddPhaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 font-serif">
                Add New SOW Phase
              </h3>
              <button
                type="button"
                onClick={() => setIsAddPhaseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPhaseSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Phase Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder={`e.g. Phase ${phases.length + 1}: Implementation & Rollout`}
                  value={newPhaseNameInput}
                  onChange={(e) => setNewPhaseNameInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddPhaseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Create Phase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
