import React from 'react';
import { 
  FolderKanban, 
  Repeat, 
  Building, 
  Sparkles,
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Users
} from 'lucide-react';
import { Client, TeamMember } from '../types';
import { getProjectCompletionStats, getProgressBarColor } from '../utils/helpers';
import { ProspectingTimeline } from './ProspectingTimeline';

interface ClientCardProps {
  client: Client;
  teamMembers: TeamMember[];
  onSelectClient: (client: Client) => void;
  onUpdateClient?: (client: Client) => void;
  onPromptWonProspect?: (client: Client) => void;
}

export const ClientCard: React.FC<ClientCardProps> = ({
  client,
  teamMembers,
  onSelectClient,
  onUpdateClient,
  onPromptWonProspect
}) => {
  const isProject = client.type === 'Project';
  const isRetainer = client.type === 'Retainer';
  const isInternal = client.type === 'Internal';
  const isProspecting = client.type === 'Prospecting';

  const stats = getProjectCompletionStats(client);
  const progressTheme = getProgressBarColor(stats.percentage);

  // Active open tasks (not complete or cancelled)
  const openTasks = client.tasks.filter(t => t.status === 'Not Started' || t.status === 'In Progress');
  const highPriorityOpenCount = openTasks.filter(t => t.priority === 'High').length;

  // Get distinct assigned members for this client
  const assignedEmails = Array.from(new Set(client.tasks.map(t => t.assignedTo).filter(Boolean)));
  const assignedTeam = teamMembers.filter(m => assignedEmails.includes(m.email));

  // Type badge styling & Container Theme Styling according to exact Engagement Model specification:
  // Project: Dark blue outline, light blue interior
  // Retainer: Dark purple outline, light purple interior
  // Internal: Dark green outline, light green interior
  // Prospecting: Dark orange outline, light orange interior
  const getThemeConfig = () => {
    switch (client.type) {
      case 'Project':
        return {
          icon: FolderKanban,
          label: 'Project',
          cardContainerClasses: 'bg-blue-50/70 border-2 border-blue-700 hover:border-blue-800 hover:bg-blue-50/90 hover:shadow-blue-200/50',
          badgeClasses: 'bg-blue-100 text-blue-900 border-blue-300 font-bold',
          hoverTitleColor: 'group-hover:text-blue-700',
          arrowBtnClasses: 'bg-blue-100/80 group-hover:bg-blue-600 text-blue-700 group-hover:text-white',
          dividerClasses: 'border-blue-200/80'
        };
      case 'Retainer':
        return {
          icon: Repeat,
          label: 'Retainer',
          cardContainerClasses: 'bg-purple-50/70 border-2 border-purple-700 hover:border-purple-800 hover:bg-purple-50/90 hover:shadow-purple-200/50',
          badgeClasses: 'bg-purple-100 text-purple-900 border-purple-300 font-bold',
          hoverTitleColor: 'group-hover:text-purple-700',
          arrowBtnClasses: 'bg-purple-100/80 group-hover:bg-purple-600 text-purple-700 group-hover:text-white',
          dividerClasses: 'border-purple-200/80'
        };
      case 'Internal':
        return {
          icon: Building,
          label: 'Internal',
          cardContainerClasses: 'bg-emerald-50/70 border-2 border-emerald-700 hover:border-emerald-800 hover:bg-emerald-50/90 hover:shadow-emerald-200/50',
          badgeClasses: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
          hoverTitleColor: 'group-hover:text-emerald-700',
          arrowBtnClasses: 'bg-emerald-100/80 group-hover:bg-emerald-600 text-emerald-700 group-hover:text-white',
          dividerClasses: 'border-emerald-200/80'
        };
      case 'Prospecting':
      default:
        return {
          icon: Sparkles,
          label: 'Prospecting',
          cardContainerClasses: 'bg-orange-50/70 border-2 border-orange-600 hover:border-orange-700 hover:bg-orange-50/90 hover:shadow-orange-200/50',
          badgeClasses: 'bg-orange-100 text-orange-950 border-orange-300 font-bold',
          hoverTitleColor: 'group-hover:text-orange-700',
          arrowBtnClasses: 'bg-orange-100/80 group-hover:bg-orange-600 text-orange-800 group-hover:text-white',
          dividerClasses: 'border-orange-200/80'
        };
    }
  };

  const themeConfig = getThemeConfig();
  const TypeIcon = themeConfig.icon;

  return (
    <div
      onClick={() => onSelectClient(client)}
      className={`group rounded-3xl p-5.5 transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-xl ${themeConfig.cardContainerClasses}`}
    >
      {/* Top Bar: Title, Type Badge, and Status */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1.5 flex-wrap gap-y-1">
              <span className={`inline-flex items-center space-x-1 text-xs px-2.5 py-0.5 rounded-full border shadow-2xs ${themeConfig.badgeClasses}`}>
                <TypeIcon className="w-3 h-3 shrink-0" />
                <span>{themeConfig.label}</span>
              </span>
              {client.status === 'Inactive' && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                  Archived / Inactive
                </span>
              )}
              {client.industry && (
                <span className="text-[11px] font-semibold text-slate-500 truncate max-w-[170px]" title={client.industry}>
                  • {client.industry}
                </span>
              )}
            </div>

            <h3 className={`text-base font-extrabold text-slate-900 ${themeConfig.hoverTitleColor} transition-colors line-clamp-1`}>
              {client.name}
            </h3>
            {isProspecting && (
              <p className="text-[11px] font-semibold text-orange-700 italic">
                Exploring New Engagement
              </p>
            )}
          </div>

          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${themeConfig.arrowBtnClasses}`}>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Project Summary Snippet */}
        <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed mb-3 font-normal">
          {client.projectSummary}
        </p>
      </div>

      {/* Metrics & Interactive Pipeline Section: Specialized based on Type */}
      <div className={`pt-3 border-t ${themeConfig.dividerClasses} space-y-3`}>
        {isProspecting ? (
          /* "Prospecting" Specifics: Interactive Timeline Stepper (Discovery, Active Deal, Quoted, Won, Lost) */
          <div className="bg-white/70 backdrop-blur-2xs rounded-2xl p-3 border border-orange-200/90 shadow-2xs">
            <ProspectingTimeline
              client={client}
              onUpdateClient={onUpdateClient}
              onPromptWonProspect={onPromptWonProspect}
              compact={true}
            />
            {/* Open tasks count preview */}
            <div className="flex items-center justify-between text-[11px] text-slate-600 mt-2.5 pt-2 border-t border-orange-100">
              <span className="font-semibold">
                {openTasks.length} Scope / Deal {openTasks.length === 1 ? 'Task' : 'Tasks'}
              </span>
              {highPriorityOpenCount > 0 && (
                <span className="text-rose-700 font-bold flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{highPriorityOpenCount} High Priority</span>
                </span>
              )}
            </div>
          </div>
        ) : isProject ? (
          /* "Project" Specifics: Total task count, completed task count, dynamic % completion progress bar */
          <div className="bg-white/70 backdrop-blur-2xs rounded-2xl p-3 border border-blue-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
              <span className="text-slate-700 flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold">Completion ({stats.completedTasks}/{stats.totalTasks} Tasks)</span>
              </span>
              <span className={`font-black ${progressTheme.textClass}`}>
                {stats.percentage}%
              </span>
            </div>

            {/* Dynamic % Completion Bar */}
            <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${progressTheme.bgClass}`}
                style={{ width: `${Math.min(100, Math.max(stats.percentage, 4))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-600 mt-2 font-medium">
              <span>{openTasks.length} open workstreams</span>
              {highPriorityOpenCount > 0 && (
                <span className="text-rose-700 font-bold flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{highPriorityOpenCount} High Priority</span>
                </span>
              )}
            </div>
          </div>
        ) : (
          /* "Retainer" & "Internal" Specifics: Displays active open task count */
          <div className="flex items-center justify-between bg-white/70 backdrop-blur-2xs rounded-2xl px-3.5 py-2.5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center space-x-2">
              <div className={`w-2.5 h-2.5 rounded-full ${openTasks.length > 0 ? (isRetainer ? 'bg-purple-600' : 'bg-emerald-600') : 'bg-slate-300'}`} />
              <span className="text-xs font-bold text-slate-800">
                {openTasks.length} Active Open {openTasks.length === 1 ? 'Task' : 'Tasks'}
              </span>
            </div>
            {highPriorityOpenCount > 0 ? (
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300">
                {highPriorityOpenCount} High Priority
              </span>
            ) : (
              <span className="text-[11px] text-slate-600 font-semibold">
                {client.tasks.filter(t => t.isRecurring).length} recurring cadence
              </span>
            )}
          </div>
        )}

        {/* Assigned Team Avatars & Changeable Lead Consultant */}
        <div className="flex items-center justify-between pt-1 text-xs gap-2">
          <div className="flex items-center space-x-1.5 shrink-0">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <div className="flex -space-x-1.5 overflow-hidden">
              {assignedTeam.length > 0 ? (
                assignedTeam.map((member) => (
                  <div
                    key={member.id}
                    title={`${member.name} (${member.role})`}
                    className={`inline-block w-6 h-6 rounded-full ring-2 ring-white bg-gradient-to-br ${member.avatarColor} text-white font-bold text-[12px] flex items-center justify-center text-center leading-none select-none shrink-0 pt-[1px] shadow-xs`}
                  >
                    {member.initials}
                  </div>
                ))
              ) : (
                <span className="text-[11px] text-slate-500 italic">No assignees</span>
              )}
            </div>
          </div>

          {/* Changeable Lead Practice Consultant Dropdown */}
          <div 
            className="flex items-center space-x-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[11px] text-slate-600 font-semibold whitespace-nowrap">Lead:</span>
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
              className="bg-white hover:bg-slate-100 border border-slate-300 hover:border-slate-400 rounded-lg px-2 py-0.5 text-[11px] font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer max-w-[130px] truncate transition-colors shadow-2xs"
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
