import React, { useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  Upload, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Layers, 
  ChevronRight, 
  Download, 
  Printer, 
  ExternalLink,
  History,
  FileCheck,
  Check,
  ListTodo,
  AlertCircle
} from 'lucide-react';
import { Client, Task, TaskStatus, TeamMember, SOWMetadata } from '../types';
import { formatDate } from '../utils/helpers';
import { GanttTimelineVisualizer } from './GanttTimelineVisualizer';

interface SOWDetailTabProps {
  client: Client;
  currentUser: TeamMember;
  teamMembers: TeamMember[];
  onOpenSOWUpload: (clientId?: string) => void;
  onAddTask?: (clientId: string, task: Omit<Task, 'id' | 'clientId' | 'notes'>) => void;
  onUpdateClient?: (updatedClient: Client) => void;
  onUpdateTaskStatus?: (clientId: string, taskId: string, status: TaskStatus) => void;
  onUpdateTaskAssignee?: (clientId: string, taskId: string, assigneeEmail: string | null) => void;
  onUpdateTaskPriority?: (clientId: string, taskId: string, priority: any) => void;
  onUpdateTaskDueDate?: (clientId: string, taskId: string, dueDate: string) => void;
  onDeleteTask?: (clientId: string, taskId: string) => void;
}

export const SOWDetailTab: React.FC<SOWDetailTabProps> = ({
  client,
  currentUser,
  teamMembers,
  onOpenSOWUpload,
  onAddTask,
  onUpdateClient,
  onUpdateTaskStatus,
  onUpdateTaskAssignee,
  onUpdateTaskPriority,
  onUpdateTaskDueDate,
  onDeleteTask
}) => {
  const isAdmin = currentUser.role === 'Admin';
  const [viewMode, setViewMode] = useState<'document' | 'gantt'>('document');
  const [selectedPhaseHistoryIdx, setSelectedPhaseHistoryIdx] = useState<number>(0);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const sowHistory = client.sowHistory && client.sowHistory.length > 0 
    ? client.sowHistory 
    : (client.sow ? [client.sow] : []);

  const activeSOW: SOWMetadata | undefined = sowHistory[selectedPhaseHistoryIdx] || client.sow;

  // Completion calculation for SOW deliverables
  const totalTasks = client.tasks.length;
  const completedTasks = client.tasks.filter(t => t.status === 'Complete').length;
  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Copy raw SOW text
  const handleCopySOWText = () => {
    if (!activeSOW?.rawText) return;
    navigator.clipboard.writeText(activeSOW.rawText);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  // If no SOW attached to client
  if (!activeSOW) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto border border-sky-100 shadow-sm">
          <FileText className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-1.5">
          <h3 className="text-lg font-bold text-slate-900 font-serif">
            No SOW Document Attached Yet
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Upload or paste the Statement of Work for {client.name}. Our engine will extract the deliverables, budget terms, milestone schedule, and populate the CRM task feed.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => onOpenSOWUpload(client.id)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-900/20 cursor-pointer transition-all active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span>Upload SOW for {client.name}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Controls Bar: Document View vs Gantt View + SOW Actions */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* View Switcher: Document vs Gantt */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('document')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'document' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-sky-600" />
              <span>SOW Executive Scope</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('gantt')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'gantt' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>Milestone Gantt Timeline</span>
            </button>
          </div>

          {/* SOW Phase Version Selector (if multiple SOWs exist) */}
          {sowHistory.length > 1 && (
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-400 font-medium">Phase:</span>
              <select
                value={selectedPhaseHistoryIdx}
                onChange={(e) => setSelectedPhaseHistoryIdx(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-semibold text-slate-800 text-xs"
              >
                {sowHistory.map((s, idx) => (
                  <option key={idx} value={idx}>
                    {s.title || `Phase ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Action Buttons: Add Phase / Update SOW + Copy Text */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={handleCopySOWText}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
            title="Copy original SOW text to clipboard"
          >
            {copiedNotification ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy SOW Text</span>
              </>
            )}
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => onOpenSOWUpload(client.id)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Upload Phase 2 SOW or update scope"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Update SOW / Add Phase</span>
            </button>
          )}
        </div>

      </div>

      {/* VIEW 1: SOW Executive Document View */}
      {viewMode === 'document' ? (
        <div className="space-y-6">
          
          {/* Formal SOW Document Header */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            
            {/* Top Corporate Branding & Metadata */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100 inline-block mb-1">
                  Chapter 3 • Scope of Work Document
                </span>
                <h2 className="text-2xl font-extrabold text-slate-900 font-serif tracking-tight">
                  {activeSOW.title || `${client.name} SOW`}
                </h2>
                <p className="text-xs text-slate-500">
                  Client: <strong className="text-slate-800">{activeSOW.clientName || client.name}</strong> • Provider: <strong className="text-slate-800">Chapter 3 Ltd.</strong>
                </p>
              </div>

              <div className="text-xs sm:text-right text-slate-500 space-y-0.5 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                <p className="font-bold text-slate-900">Chapter 3 Ltd.</p>
                <p>3008 Oxford Street, Suite 201</p>
                <p>Halifax, Nova Scotia, B3L 2W5</p>
                <p className="text-sky-700 font-medium">https://chapter3.ca</p>
              </div>
            </div>

            {/* Pricing, Duration & Completion Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Terms & Pricing</span>
                </div>
                <p className="text-base font-bold text-slate-900 font-serif">
                  {activeSOW.pricing?.fee || '$8,650 CAD flat rate'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {activeSOW.pricing?.terms || 'Payment due upon receipt'}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
                  <Clock className="w-4 h-4 text-sky-600" />
                  <span>Estimated Engagement Duration</span>
                </div>
                <p className="text-base font-bold text-slate-900 font-serif">
                  {activeSOW.pricing?.estimatedDuration || '8 Weeks (2 Months)'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Milestone sprint checkpoints
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <span>Deliverables Progress</span>
                </div>
                <p className="text-base font-bold text-teal-700 font-serif">
                  {completionPercent}% Completed
                </p>
                <p className="text-[11px] text-slate-500">
                  {completedTasks} of {totalTasks} CRM tasks done
                </p>
              </div>
            </div>

            {/* Executive Summary Narrative */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                1. Executive Scope & Objective Summary
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                {activeSOW.summary || client.projectSummary}
              </p>
            </div>

            {/* Extracted Workstreams & Live Deliverables Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  2. Primary Workstreams & CRM Deliverables
                </h4>
                <span className="text-xs text-slate-500 font-medium">
                  {activeSOW.workstreams.length} Workstreams Defined
                </span>
              </div>

              <div className="space-y-4">
                {activeSOW.workstreams.map((ws, wsIdx) => {
                  // Find deliverables and tasks belonging to this workstream
                  const wsDeliverables = activeSOW.deliverables?.filter(d => d.workstream === ws) || [];
                  const wsTasks = client.tasks.filter(t => t.workstream === ws);

                  return (
                    <div key={wsIdx} className="bg-slate-50/90 rounded-2xl p-5 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <h5 className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-md bg-sky-100 text-sky-800 flex items-center justify-center text-[10px] font-bold">
                            {wsIdx + 1}
                          </span>
                          <span>{ws}</span>
                        </h5>
                        <span className="text-[11px] text-slate-500">
                          {wsTasks.filter(t => t.status === 'Complete').length} / {wsTasks.length} Done
                        </span>
                      </div>

                      {/* Workstream deliverables list */}
                      {wsDeliverables.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Deliverables Definition:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {wsDeliverables.map((deliv, dIdx) => (
                              <div key={dIdx} className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                                <span className="font-bold text-slate-800 block text-[11px] text-sky-900">
                                  {deliv.title}
                                </span>
                                <p className="text-slate-600 text-[11px] leading-relaxed">
                                  {deliv.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Live linked tasks for this workstream */}
                      {wsTasks.length > 0 && (
                        <div className="space-y-1.5 pt-2">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Live CRM Action Items ({wsTasks.length}):
                          </p>
                          <div className="space-y-1.5">
                            {wsTasks.map(t => {
                              const isDone = t.status === 'Complete';
                              const assignee = teamMembers.find(m => m.email === t.assignedTo);
                              return (
                                <div key={t.id} className="bg-white px-3 py-2 rounded-xl border border-slate-200 flex items-center justify-between text-xs gap-2">
                                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => onUpdateTaskStatus && onUpdateTaskStatus(client.id, t.id, isDone ? 'In Progress' : 'Complete')}
                                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 cursor-pointer ${
                                        isDone ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300 hover:border-slate-500'
                                      }`}
                                    >
                                      {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                                    </button>
                                    <span className={`truncate font-medium ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                      {t.description}
                                    </span>
                                  </div>

                                  <div className="flex items-center space-x-2 shrink-0 text-[11px]">
                                    <span className="text-slate-500">
                                      Due: {formatDate(t.dueDate)}
                                    </span>
                                    {assignee && (
                                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[10px]">
                                        {assignee.name.split(' ')[0]}
                                      </span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      t.priority === 'High' ? 'bg-rose-100 text-rose-800' :
                                      t.priority === 'Medium' ? 'bg-amber-100 text-amber-800' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>
                                      {t.priority}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timeline & Milestones Roadmap Matrix */}
            {activeSOW.milestones && activeSOW.milestones.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  3. Timeline Progression & Key Milestones
                </h4>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4 w-1/4">Timeline</th>
                        <th className="py-2.5 px-4 w-1/4">Milestone</th>
                        <th className="py-2.5 px-4">Key Activities</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {activeSOW.milestones.map((ms, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-bold text-sky-900 align-top whitespace-nowrap">
                            <span className="bg-sky-50 text-sky-800 px-2.5 py-1 rounded-md border border-sky-200 inline-block text-[11px]">
                              {ms.timeline}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800 align-top">
                            {ms.milestone}
                          </td>
                          <td className="py-3 px-4 text-slate-600 leading-relaxed align-top">
                            {ms.keyActivities}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Formal In Witness Signatures Block */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                4. Signatures & Binding Authorization
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 space-y-2 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    For Client:
                  </span>
                  <p className="font-extrabold text-slate-900 text-sm">{activeSOW.clientName || client.name}</p>
                  <div className="pt-2 space-y-0.5 text-slate-600 text-[11px]">
                    <p>Name: <strong>Alan MacKeen</strong></p>
                    <p>Title: <strong>Founder, Managing Partner</strong></p>
                    <p className="font-mono text-slate-400 pt-2 italic">I have the authority to bind the corporation</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 space-y-2 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    For Consulting Firm:
                  </span>
                  <p className="font-extrabold text-slate-900 text-sm">Chapter 3 Ltd.</p>
                  <div className="pt-2 space-y-0.5 text-slate-600 text-[11px]">
                    <p>Name: <strong>Mary Jane Leslie</strong></p>
                    <p>Title: <strong>Owner & Principal Consultant</strong></p>
                    <p className="font-mono text-slate-400 pt-2 italic">I have the authority to bind the corporation</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* VIEW 2: Gantt Timeline Visualizer */
        <GanttTimelineVisualizer 
          client={client} 
          currentUser={currentUser}
          teamMembers={teamMembers}
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
  );
};
