import React, { useState, useEffect } from 'react';
import { X, Building2, ShieldAlert, Sparkles, FolderKanban, Repeat, Building } from 'lucide-react';
import { Client, ClientType, TeamMember } from '../types';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: TeamMember;
  teamMembers: TeamMember[];
  onAddClient: (newClient: Omit<Client, 'id' | 'tasks'>) => void;
  onOpenSOWUpload?: () => void;
  initialValues?: Partial<Client> | null;
}

export const AddClientModal: React.FC<AddClientModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  teamMembers,
  onAddClient,
  onOpenSOWUpload,
  initialValues
}) => {
  const isAdmin = currentUser.role === 'Admin';

  const [name, setName] = useState('');
  const [type, setType] = useState<ClientType>('Project');
  const [industry, setIndustry] = useState('');
  const [leadConsultant, setLeadConsultant] = useState(currentUser.name);
  const [projectSummary, setProjectSummary] = useState('');

  // Sync initial values if provided (e.g. from won prospect conversion)
  useEffect(() => {
    if (isOpen) {
      if (initialValues) {
        setName(initialValues.name || '');
        setType(initialValues.type && initialValues.type !== 'Prospecting' ? initialValues.type : 'Project');
        setIndustry(initialValues.industry || '');
        setLeadConsultant(initialValues.leadConsultant || currentUser.name);
        setProjectSummary(initialValues.projectSummary || '');
      } else {
        setName('');
        setType('Project');
        setIndustry('');
        setLeadConsultant(currentUser.name);
        setProjectSummary('');
      }
    }
  }, [isOpen, initialValues, currentUser.name]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !name.trim()) return;

    onAddClient({
      name: name.trim(),
      type,
      status: 'Active',
      industry: industry.trim() || undefined,
      leadConsultant: leadConsultant || currentUser.name,
      projectSummary: projectSummary.trim(),
      startDate: new Date().toISOString().split('T')[0],
      prospectingStage: type === 'Prospecting' ? 'Discovery' : undefined
    });

    // Reset form
    setName('');
    setIndustry('');
    setProjectSummary('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-xl w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <h3 className="font-serif text-xl font-normal text-stone-950 tracking-tight">
              {initialValues?.name ? 'Convert Prospect to Engagement' : 'New Client Engagement'}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {initialValues?.name 
                ? 'Create active project or retainer for won prospect' 
                : 'Set up an engagement card and practice scope for Chapter 3'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Non-Admin Guard */}
        {!isAdmin ? (
          <div className="my-6 space-y-4">
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 text-stone-800 flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 text-stone-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-900">Partner Permission Required</h4>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  You are authenticated as <strong>{currentUser.name} ({currentUser.role})</strong>. Creating new client accounts and configuring strategic scope is restricted to Chapter 3 Partners (Admins).
                </p>
                <p className="text-xs text-stone-500 mt-2 leading-relaxed font-mono text-[11px]">
                  Please coordinate with David Roe or Mary Jane Leslie to provision this client engagement.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-medium transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            
            {/* SOW Auto-Fill Option */}
            {onOpenSOWUpload && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-stone-900 block">Have a client SOW?</span>
                    <span className="text-[11px] text-stone-500">Auto-extract deliverables, phases, and CRM tasks from document text.</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSOWUpload();
                  }}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-medium whitespace-nowrap shadow-2xs cursor-pointer transition-all active:scale-[0.98]"
                >
                  Upload SOW
                </button>
              </div>
            )}

            {/* Client Name */}
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-stone-600 block mb-1">
                Client / Company Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Health Systems"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </div>

            {/* Engagement Type Selector */}
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-stone-600 block mb-1.5">
                Engagement Model *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'Project', label: 'Project', icon: FolderKanban, desc: 'Deliverables & milestones' },
                  { value: 'Retainer', label: 'Retainer', icon: Repeat, desc: 'Monthly advisory sprint' },
                  { value: 'Internal', label: 'Internal', icon: Building, desc: 'Firm strategic initiative' },
                  { value: 'Prospecting', label: 'Prospecting', icon: Sparkles, desc: 'Pipeline deal discovery' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = type === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setType(item.value as ClientType)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-stone-900 bg-stone-50 shadow-2xs font-semibold'
                          : 'border-stone-200 hover:bg-stone-50 text-stone-600'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 mb-1">
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-stone-900' : 'text-stone-400'}`} />
                        <span className="text-xs">
                          {item.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-400 leading-tight font-normal">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Industry & Lead Consultant */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-stone-600 block mb-1">
                  Industry / Sector
                </label>
                <input
                  type="text"
                  placeholder="e.g. B2B SaaS, CleanTech"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>

              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-stone-600 block mb-1">
                  Lead Practice Consultant
                </label>
                <select
                  value={leadConsultant}
                  onChange={(e) => setLeadConsultant(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 font-medium focus:outline-none focus:ring-1 focus:ring-stone-400 cursor-pointer"
                >
                  <option value="All">All Practice Leads</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.name}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Project Summary Scope */}
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-stone-600 block mb-1">
                Project Scope & Strategic Summary *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Detail core strategic objectives, buyer persona deliverables, and sales enablement milestones..."
                value={projectSummary}
                onChange={(e) => setProjectSummary(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 leading-relaxed"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-medium shadow-2xs cursor-pointer active:scale-[0.98]"
              >
                Create Engagement
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
