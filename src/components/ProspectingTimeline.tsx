import React from 'react';
import { Check, Sparkles, XCircle, Trophy, Archive, ArrowRight } from 'lucide-react';
import { Client, ProspectingStage } from '../types';

interface ProspectingTimelineProps {
  client: Client;
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
  onUpdateClient,
  onPromptWonProspect,
  compact = false
}) => {
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
      className={`space-y-2.5 ${compact ? 'text-xs' : 'text-sm'}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-orange-600" />
          <span className="font-bold text-orange-950 text-[11px] uppercase tracking-wider">
            Deal Pipeline Stage
          </span>
        </div>
        <span className="text-[11px] font-semibold text-orange-800 bg-orange-200/70 border border-orange-300 px-2 py-0.5 rounded-md">
          {currentStage}
        </span>
      </div>

      {/* Visual Timeline Interactive Stepper */}
      <div className="grid grid-cols-5 gap-1 bg-white/80 p-1.5 rounded-xl border border-orange-200/80 shadow-xs">
        {STAGES.map((stage, idx) => {
          const isSelected = currentStage === stage;
          const isPast = (currentStage === 'Won' || currentStage === 'Lost') 
            ? idx < 3 
            : idx < currentIdx;

          let btnStyles = 'bg-slate-100 text-slate-600 hover:bg-orange-100 hover:text-orange-900 border-transparent';

          if (isSelected) {
            if (stage === 'Won') {
              btnStyles = 'bg-emerald-600 text-white font-black shadow-xs ring-2 ring-emerald-400 border-emerald-700';
            } else if (stage === 'Lost') {
              btnStyles = 'bg-rose-600 text-white font-black shadow-xs ring-2 ring-rose-400 border-rose-700';
            } else {
              btnStyles = 'bg-orange-600 text-white font-black shadow-xs ring-2 ring-orange-400 border-orange-700';
            }
          } else if (isPast) {
            btnStyles = 'bg-orange-100/80 text-orange-800 font-semibold border-orange-200';
          }

          return (
            <button
              key={stage}
              type="button"
              onClick={(e) => handleStageClick(stage, e)}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-center transition-all cursor-pointer ${btnStyles}`}
              title={`Click to set stage to ${stage}`}
            >
              <div className="flex items-center justify-center mb-0.5">
                {isSelected ? (
                  stage === 'Won' ? (
                    <Trophy className="w-3 h-3 text-amber-200" />
                  ) : stage === 'Lost' ? (
                    <XCircle className="w-3 h-3 text-rose-200" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )
                ) : isPast ? (
                  <Check className="w-3 h-3 text-orange-600" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                )}
              </div>
              <span className="text-[10px] leading-tight font-bold truncate max-w-full">
                {stage}
              </span>
            </button>
          );
        })}
      </div>

      {/* Terminal Actions Banner when Won or Lost */}
      {(currentStage === 'Won' || currentStage === 'Lost') && (
        <div className={`flex items-center justify-between gap-2 p-2 rounded-xl border ${
          currentStage === 'Won' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
            : 'bg-slate-100 text-slate-800 border-slate-300'
        }`}>
          <div className="flex items-center space-x-1.5 text-[11px] font-semibold truncate">
            {currentStage === 'Won' ? (
              <>
                <Trophy className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Won Deal! Ready for Onboarding</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">Deal Closed as Lost</span>
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
                className="inline-flex items-center space-x-1 px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold shadow-xs transition-colors"
                title="Create a new client engagement card for this won prospect"
              >
                <span>+ New Client Card</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleManualArchive}
              className={`inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                client.status === 'Inactive'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
              title="Manually archive or restore this prospecting card"
            >
              <Archive className="w-2.5 h-2.5" />
              <span>{client.status === 'Inactive' ? 'Unarchive' : 'Archive Deal'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
