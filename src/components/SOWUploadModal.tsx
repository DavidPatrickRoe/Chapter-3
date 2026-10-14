import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Sparkles, 
  Building2, 
  FolderKanban, 
  Calendar, 
  CheckCircle2, 
  Users, 
  Layers, 
  DollarSign, 
  Plus, 
  Trash2, 
  Clock, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle,
  FileCheck,
  Check,
  ChevronDown,
  Repeat
} from 'lucide-react';
import { Client, ClientType, TaskPriority, TeamMember } from '../types';
import { SOWExtractionResult, ExtractedSOWTask } from '../utils/sowParser';
import { extractSOW, buildClientFromSOW, updateClientWithSOWPhase } from '../services/sowService';
import { HOME_HEALTH_SOW_TEXT, SAMPLE_SOW_LIST } from '../data/sampleSOW';

interface SOWUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: TeamMember;
  teamMembers: TeamMember[];
  clients: Client[];
  targetClientId?: string; // Preselected client if opened from a specific client page
  onClientCreated: (newClient: Client) => void;
  onClientUpdated: (updatedClient: Client) => void;
}

export const SOWUploadModal: React.FC<SOWUploadModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  teamMembers,
  clients,
  targetClientId,
  onClientCreated,
  onClientUpdated
}) => {
  // Step 1: Input / Upload / Paste  |  Step 2: Review & Customization Studio
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  
  // Mode: Create New Client vs Add SOW Phase to Existing Client
  const [mode, setMode] = useState<'new_client' | 'add_phase'>(targetClientId ? 'add_phase' : 'new_client');
  const [selectedExistingClientId, setSelectedExistingClientId] = useState<string>(targetClientId || (clients[0]?.id || ''));

  // SOW text content
  const [sowText, setSowText] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  
  // Processing state
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionMode, setExtractionMode] = useState<'gemini' | 'heuristic' | 'fallback' | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  // Extracted Result in Review Step
  const [extractedData, setExtractedData] = useState<SOWExtractionResult | null>(null);
  
  // Editable fields during review
  const [clientName, setClientName] = useState('');
  const [engagementTitle, setEngagementTitle] = useState('');
  const [clientType, setClientType] = useState<ClientType>('Project');
  const [industry, setIndustry] = useState('');
  const [leadConsultant, setLeadConsultant] = useState(currentUser.name);
  const [projectSummary, setProjectSummary] = useState('');
  const [phasesList, setPhasesList] = useState<string[]>([]);
  const [tasksList, setTasksList] = useState<ExtractedSOWTask[]>([]);
  
  // Filter for tasks in review step
  const [taskWorkstreamFilter, setTaskWorkstreamFilter] = useState<string>('All');
  const [activeReviewTab, setActiveReviewTab] = useState<'tasks' | 'overview' | 'milestones'>('tasks');

  // Bulk assignment state
  const [bulkTargetWorkstream, setBulkTargetWorkstream] = useState<string>('All');
  const [bulkAssigneeEmail, setBulkAssigneeEmail] = useState<string>('');

  if (!isOpen) return null;

  // Load sample SOW
  const handleLoadSample = (sampleText: string) => {
    setSowText(sampleText);
    setFileName('Home-Health-SOW.txt');
  };

  // Handle file drop / file pick
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setSowText(content);
    };
    reader.readAsText(file);
  };

  // Trigger SOW Analysis
  const handleAnalyzeSOW = async () => {
    if (!sowText.trim()) return;

    setIsExtracting(true);
    setExtractionError(null);

    try {
      const response = await extractSOW(sowText.trim(), teamMembers);
      setExtractionMode(response.mode);

      if (response.data) {
        const data = response.data;
        setExtractedData(data);
        
        // Populate review fields
        setClientName(data.clientName);
        setEngagementTitle(data.engagementTitle);
        setClientType(data.clientType);
        setIndustry(data.industry);
        setLeadConsultant(data.leadConsultant || currentUser.name);
        setProjectSummary(data.projectSummary);
        setPhasesList(data.phases);
        setTasksList(data.tasks);

        setStep('review');
      } else {
        setExtractionError('Could not parse SOW structure. Please verify the document text.');
      }
    } catch (err: any) {
      console.error('SOW extraction failed:', err);
      setExtractionError(err?.message || 'Error processing SOW. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Modify task in table
  const handleUpdateTask = (tempId: string, updates: Partial<ExtractedSOWTask>) => {
    setTasksList(prev => prev.map(t => t.tempId === tempId ? { ...t, ...updates } : t));
  };

  // Delete task from review list
  const handleDeleteTask = (tempId: string) => {
    setTasksList(prev => prev.filter(t => t.tempId !== tempId));
  };

  // Bulk assign all tasks in a workstream or all tasks
  const handleApplyBulkAssign = () => {
    if (!bulkAssigneeEmail) return;
    const targetEmail = bulkAssigneeEmail === 'unassigned' ? null : bulkAssigneeEmail;
    setTasksList(prev => prev.map(t => {
      if (bulkTargetWorkstream === 'All' || t.workstream === bulkTargetWorkstream) {
        return { ...t, assignedTo: targetEmail };
      }
      return t;
    }));
  };

  // Add custom task on the fly - strictly default to Unassigned
  const handleAddCustomTask = () => {
    const today = new Date();
    today.setDate(today.getDate() + 14);

    const newTask: ExtractedSOWTask = {
      tempId: `custom-t-${Date.now().toString(36)}`,
      description: 'New deliverable task',
      workstream: extractedData?.workstreams[0] || '1. Strategic Advisory',
      phase: phasesList[0] || 'Phase 1: Project Kickoff',
      priority: 'Medium',
      dueDate: today.toISOString().split('T')[0],
      assignedTo: null, // Strictly default to Unassigned
      isRecurring: false
    };

    setTasksList(prev => [newTask, ...prev]);
  };

  // Final confirmation to commit to CRM
  const handleConfirmAndCommit = () => {
    if (!extractedData) return;

    const finalizedResult: SOWExtractionResult = {
      ...extractedData,
      clientName: clientName.trim() || extractedData.clientName,
      engagementTitle: engagementTitle.trim() || extractedData.engagementTitle,
      clientType,
      industry: industry.trim() || extractedData.industry,
      leadConsultant: leadConsultant || currentUser.name,
      projectSummary: projectSummary.trim() || extractedData.projectSummary,
      phases: phasesList,
      tasks: tasksList
    };

    if (mode === 'new_client') {
      const { client } = buildClientFromSOW(finalizedResult, tasksList);
      onClientCreated(client);
    } else {
      const existingClient = clients.find(c => c.id === selectedExistingClientId);
      if (existingClient) {
        const updatedClient = updateClientWithSOWPhase(existingClient, finalizedResult, tasksList);
        onClientUpdated(updatedClient);
      }
    }

    onClose();
  };

  const filteredTasks = tasksList.filter(t => {
    if (taskWorkstreamFilter !== 'All' && t.workstream !== taskWorkstreamFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Header */}
        <div className="bg-stone-900 text-stone-100 px-6 py-4 flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-100">
              <Sparkles className="w-4 h-4 text-stone-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-normal font-serif text-white tracking-tight">
                  {step === 'upload' ? 'Statement of Work (SOW) Intake' : 'SOW Task Breakdown Studio'}
                </h3>
                <span className="text-[10px] font-mono tracking-widest bg-stone-800 text-stone-300 px-2 py-0.5 rounded-full border border-stone-700">
                  {step === 'upload' ? 'Step 1' : 'Step 2'}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                {step === 'upload' 
                  ? 'Extract deliverables, milestone phases, and actionable tasks from client Statement of Work'
                  : 'Review extracted client scope, fine-tune deliverables and assignees, and sync into CRM'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* ================= STEP 1: INPUT SOW ================= */}
          {step === 'upload' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              
              {/* Destination Mode Selector: New Client vs Existing Client Update */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                <label className="text-xs font-mono uppercase tracking-wider text-stone-600 block mb-2">
                  Destination in CRM *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMode('new_client')}
                    className={`flex items-start space-x-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      mode === 'new_client'
                        ? 'border-stone-900 bg-white shadow-2xs font-semibold'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <Building2 className={`w-4 h-4 shrink-0 mt-0.5 ${mode === 'new_client' ? 'text-stone-900' : 'text-stone-400'}`} />
                    <div>
                      <span className="text-xs font-semibold block">Create New Client Account</span>
                      <p className="text-[11px] text-stone-500 mt-0.5 font-normal">
                        Builds a new client card, adds phases, and creates all workstream tasks automatically.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('add_phase')}
                    className={`flex items-start space-x-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      mode === 'add_phase'
                        ? 'border-stone-900 bg-white shadow-2xs font-semibold'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <Layers className={`w-4 h-4 shrink-0 mt-0.5 ${mode === 'add_phase' ? 'text-stone-900' : 'text-stone-400'}`} />
                    <div>
                      <span className="text-xs font-semibold block">Update Existing Client / Add SOW Phase</span>
                      <p className="text-[11px] text-stone-500 mt-0.5 font-normal">
                        Appends Phase 2, amendment, or additional workstreams to an existing client card.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Existing Client Dropdown if add_phase mode */}
                {mode === 'add_phase' && (
                  <div className="mt-3 pt-3 border-t border-stone-200 flex items-center space-x-2">
                    <span className="text-xs font-medium text-stone-700">Select Existing Client:</span>
                    <select
                      value={selectedExistingClientId}
                      onChange={(e) => setSelectedExistingClientId(e.target.value)}
                      className="bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-xs font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 cursor-pointer"
                    >
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.type}) — {c.tasks.length} existing tasks
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Quick Sample SOW Loaders Banner */}
              <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-stone-900">
                      Sample SOW: Home + Health
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      Pre-loads the Chapter 3 Home + Health SOW text for fast testing.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleLoadSample(HOME_HEALTH_SOW_TEXT)}
                    className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-medium transition-all shadow-2xs flex items-center space-x-1.5 cursor-pointer active:scale-[0.98]"
                  >
                    <FileText className="w-3.5 h-3.5 text-stone-400" />
                    <span>Load Home + Health (Phase 1)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLoadSample(SAMPLE_SOW_LIST[1].text)}
                    className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg text-xs font-medium transition-all cursor-pointer"
                  >
                    <span>Load Phase 2</span>
                  </button>
                </div>
              </div>

              {/* File Dropzone & Paste Area */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-stone-600 flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-stone-500" />
                    <span>SOW Document Text *</span>
                  </label>

                  <div className="flex items-center space-x-2">
                    <label className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium cursor-pointer transition-colors border border-stone-200">
                      <Upload className="w-3.5 h-3.5 text-stone-500" />
                      <span>{fileName ? `File: ${fileName}` : 'Upload File (.txt, .md, .docx)'}</span>
                      <input
                        type="file"
                        accept=".txt,.md,.doc,.docx,.json"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    {sowText && (
                      <button
                        type="button"
                        onClick={() => {
                          setSowText('');
                          setFileName(null);
                        }}
                        className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    rows={12}
                    value={sowText}
                    onChange={(e) => setSowText(e.target.value)}
                    placeholder="Paste the Statement of Work (SOW) text here...

Example format:
Home + Health SOW
Campaign Execution & Strategic Advisory
Summary
Following the successful establishment of Home + Health's foundational messaging...
Scope of Work & Deliverables
1. Coordinated PR & Brand Awareness
Deliverables:
PR Campaign: ...
Timeline & Milestones
Month 1: Weeks 1-2 ...
Terms & Pricing
$8,650 CAD flat rate ..."
                    className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-stone-400"
                  />
                  {sowText && (
                    <div className="absolute right-3 bottom-3 text-[10px] bg-white/90 px-2 py-0.5 rounded-md border border-stone-200 text-stone-500 font-mono">
                      {sowText.split(/\s+/).filter(Boolean).length} words · {sowText.length} characters
                    </div>
                  )}
                </div>
              </div>

              {/* Extraction Error */}
              {extractionError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl flex items-center space-x-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{extractionError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleAnalyzeSOW}
                  disabled={!sowText.trim() || isExtracting}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-medium shadow-2xs disabled:opacity-50 cursor-pointer transition-all active:scale-[0.98]"
                >
                  {isExtracting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Extracting Deliverables...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Extract Deliverables & Scope</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* ================= STEP 2: REVIEW & CUSTOMIZATION STUDIO ================= */}
          {step === 'review' && extractedData && (
            <div className="space-y-6">
              
              {/* Header Status Bar */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-800 flex items-center justify-center font-bold">
                    <FileCheck className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        {mode === 'new_client' ? `Extracted SOW for ${clientName}` : `Extracted SOW Phase for ${clientName}`}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                        {tasksList.length} Tasks Ready
                      </span>
                      {extractionMode === 'gemini' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center space-x-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Gemini AI Breakdown</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                          Heuristic Scope Engine
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Review and fine-tune deliverables, assignees, priorities, and timeline before creating in CRM.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setStep('upload')}
                    className="flex items-center space-x-1 text-xs text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-semibold cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to SOW</span>
                  </button>
                </div>
              </div>

              {/* Engagement Meta Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-stone-500 block mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-stone-500 block mb-1">
                    Engagement Title / SOW Phase
                  </label>
                  <input
                    type="text"
                    value={engagementTitle}
                    onChange={(e) => setEngagementTitle(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-stone-500 block mb-1">
                    Industry / Sector
                  </label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-stone-500 block mb-1">
                    Lead Practice Consultant
                  </label>
                  <select
                    value={leadConsultant}
                    onChange={(e) => setLeadConsultant(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400"
                  >
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.name}>{m.name} ({m.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SOW Terms & Pricing Pill Banner */}
              {extractedData.pricing && (
                <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-4 flex-wrap gap-y-1">
                    <span className="font-semibold text-stone-900 flex items-center space-x-1.5 font-mono">
                      <DollarSign className="w-3.5 h-3.5 text-stone-700" />
                      <span>Fee: {extractedData.pricing.fee}</span>
                    </span>
                    <span className="text-stone-600">
                      Model: <strong className="text-stone-800">{extractedData.pricing.model}</strong>
                    </span>
                    <span className="text-stone-600">
                      Duration: <strong className="text-stone-800">{extractedData.pricing.estimatedDuration}</strong>
                    </span>
                    <span className="text-stone-600">
                      Terms: <em className="text-stone-700">{extractedData.pricing.terms}</em>
                    </span>
                  </div>

                  {extractedData.signatories && extractedData.signatories.length > 0 && (
                    <div className="text-[11px] text-stone-600 flex items-center space-x-2">
                      <span className="font-semibold text-stone-700">Signatories:</span>
                      {extractedData.signatories.map((s, idx) => (
                        <span key={idx} className="bg-white px-2 py-0.5 rounded-md border border-stone-200 font-medium text-stone-800">
                          {s.name} ({s.party})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Review Sub-Tabs: Tasks Table vs Scope Overview vs Milestones */}
              <div className="flex items-center justify-between border-b border-stone-200/90 pb-2">
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setActiveReviewTab('tasks')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeReviewTab === 'tasks'
                        ? 'bg-stone-900 text-stone-50 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`}
                  >
                    <span>Actionable CRM Tasks</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-stone-700 text-stone-200">
                      {tasksList.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveReviewTab('milestones')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeReviewTab === 'milestones'
                        ? 'bg-stone-900 text-stone-50 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`}
                  >
                    <span>Timeline & Milestones</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-stone-200 text-stone-700">
                      {extractedData.milestones.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveReviewTab('overview')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeReviewTab === 'overview'
                        ? 'bg-stone-900 text-stone-50 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`}
                  >
                    <span>Scope & Summary</span>
                  </button>
                </div>

                {activeReviewTab === 'tasks' && (
                  <button
                    type="button"
                    onClick={handleAddCustomTask}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-lg text-xs font-medium cursor-pointer transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Task</span>
                  </button>
                )}
              </div>

              {/* Sub-tab 1: Tasks Table */}
              {activeReviewTab === 'tasks' && (
                <div className="space-y-3.5">
                  
                  {/* Quick Bulk Assignment & Triage Toolbar */}
                  <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shrink-0">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-bold text-amber-950 block">Assign Workstreams to Team:</span>
                        <span className="text-[11px] text-amber-800">
                          {tasksList.filter(t => t.assignedTo).length} of {tasksList.length} assigned •{' '}
                          <strong className="text-amber-900 underline">
                            {tasksList.filter(t => !t.assignedTo).length} unassigned
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Batch Assign Controls */}
                    <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                      <span className="text-[11px] font-semibold text-amber-900">Workstream:</span>
                      <select
                        value={bulkTargetWorkstream}
                        onChange={(e) => setBulkTargetWorkstream(e.target.value)}
                        className="bg-white border border-amber-300 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="All">All Tasks ({tasksList.length})</option>
                        {extractedData.workstreams.map(ws => (
                          <option key={ws} value={ws}>{ws.replace(/^\d+\.\s*/, '')}</option>
                        ))}
                      </select>

                      <span className="text-amber-700 font-bold">→</span>

                      <select
                        value={bulkAssigneeEmail}
                        onChange={(e) => setBulkAssigneeEmail(e.target.value)}
                        className="bg-white border border-amber-300 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">-- Choose Consultant --</option>
                        {teamMembers.map(m => (
                          <option key={m.id} value={m.email}>{m.name} ({m.role})</option>
                        ))}
                        <option value="unassigned">Reset to Unassigned</option>
                      </select>

                      <button
                        type="button"
                        onClick={handleApplyBulkAssign}
                        disabled={!bulkAssigneeEmail}
                        className="px-3.5 py-1.5 bg-amber-800 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  {/* Workstream Filter Pills */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
                    <span className="text-slate-500 font-medium shrink-0">Filter Workstream:</span>
                    <button
                      type="button"
                      onClick={() => setTaskWorkstreamFilter('All')}
                      className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                        taskWorkstreamFilter === 'All' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      All ({tasksList.length})
                    </button>
                    {extractedData.workstreams.map((ws) => {
                      const count = tasksList.filter(t => t.workstream === ws).length;
                      const unassignedInWs = tasksList.filter(t => t.workstream === ws && !t.assignedTo).length;
                      return (
                        <button
                          key={ws}
                          type="button"
                          onClick={() => setTaskWorkstreamFilter(ws)}
                          className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors flex items-center space-x-1 ${
                            taskWorkstreamFilter === ws ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span>{ws.replace(/^\d+\.\s*/, '')} ({count})</span>
                          {unassignedInWs > 0 && (
                            <span className="w-2 h-2 rounded-full bg-amber-400" title={`${unassignedInWs} unassigned`} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tasks List Editor */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs divide-y divide-slate-100">
                    <div className="bg-slate-100 px-4 py-2.5 grid grid-cols-12 gap-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      <div className="col-span-4">Task Description & Deliverable</div>
                      <div className="col-span-2">Workstream / Category</div>
                      <div className="col-span-2">Milestone Phase</div>
                      <div className="col-span-1">Priority</div>
                      <div className="col-span-1">Due Date</div>
                      <div className="col-span-2">Assignee (Person Doing Task)</div>
                    </div>

                    <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                      {filteredTasks.map((task) => {
                        const assignedMember = teamMembers.find(m => m.email === task.assignedTo);

                        return (
                          <div key={task.tempId} className="px-4 py-3 bg-white hover:bg-slate-50/80 transition-colors grid grid-cols-12 gap-2.5 items-center text-xs">
                            {/* Description */}
                            <div className="col-span-4 space-y-1">
                              <input
                                type="text"
                                value={task.description}
                                onChange={(e) => handleUpdateTask(task.tempId, { description: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                              />
                              {task.deliverableRef && (
                                <span className="text-[10px] text-teal-700 font-medium block">
                                  Deliverable: {task.deliverableRef}
                                </span>
                              )}
                            </div>

                            {/* Workstream */}
                            <div className="col-span-2">
                              <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-md block truncate" title={task.workstream}>
                                {task.workstream.replace(/^\d+\.\s*/, '')}
                              </span>
                            </div>

                            {/* Phase */}
                            <div className="col-span-2">
                              <select
                                value={task.phase}
                                onChange={(e) => handleUpdateTask(task.tempId, { phase: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-800"
                              >
                                {phasesList.map(p => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            </div>

                            {/* Priority */}
                            <div className="col-span-1">
                              <select
                                value={task.priority}
                                onChange={(e) => handleUpdateTask(task.tempId, { priority: e.target.value as TaskPriority })}
                                className={`w-full text-[10px] font-extrabold uppercase px-1.5 py-1 rounded-md border ${
                                  task.priority === 'High' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                  task.priority === 'Medium' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                  'bg-sky-50 text-sky-700 border-sky-200'
                                }`}
                              >
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                              </select>
                            </div>

                            {/* Due Date */}
                            <div className="col-span-1">
                              <input
                                type="date"
                                value={task.dueDate}
                                onChange={(e) => handleUpdateTask(task.tempId, { dueDate: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[11px] font-semibold text-slate-700 cursor-pointer"
                              />
                            </div>

                            {/* Assignee Selection (Dedicated Column with Unassigned Visuals) */}
                            <div className="col-span-2 flex items-center justify-between space-x-1.5">
                              <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                                {assignedMember ? (
                                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${assignedMember.avatarColor} text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-xs`}>
                                    {assignedMember.initials}
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-amber-100 border border-dashed border-amber-400 text-amber-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                    ?
                                  </div>
                                )}

                                <select
                                  value={task.assignedTo || ''}
                                  onChange={(e) => handleUpdateTask(task.tempId, { assignedTo: e.target.value || null })}
                                  className={`flex-1 min-w-0 text-xs rounded-xl px-2 py-1 font-semibold transition-colors cursor-pointer border ${
                                    task.assignedTo
                                      ? 'bg-slate-50 border-slate-300 text-slate-800'
                                      : 'bg-amber-50/90 border-amber-300 text-amber-900 font-bold hover:bg-amber-100'
                                  }`}
                                >
                                  <option value="">-- Unassigned --</option>
                                  {teamMembers.map(m => (
                                    <option key={m.id} value={m.email}>{m.name} ({m.title})</option>
                                  ))}
                                </select>
                              </div>

                              {/* Delete Task */}
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.tempId)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors shrink-0"
                                title="Remove task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab 2: Timeline Milestones */}
              {activeReviewTab === 'milestones' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                      SOW Milestone Roadmap Progression
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {extractedData.milestones.map((ms, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {ms.timeline}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">Milestone {idx + 1}</span>
                          </div>
                          <h6 className="text-xs font-bold text-slate-900">{ms.milestone}</h6>
                          <p className="text-[11px] text-slate-600 leading-relaxed">{ms.keyActivities}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab 3: Scope & Summary */}
              {activeReviewTab === 'overview' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                      Project Scope & Narrative Summary
                    </label>
                    <textarea
                      rows={5}
                      value={projectSummary}
                      onChange={(e) => setProjectSummary(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Extracted Workstreams ({extractedData.workstreams.length})
                    </h5>
                    <div className="space-y-2">
                      {extractedData.workstreams.map((ws, idx) => {
                        const count = tasksList.filter(t => t.workstream === ws).length;
                        return (
                          <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800">{ws}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                              {count} actionable tasks
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Confirmation Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Edit SOW Text
                </button>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmAndCommit}
                    className="flex items-center space-x-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md shadow-slate-900/20 cursor-pointer transition-all active:scale-95"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>
                      {mode === 'new_client' 
                        ? `Confirm & Create Client (${tasksList.length} Tasks)`
                        : `Confirm & Add Phase to ${clientName} (${tasksList.length} Tasks)`}
                    </span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
