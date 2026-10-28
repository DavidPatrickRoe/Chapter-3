import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Users,
  Trash2,
  AlertTriangle,
  Archive,
  X,
  Edit3,
  Check,
  GripVertical
} from 'lucide-react';
import { Client, TeamMember } from '../types';
import { getProjectCompletionStats, getProgressBarColor } from '../utils/helpers';
import { ProspectingTimeline } from './ProspectingTimeline';

interface ClientCardProps {
  client: Client;
  currentUser: TeamMember;
  teamMembers: TeamMember[];
  onSelectClient: (client: Client) => void;
  onUpdateClient?: (client: Client) => void;
  onPromptWonProspect?: (client: Client) => void;
  onDeleteClient?: (clientId: string) => void;
  isDragging?: boolean;
  dropPosition?: 'before' | 'after' | null;
  onDragStartCard?: (e: React.DragEvent, clientId: string) => void;
  onDragOverCard?: (e: React.DragEvent, clientId: string) => void;
  onDragLeaveCard?: (e: React.DragEvent, clientId: string) => void;
  onDropCard?: (e: React.DragEvent, clientId: string) => void;
  onDragEndCard?: (e: React.DragEvent) => void;
}

export const ClientCard: React.FC<ClientCardProps> = ({
  client,
  currentUser,
  teamMembers,
  onSelectClient,
  onUpdateClient,
  onPromptWonProspect,
  onDeleteClient,
  isDragging = false,
  dropPosition = null,
  onDragStartCard,
  onDragOverCard,
  onDragLeaveCard,
  onDropCard,
  onDragEndCard
}) => {
  const isAdmin = currentUser.role === 'Admin';
  const wasDraggingRef = useRef(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(client.name);

  const handleDragStart = (e: React.DragEvent) => {
    if (isEditingTitle) {
      e.preventDefault();
      return;
    }
    wasDraggingRef.current = true;
    e.dataTransfer.setData('text/plain', client.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStartCard?.(e, client.id);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setTimeout(() => {
      wasDraggingRef.current = false;
    }, 150);
    onDragEndCard?.(e);
  };

  const handleCardClick = () => {
    if (wasDraggingRef.current) {
      wasDraggingRef.current = false;
      return;
    }
    onSelectClient(client);
  };

  useEffect(() => {
    setEditedTitle(client.name);
  }, [client.name]);

  const handleSaveTitle = () => {
    if (!isAdmin || !onUpdateClient) return;
    const trimmed = editedTitle.trim();
    if (!trimmed) {
      setEditedTitle(client.name);
      setIsEditingTitle(false);
      return;
    }
    if (trimmed !== client.name) {
      onUpdateClient({
        ...client,
        name: trimmed
      });
    }
    setIsEditingTitle(false);
  };

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

  // Category specific light shading & accents
  const getCategoryStyles = () => {
    switch (client.type) {
      case 'Project':
        return {
          label: 'Project',
          cardBg: 'bg-blue-100/75 hover:bg-blue-100/95',
          border: 'border-blue-300/80 hover:border-blue-400',
          dotClass: 'bg-blue-600',
          labelClass: 'text-blue-950 font-semibold',
          dividerClass: 'border-blue-200/80',
          progressBarBg: 'bg-blue-200/70',
          progressBarFill: 'bg-blue-600',
          subtleHover: 'hover:bg-blue-200/60',
        };
      case 'Retainer':
        return {
          label: 'Retainer',
          cardBg: 'bg-purple-100/75 hover:bg-purple-100/95',
          border: 'border-purple-300/80 hover:border-purple-400',
          dotClass: 'bg-purple-600',
          labelClass: 'text-purple-950 font-semibold',
          dividerClass: 'border-purple-200/80',
          progressBarBg: 'bg-purple-200/70',
          progressBarFill: 'bg-purple-600',
          subtleHover: 'hover:bg-purple-200/60',
        };
      case 'Internal':
        return {
          label: 'Internal',
          cardBg: 'bg-emerald-100/75 hover:bg-emerald-100/95',
          border: 'border-emerald-300/80 hover:border-emerald-400',
          dotClass: 'bg-emerald-600',
          labelClass: 'text-emerald-950 font-semibold',
          dividerClass: 'border-emerald-200/80',
          progressBarBg: 'bg-emerald-200/70',
          progressBarFill: 'bg-emerald-600',
          subtleHover: 'hover:bg-emerald-200/60',
        };
      case 'Prospecting':
      default:
        return {
          label: 'Prospect',
          cardBg: 'bg-orange-100/75 hover:bg-orange-100/95',
          border: 'border-orange-300/80 hover:border-orange-400',
          dotClass: 'bg-orange-600',
          labelClass: 'text-orange-950 font-semibold',
          dividerClass: 'border-orange-200/80',
          progressBarBg: 'bg-orange-200/70',
          progressBarFill: 'bg-orange-600',
          subtleHover: 'hover:bg-orange-200/60',
        };
    }
  };

  const categoryStyles = getCategoryStyles();

  return (
    <div
      draggable={!isEditingTitle}
      onDragStart={handleDragStart}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverCard?.(e, client.id);
      }}
      onDragLeave={(e) => onDragLeaveCard?.(e, client.id)}
      onDrop={(e) => {
        e.preventDefault();
        onDropCard?.(e, client.id);
      }}
      onDragEnd={handleDragEnd}
      onClick={handleCardClick}
      className={`group relative ${categoryStyles.cardBg} ${categoryStyles.border} rounded-2xl p-5 sm:p-5.5 transition-all duration-200 cursor-grab active:cursor-grabbing flex flex-col justify-between shadow-2xs hover:shadow-md select-none ${
        client.status === 'Inactive' ? 'opacity-70' : ''
      } ${
        isDragging ? 'opacity-30 scale-[0.98] border-dashed border-stone-500 shadow-none' : ''
      } ${
        dropPosition === 'before'
          ? 'ring-2 ring-stone-900 ring-offset-2'
          : dropPosition === 'after'
          ? 'ring-2 ring-stone-900 ring-offset-2'
          : ''
      }`}
    >
      {/* Visual Drop Guide Indicators */}
      {dropPosition === 'before' && (
        <div className="absolute -top-1.5 left-2 right-2 h-1 bg-stone-900 rounded-full z-30 pointer-events-none shadow-xs animate-pulse" />
      )}
      {dropPosition === 'after' && (
        <div className="absolute -bottom-1.5 left-2 right-2 h-1 bg-stone-900 rounded-full z-30 pointer-events-none shadow-xs animate-pulse" />
      )}

      <div>
        {/* Top Metadata Row: Category color coded & Drag Handle */}
        <div className="flex items-center justify-between gap-2 text-xs text-stone-500 mb-2">
          <div className="flex items-center space-x-1.5 truncate">
            <span
              className="text-stone-400 group-hover:text-stone-700 transition-colors cursor-grab active:cursor-grabbing -ml-1 p-0.5 rounded hover:bg-black/5 shrink-0"
              title="Click and drag to reorder cards"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </span>
            <span className="flex items-center space-x-1.5 font-medium">
              <span className={`w-2 h-2 rounded-full ${categoryStyles.dotClass}`} />
              <span className={categoryStyles.labelClass}>{categoryStyles.label}</span>
            </span>
            {client.industry && (
              <>
                <span aria-hidden="true" className="text-stone-300">·</span>
                <span className="truncate max-w-[140px] text-stone-600" title={client.industry}>
                  {client.industry}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {isAdmin && onDeleteClient && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(true);
                }}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Permanently delete client (Admin only)"
                aria-label={`Permanently delete ${client.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {isAdmin && onUpdateClient && client.status === 'Active' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateClient({
                    ...client,
                    status: 'Inactive'
                  });
                }}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-stone-400 hover:text-amber-700 hover:bg-amber-100/60 transition-colors cursor-pointer"
                title="Move client and deliverables to Archive (Admin only)"
                aria-label={`Archive ${client.name}`}
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
            )}

            {client.status === 'Inactive' ? (
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-600 font-semibold">
                  Archived
                </span>
                {isAdmin && onUpdateClient && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateClient({
                        ...client,
                        status: 'Active'
                      });
                    }}
                    className="text-[10px] font-mono font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 transition-colors cursor-pointer"
                    title="Reactivate this engagement (Admin only)"
                  >
                    Reactivate
                  </button>
                )}
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-stone-400 group-hover:text-stone-900 group-hover:translate-x-0.5 transition-all shrink-0">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </div>

        {/* Client Title / Editable by Admins Only */}
        {isEditingTitle ? (
          <div 
            className="flex items-center space-x-1.5 mb-2"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveTitle();
                } else if (e.key === 'Escape') {
                  setIsEditingTitle(false);
                  setEditedTitle(client.name);
                }
              }}
              autoFocus
              className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-base font-serif font-normal text-stone-950 focus:outline-none focus:ring-1 focus:ring-stone-500 shadow-2xs"
              placeholder="Engagement name"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSaveTitle();
              }}
              disabled={!editedTitle.trim()}
              className="p-1 rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
              title="Save engagement name"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingTitle(false);
                setEditedTitle(client.name);
              }}
              className="p-1 rounded-lg bg-stone-200 text-stone-700 hover:bg-stone-300 transition-colors shrink-0 cursor-pointer"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between group/title mb-1.5">
            <h3 className="font-serif text-xl font-normal text-stone-950 group-hover:text-stone-700 transition-colors tracking-tight line-clamp-1">
              {client.name}
            </h3>
            {isAdmin && onUpdateClient && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditedTitle(client.name);
                  setIsEditingTitle(true);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-stone-400 hover:text-stone-900 hover:bg-black/5 transition-all cursor-pointer ml-1.5 shrink-0"
                title="Rename engagement (Admin only)"
                aria-label={`Rename ${client.name}`}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Project Summary Snippet */}
        <p className="text-xs text-stone-600 leading-relaxed line-clamp-2 mb-4 font-normal">
          {client.projectSummary || 'No executive scope description recorded.'}
        </p>
      </div>

      {/* Structured Metrics Section */}
      <div className={`pt-3 border-t ${categoryStyles.dividerClass} space-y-3`}>
        
        {isProspecting ? (
          /* Prospecting Stepper */
          <div className="space-y-2">
            <ProspectingTimeline
              client={client}
              currentUser={currentUser}
              isAdmin={isAdmin}
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
            <div className={`w-full ${categoryStyles.progressBarBg} rounded-full h-1.5 overflow-hidden`}>
              <div
                className={`h-full ${categoryStyles.progressBarFill} rounded-full transition-all duration-500 ease-out`}
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
        <div className={`flex items-center justify-between pt-2 border-t ${categoryStyles.dividerClass} text-xs`}>
          
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
              className={`bg-transparent ${categoryStyles.subtleHover} text-stone-800 rounded-md px-1.5 py-0.5 text-[11px] font-medium border-0 focus:ring-1 focus:ring-stone-400 cursor-pointer max-w-[120px] truncate transition-colors`}
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

      {/* Admin Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteModal(false);
          }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(false);
                }}
                className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-stone-600 space-y-2 leading-relaxed">
              <p>
                Are you sure you want to permanently delete <strong className="text-stone-950">{client.name}</strong>?
              </p>
              <p className="bg-stone-50 border border-stone-200 p-2.5 rounded-xl text-[11px] text-stone-500 font-mono">
                This will permanently delete this client card, all <strong className="text-stone-800 font-semibold">{client.tasks?.length || 0}</strong> deliverables and associated notes, and all SOW history from Firestore. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(false);
                }}
                disabled={isDeleting}
                className="px-3.5 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 rounded-xl border border-stone-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!isAdmin || !onDeleteClient) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteClient(client.id);
                  } finally {
                    setIsDeleting(false);
                    setShowDeleteModal(false);
                  }
                }}
                disabled={isDeleting}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-2xs transition-colors cursor-pointer disabled:opacity-50 active:scale-[0.98]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
