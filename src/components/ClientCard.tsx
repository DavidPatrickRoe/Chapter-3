import React from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  FileText,
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

  // Active open tasks (not complete or cancelled)
  const openTasks = client.tasks.filter(t => t.status === 'Not Started' || t.status === 'In Progress');
  const highPriorityOpenCount = openTasks.filter(t => t.priority === 'High').length;
  const unassignedOpenCount = openTasks.filter(t => !t.assignedTo).length;

  // Distinct assigned consultants
  const assignedEmails = Array.from(new Set(client.tasks.map(t => t.assignedTo).filter(Boolean)));
  const assignedTeam = teamMembers.filter(m => assignedEmails.includes(m.email));

  // Type label & subtle tone
  const getTypeMeta = () => {
    switch (client.type) {
      case 'Project':
        return { label: 'Project Engagement', dotClass: 'bg-stone-800' };
      case 'Retainer':
        return { label: 'Advisory Retainer', dotClass: 'bg-stone-700' };
      case 'Internal':
        return { label: 'Internal Practice', dotClass: 'bg-stone-600' };
      case 'Prospecting':
      default:
        return { label: 'Prospect Pipeline', dotClass: 'bg-amber-600' };
    }
  };

  const typeMeta = getTypeMeta();

  return (
    <div
      onClick={() => onSelectClient(client)}
      className="group bg-white border border-stone-200/90 hover:border-stone-400 rounded-2xl p-5 sm:p-5.5 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-2xs hover:shadow-md"
    >
      <div>
        {/* Top Metadata Row: Zero-pill discipline */}
        <div className="flex items-center justify-between gap-2 text-xs text-stone-500 mb-2">
          <div className="flex items-center space-x-2 truncate">
            <span className="flex items-center space-x-1.5 font-medium text-stone-700">
              <span className={`w-1.5 h-1.5 rounded-full ${typeMeta.dotClass}`} />
              <span>{typeMeta.label}</span>
            </span>
            {client.industry && (
              <>
                <span aria-hidden="true" className="text-stone-300">·</span>
                <span className="truncate max-w-[140px]" title={client.industry}>
                  {client.industry}
                </span>
              </>
            )}
          </div>

          {client.status === 'Inactive' ? (
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-600 font-semibold">
              Archived
            </span>
          ) : (
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-stone-400 group-hover:text-stone-900 group-hover:translate-x-0.5 transition-all shrink-0">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        {/* Client Title */}
        <h3 className="font-serif text-xl font-normal text-stone-950 group-hover:text-stone-700 transition-colors tracking-tight line-clamp-1 mb-1.5">
          {client.name}
        </h3>

        {/* Project Summary Snippet */}
        <p className="text-xs text-stone-600 leading-relaxed line-clamp-2 mb-4 font-normal">
          {client.projectSummary || 'No executive scope description recorded.'}
        </p>
      </div>

      {/* Structured Metrics Section */}
      <div className="pt-3 border-t border-stone-100 space-y-3">
        
        {isProspecting ? (
          /* Prospecting Stepper */
          <div className="space-y-2">
            <ProspectingTimeline
              client={client}
              onUpdateClient={onUpdateClient}
              onPromptWonProspect={onPromptWonProspect}
              compact={true}
            />
            <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 font-mono tabular-nums">
              <span>{openTasks.length} {openTasks.length === 1 ? 'task' : 'tasks'}</span>
              {highPriorityOpenCount > 0 && (
                <span className="text-rose-700 font-medium flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{highPriorityOpenCount} high priority</span>
                </span>
              )}
            </div>
          </div>
        ) : isProject ? (
          /* Project Progress Metric */
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono tabular-nums">
              <span className="text-stone-600">
                {stats.completedTasks}/{stats.totalTasks} deliverables
              </span>
              <span className="font-semibold text-stone-900">
                {stats.percentage}%
              </span>
            </div>

            {/* Minimalist Hairline Progress Bar */}
            <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-stone-900 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, Math.max(stats.percentage, 3))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono tabular-nums">
              <span>{openTasks.length} active workstreams</span>
              {unassignedOpenCount > 0 && (
                <span className="text-amber-700 font-medium">
                  {unassignedOpenCount} needs assignee
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Retainer / Internal Metric */
          <div className="flex items-center justify-between text-xs py-1">
            <div className="flex items-center space-x-2 font-mono tabular-nums">
              <span className="text-stone-900 font-medium">{openTasks.length} open</span>
              <span className="text-stone-400">·</span>
              <span className="text-stone-500">
                {client.tasks.filter(t => t.isRecurring).length} recurring
              </span>
            </div>
            {unassignedOpenCount > 0 ? (
              <span className="text-[11px] text-amber-700 font-mono">
                {unassignedOpenCount} unassigned
              </span>
            ) : highPriorityOpenCount > 0 ? (
              <span className="text-[11px] text-rose-700 font-mono">
                {highPriorityOpenCount} priority
              </span>
            ) : null}
          </div>
        )}

        {/* Bottom Row: Assigned Consultants & Lead Practice Partner */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
          
          {/* Team Avatars */}
          <div className="flex items-center space-x-1.5 shrink-0">
            {assignedTeam.length > 0 ? (
              <div className="flex -space-x-1.5 overflow-hidden">
                {assignedTeam.map((member) => (
                  <div
                    key={member.id}
                    title={`${member.name} (${member.role})`}
                    className="inline-flex w-6 h-6 rounded-full bg-stone-800 text-stone-100 ring-2 ring-white text-[10px] font-mono font-medium items-center justify-center text-center select-none shrink-0"
                  >
                    {member.initials}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[11px] text-stone-400 font-mono">No assignees</span>
            )}
          </div>

          {/* Inline Changeable Lead Consultant */}
          <div 
            className="flex items-center space-x-1 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[11px] text-stone-400">Lead:</span>
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
              className="bg-transparent hover:bg-stone-100 text-stone-800 rounded-md px-1.5 py-0.5 text-[11px] font-medium border-0 focus:ring-1 focus:ring-stone-400 cursor-pointer max-w-[120px] truncate transition-colors"
              title="Change Lead Consultant"
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
