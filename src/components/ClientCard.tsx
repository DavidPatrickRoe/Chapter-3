import React from 'react';
import { 
  FolderKanban, 
  Repeat, 
  Building, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Calendar,
  Users
} from 'lucide-react';
import { Client, TeamMember } from '../types';
import { getProjectCompletionStats, getProgressBarColor, formatDate } from '../utils/helpers';

interface ClientCardProps {
  client: Client;
  teamMembers: TeamMember[];
  onSelectClient: (client: Client) => void;
  onUpdateClient?: (client: Client) => void;
}

export const ClientCard: React.FC<ClientCardProps> = ({
  client,
  teamMembers,
  onSelectClient,
  onUpdateClient
}) => {
  const isProject = client.type === 'Project';
  const isRetainer = client.type === 'Retainer';
  const isInternal = client.type === 'Internal';

  const stats = getProjectCompletionStats(client);
  const progressTheme = getProgressBarColor(stats.percentage);

  // Active open tasks (not complete or cancelled)
  const openTasks = client.tasks.filter(t => t.status === 'Not Started' || t.status === 'In Progress');
  const highPriorityOpenCount = openTasks.filter(t => t.priority === 'High').length;

  // Get distinct assigned members for this client
  const assignedEmails = Array.from(new Set(client.tasks.map(t => t.assignedTo).filter(Boolean)));
  const assignedTeam = teamMembers.filter(m => assignedEmails.includes(m.email));

  // Type badge styling
  const getTypeBadge = () => {
    switch (client.type) {
      case 'Project':
        return {
          icon: FolderKanban,
          label: 'Project',
          classes: 'bg-sky-100 text-sky-800 border-sky-200'
        };
      case 'Retainer':
        return {
          icon: Repeat,
          label: 'Retainer',
          classes: 'bg-teal-100 text-teal-800 border-teal-200'
        };
      case 'Internal':
        return {
          icon: Building,
          label: 'Internal',
          classes: 'bg-purple-100 text-purple-800 border-purple-200'
        };
    }
  };

  const typeConfig = getTypeBadge();
  const TypeIcon = typeConfig.icon;

  return (
    <div
      onClick={() => onSelectClient(client)}
      className="group bg-white rounded-2xl p-5 border border-slate-200 hover:border-sky-400 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between"
    >
      {/* Top Bar: Title, Type Badge, and Status */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1.5 flex-wrap gap-y-1">
              <span className={`inline-flex items-center space-x-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${typeConfig.classes}`}>
                <TypeIcon className="w-3 h-3" />
                <span>{typeConfig.label}</span>
              </span>
              {client.status === 'Inactive' && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300">
                  Archived / Inactive
                </span>
              )}
              {client.industry && (
                <span className="text-[11px] font-medium text-slate-400">
                  • {client.industry}
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-1">
              {client.name}
            </h3>
          </div>

          <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-sky-50 text-slate-400 group-hover:text-sky-600 flex items-center justify-center transition-all shrink-0">
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Project Summary Snippet */}
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
          {client.projectSummary}
        </p>
      </div>

      {/* Metrics Section: Specialized based on Type */}
      <div className="pt-3 border-t border-slate-100 space-y-3">
        {isProject ? (
          /* "Project" Specifics: Total task count, completed task count, dynamic % completion progress bar */
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
              <span className="text-slate-600 flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Completion ({stats.completedTasks}/{stats.totalTasks} Tasks)</span>
              </span>
              <span className={`font-bold ${progressTheme.textClass}`}>
                {stats.percentage}%
              </span>
            </div>

            {/* Dynamic % Completion Bar with strict color rules:
                <50% Red | 51-75% Yellow | 76-99% Light Green | 100% Green */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${progressTheme.bgClass}`}
                style={{ width: `${Math.min(100, Math.max(stats.percentage, 4))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
              <span>{openTasks.length} open workstreams</span>
              {highPriorityOpenCount > 0 && (
                <span className="text-rose-600 font-semibold flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{highPriorityOpenCount} High Priority</span>
                </span>
              )}
            </div>
          </div>
        ) : (
          /* "Retainer" & "Internal" Specifics: Displays active open task count (no % completion bar) */
          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 border border-slate-200/70">
            <div className="flex items-center space-x-2">
              <div className={`w-2.5 h-2.5 rounded-full ${openTasks.length > 0 ? 'bg-teal-500 animate-pulse' : 'bg-slate-300'}`} />
              <span className="text-xs font-semibold text-slate-700">
                {openTasks.length} Active Open {openTasks.length === 1 ? 'Task' : 'Tasks'}
              </span>
            </div>
            {highPriorityOpenCount > 0 ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200">
                {highPriorityOpenCount} High Priority
              </span>
            ) : (
              <span className="text-[11px] text-slate-600 font-medium">
                {client.tasks.filter(t => t.isRecurring).length} recurring cadence
              </span>
            )}
          </div>
        )}

        {/* Assigned Team Avatars & Changeable Lead Consultant */}
        <div className="flex items-center justify-between pt-1 text-xs gap-2">
          <div className="flex items-center space-x-1.5 shrink-0">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <div className="flex -space-x-1.5 overflow-hidden">
              {assignedTeam.length > 0 ? (
                assignedTeam.map((member) => (
                  <div
                    key={member.id}
                    title={`${member.name} (${member.role})`}
                    className={`inline-block w-6 h-6 rounded-full ring-2 ring-white bg-gradient-to-br ${member.avatarColor} text-white font-bold text-[12px] flex items-center justify-center text-center leading-none select-none shrink-0 pt-[1px]`}
                  >
                    {member.initials}
                  </div>
                ))
              ) : (
                <span className="text-[11px] text-slate-400 italic">No assignees</span>
              )}
            </div>
          </div>

          {/* Changeable Lead Practice Consultant Dropdown */}
          <div 
            className="flex items-center space-x-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Lead:</span>
            <select
              value={client.leadConsultant || 'All'}
              onChange={(e) => {
                e.stopPropagation();
                if (onUpdateClient) {
                  onUpdateClient({
                    ...client,
                    leadConsultant: e.target.value
                  });
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg px-2 py-0.5 text-[11px] font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer max-w-[130px] truncate transition-colors"
              title="Change Lead Practice Consultant at any time"
            >
              <option value="All">All</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
