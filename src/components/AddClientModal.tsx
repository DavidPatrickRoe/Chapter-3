import React, { useState } from 'react';
import { X, Building2, ShieldAlert, Sparkles, FolderKanban, Repeat, Building } from 'lucide-react';
import { Client, ClientType, TeamMember } from '../types';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: TeamMember;
  teamMembers: TeamMember[];
  onAddClient: (newClient: Omit<Client, 'id' | 'tasks'>) => void;
  onSwitchToAdmin: (adminUser: TeamMember) => void;
}

export const AddClientModal: React.FC<AddClientModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  teamMembers,
  onAddClient,
  onSwitchToAdmin
}) => {
  const isAdmin = currentUser.role === 'Admin';

  const [name, setName] = useState('');
  const [type, setType] = useState<ClientType>('Project');
  const [industry, setIndustry] = useState('');
  const [leadConsultant, setLeadConsultant] = useState(currentUser.name);
  const [projectSummary, setProjectSummary] = useState('');

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
      startDate: new Date().toISOString().split('T')[0]
    });

    // Reset form
    setName('');
    setIndustry('');
    setProjectSummary('');
    onClose();
  };

  const adminMembers = teamMembers.filter(m => m.role === 'Admin');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-serif">
                Add New Client Engagement
              </h3>
              <p className="text-xs text-slate-500">Create bespoke client card for Chapter 3 consulting</p>
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

        {/* Non-Admin Guard */}
        {!isAdmin ? (
          <div className="my-6 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-900 flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">Admin Role Required</h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  You are currently switched to <strong>{currentUser.name} ({currentUser.role})</strong>. Creating new client cards and editing high-level client scopes is reserved for Chapter 3 Partners (Admins).
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <p className="text-xs font-bold text-slate-700">Switch to an Admin to continue:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {adminMembers.map(admin => (
                  <button
                    key={admin.id}
                    type="button"
                    onClick={() => {
                      onSwitchToAdmin(admin);
                    }}
                    className="flex items-center space-x-2 p-2.5 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 transition-all text-left"
                  >
                    <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${admin.avatarColor} text-white font-bold text-[10px] flex items-center justify-center shrink-0`}>
                      {admin.initials}
                    </div>
                    <div>
                      <p className="leading-tight">{admin.name}</p>
                      <span className="text-[10px] text-amber-700 font-bold uppercase">Admin</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            
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
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { value: 'Project', label: 'Project', icon: FolderKanban, desc: 'Completion % & milestones' },
                  { value: 'Retainer', label: 'Retainer', icon: Repeat, desc: 'Recurring monthly sprint' },
                  { value: 'Internal', label: 'Internal', icon: Building, desc: 'Firm growth initiatives' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = type === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setType(item.value as ClientType)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50/70 shadow-xs ring-1 ring-sky-500'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 mb-1">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-sky-600' : 'text-slate-400'}`} />
                        <span className={`text-xs font-bold ${isSelected ? 'text-sky-900' : 'text-slate-800'}`}>
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
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-900/20"
              >
                Create Client Card
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
