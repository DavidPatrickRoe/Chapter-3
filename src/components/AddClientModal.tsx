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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-serif">
                {initialValues?.name ? 'Convert Won Deal to Client Card' : 'Add New Client Engagement'}
              </h3>
              <p className="text-xs text-slate-500">
                {initialValues?.name 
                  ? 'Set up active project or retainer for won client engagement' 
                  : 'Create bespoke client card for Chapter 3 consulting'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Non-Admin Guard - Persona switching disabled */}
        {!isAdmin ? (
          <div className="my-6 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-900 flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">Admin Role Required</h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  You are authenticated as <strong>{currentUser.name} ({currentUser.role})</strong>. Creating new client cards and configuring high-level strategic scopes is restricted to Chapter 3 Partners (Admins).
                </p>
                <p className="text-xs text-amber-700 mt-2 leading-relaxed">
                  Because user sessions are strictly locked to individual Google tenant accounts, persona switching is disabled for all users and administrators. Please coordinate with a Chapter 3 Partner (e.g. David Roe or MJ Leslie) to create this client engagement.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">Need a client card created? Contact an administrator.</span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            
            {/* SOW Auto-Fill Option */}
            {onOpenSOWUpload && (
              <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Have a client SOW?</span>
                    <span className="text-[11px] text-slate-600">Auto-fill deliverables, phases, and CRM tasks from document text.</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSOWUpload();
                  }}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-xs cursor-pointer transition-all active:scale-95"
                >
                  Upload SOW
                </button>
              </div>
            )}

            {/* Client Name */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Client / Company Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Health Systems (B2B SaaS)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* Engagement Type Selector */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Engagement Model *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'Project', label: 'Project', icon: FolderKanban, desc: 'Completion % & milestones', selectedBorder: 'border-blue-500 bg-blue-50/80 text-blue-900 ring-blue-500' },
                  { value: 'Retainer', label: 'Retainer', icon: Repeat, desc: 'Recurring monthly sprint', selectedBorder: 'border-purple-500 bg-purple-50/80 text-purple-900 ring-purple-500' },
                  { value: 'Internal', label: 'Internal', icon: Building, desc: 'Firm growth initiatives', selectedBorder: 'border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-emerald-500' },
                  { value: 'Prospecting', label: 'Prospecting', icon: Sparkles, desc: 'Exploring New Engagement', selectedBorder: 'border-orange-500 bg-orange-50/80 text-orange-950 ring-orange-500' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = type === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setType(item.value as ClientType)}
                      className={`p-2.5 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? `shadow-xs ring-1 ${item.selectedBorder}`
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 mb-1">
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-900 font-bold' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold">
                          {item.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Industry & Lead Consultant */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Industry / Sector
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cleantech, FinTech, B2B SaaS"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Lead Practice Consultant
                </label>
                <select
                  value={leadConsultant}
                  onChange={(e) => setLeadConsultant(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium"
                >
                  <option value="All">All (All Practice Leads)</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.name}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Project Summary Scope */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Project Scope & Executive Summary *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Detail the core strategic objectives, buyer persona deliverables, and sales enablement milestones..."
                value={projectSummary}
                onChange={(e) => setProjectSummary(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none leading-relaxed"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md shadow-slate-900/20"
              >
                {initialValues?.name ? 'Create Client Card' : 'Create Client Card'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
