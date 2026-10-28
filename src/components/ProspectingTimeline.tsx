import React from 'react';
import { Check, XCircle, Trophy, Archive, ArrowRight, Lock } from 'lucide-react';
import { Client, ProspectingStage, TeamMember } from '../types';

interface ProspectingTimelineProps {
  client: Client;
  currentUser?: TeamMember;
  isAdmin?: boolean;
  onUpdateClient?: (client: Client) => void;
  onPromptWonProspect?: (client: Client) => void;
  compact?: boolean;
}

export const STAGES: ProspectingStage[] = [
  'Discovery',
  'Active Deal',
  'Quoted',
  'Won',
  'Lost'
];

export const ProspectingTimeline: React.FC<ProspectingTimelineProps> = ({
  client,
  currentUser,
  isAdmin: propIsAdmin,
  onUpdateClient,
  onPromptWonProspect,
  compact = false
}) => {
  const isAdmin = propIsAdmin ?? (currentUser?.role === 'Admin');
  const currentStage: ProspectingStage = client.prospectingStage || 'Discovery';

  const handleStageClick = (stage: ProspectingStage, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateClient) return;

    const updated = {
      ...client,
      prospectingStage: stage
    };
    onUpdateClient(updated);

    if (stage === 'Won' && onPromptWonProspect) {
      onPromptWonProspect(updated);
    }
  };

  const handleManualArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateClient) return;
    // Security check: non-admin users must not be allowed to archive active clients
    if (client.status === 'Active' && !isAdmin) {
      return;
    }
    // Also restrict unarchiving to admins for consistent RBAC
    if (!isAdmin) {
      return;
    }
    onUpdateClient({
      ...client,
      status: client.status === 'Active' ? 'Inactive' : 'Active'
    });
  };

  const getStageIndex = (stage: ProspectingStage) => {
    if (stage === 'Discovery') return 0;
    if (stage === 'Active Deal') return 1;
    if (stage === 'Quoted') return 2;
    if (stage === 'Won') return 3;
    if (stage === 'Lost') return 4;
    return 0;
  };

  const currentIdx = getStageIndex(currentStage);

  return (
    <div 
      className={`space-y-2 ${compact ? 'text-xs' : 'text-sm'}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-[10px] uppercase tracking-wider text-stone-400">
          Pipeline Stage
        </span>
        <span className="font-semibold text-stone-800 text-[11px]">
          {currentStage}
        </span>
      </div>

      {/* Visual Timeline Stepper */}
      <div className="grid grid-cols-5 gap-1 bg-stone-100 p-1 rounded-xl">
        {STAGES.map((stage, idx) => {
          const isSelected = currentStage === stage;
          const isPast = (currentStage === 'Won' || currentStage === 'Lost') 
            ? idx < 3 
            : idx < currentIdx;

          let btnStyles = 'bg-transparent text-stone-500 hover:text-stone-800';

          if (isSelected) {
            if (stage === 'Won') {
              btnStyles = 'bg-stone-900 text-emerald-400 font-semibold shadow-2xs';
            } else if (stage === 'Lost') {
              btnStyles = 'bg-stone-900 text-rose-400 font-semibold shadow-2xs';
            } else {
              btnStyles = 'bg-stone-900 text-white font-semibold shadow-2xs';
            }
          } else if (isPast) {
            btnStyles = 'bg-stone-200/70 text-stone-700 font-medium';
          }

          return (
            <button
              key={stage}
              type="button"
              onClick={(e) => handleStageClick(stage, e)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer ${btnStyles}`}
              title={`Move to ${stage}`}
            >
              <div className="flex items-center justify-center mb-0.5">
                {isSelected ? (
                  stage === 'Won' ? (
                    <Trophy className="w-3 h-3 text-emerald-400" />
                  ) : stage === 'Lost' ? (
                    <XCircle className="w-3 h-3 text-rose-400" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )
                ) : isPast ? (
                  <Check className="w-2.5 h-2.5 text-stone-600" />
                ) : (
                  <span className="w-1 h-1 rounded-full bg-stone-300" />
                )}
              </div>
              <span className="text-[10px] leading-tight truncate max-w-full font-mono">
                {stage}
              </span>
            </button>
          );
        })}
      </div>

      {/* Terminal Actions Banner when Won or Lost */}
      {(currentStage === 'Won' || currentStage === 'Lost') && (
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs">
          <div className="flex items-center space-x-1.5 text-[11px] font-medium text-stone-700 truncate">
            {currentStage === 'Won' ? (
              <>
                <Trophy className="w-3.5 h-3.5 text-stone-800 shrink-0" />
                <span className="truncate">Deal Won · Ready for Project</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span className="truncate">Deal Closed Lost</span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {currentStage === 'Won' && onPromptWonProspect && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPromptWonProspect(client);
                }}
                className="inline-flex items-center space-x-1 px-2 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-[10px] font-medium shadow-2xs transition-colors cursor-pointer"
                title="Create client card for won engagement"
              >
                <span>Convert</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            )}

            {isAdmin ? (
              <button
                type="button"
                onClick={handleManualArchive}
                className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 transition-colors cursor-pointer"
                title={client.status === 'Inactive' ? 'Reactivate prospecting deal' : 'Archive prospecting deal (Admin)'}
              >
                <Archive className="w-2.5 h-2.5 text-stone-400" />
                <span>{client.status === 'Inactive' ? 'Unarchive' : 'Archive'}</span>
              </button>
            ) : (
              <span
                className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-[10px] font-mono text-stone-400 bg-stone-100 border border-stone-200 select-none"
                title={client.status === 'Inactive' ? "Non-admin users cannot reactivate inactive clients" : "Non-admin users cannot archive active clients"}
              >
                <Lock className="w-2.5 h-2.5 text-stone-400" />
                <span>{client.status === 'Inactive' ? 'Reactivation Locked' : 'Archival Locked'}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
