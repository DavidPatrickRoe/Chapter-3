import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Upload, 
  ChevronDown, 
  LogOut, 
  LogIn, 
  ShieldCheck, 
  CheckCircle2, 
  Database,
  Building2,
  FolderKanban
} from 'lucide-react';
import { TeamMember } from '../types';
import { FirebaseUser } from '../firebase/config';

interface NavbarProps {
  currentUser: TeamMember;
  teamMembers: TeamMember[];
  showInactive: boolean;
  onToggleShowInactive: (show: boolean) => void;
  onOpenAddClient: () => void;
  onOpenSOWUpload?: () => void;
  activeClientCount: number;
  inactiveClientCount: number;
  totalOpenTasks: number;
  cloudStatus?: 'connected' | 'syncing' | 'offline';
  firebaseUser?: FirebaseUser | null;
  onSignInGoogle?: () => void;
  onSignOutGoogle?: () => void;
  onSelectConsultant?: (member: TeamMember) => void;
  isSigningIn?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  teamMembers,
  showInactive,
  onToggleShowInactive,
  onOpenAddClient,
  onOpenSOWUpload,
  activeClientCount,
  inactiveClientCount,
  totalOpenTasks,
  cloudStatus = 'connected',
  firebaseUser,
  onSignInGoogle,
  onSignOutGoogle,
  onSelectConsultant,
  isSigningIn = false
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdmin = currentUser.role === 'Admin';

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-stone-200/90 text-stone-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          
          {/* Zone 1: Bespoke Wordmark */}
          <div className="flex items-center space-x-3 shrink-0">
            <a href="/" className="group flex items-baseline space-x-2.5">
              <span className="font-serif text-2xl sm:text-[26px] font-normal tracking-tight text-stone-950 group-hover:text-stone-700 transition-colors">
                Chapter 3
              </span>
              <span className="text-[11px] font-mono tracking-widest text-stone-600 uppercase border-l border-stone-300 pl-2.5">
                Advisory
              </span>
            </a>

            {/* Quiet Real-Time Connection Dot */}
            <div 
              className="hidden md:flex items-center space-x-1.5 pl-3 border-l border-stone-200 text-[11px] font-mono text-stone-600"
              title={cloudStatus === 'connected' ? 'Firestore live & synchronized' : cloudStatus === 'syncing' ? 'Syncing updates' : 'Local cache'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                cloudStatus === 'connected' ? 'bg-emerald-500' :
                cloudStatus === 'syncing' ? 'bg-amber-500 animate-pulse' :
                'bg-stone-300'
              }`} />
              <span className="text-stone-600">
                {cloudStatus === 'connected' ? 'Live' : cloudStatus === 'syncing' ? 'Syncing' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation & View Controller */}
          <nav className="flex items-center space-x-1 bg-stone-200/60 p-1 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => onToggleShowInactive(false)}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-2 ${
                !showInactive
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>Engagements</span>
              <span className={`text-[11px] font-mono tabular-nums px-1.5 py-0.2 rounded-md ${
                !showInactive ? 'bg-stone-100 text-stone-700' : 'text-stone-400'
              }`}>
                {activeClientCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onToggleShowInactive(true)}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-2 ${
                showInactive
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>Archive</span>
              <span className={`text-[11px] font-mono tabular-nums px-1.5 py-0.2 rounded-md ${
                showInactive ? 'bg-stone-100 text-stone-700' : 'text-stone-400'
              }`}>
                {inactiveClientCount}
              </span>
            </button>
          </nav>

          {/* Zone 3: Primary Actions & Identity */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
            
            {/* Upload SOW action */}
            {onOpenSOWUpload && (
              <button
                type="button"
                onClick={onOpenSOWUpload}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-700 hover:text-stone-950 hover:bg-stone-100 border border-stone-300 transition-all cursor-pointer active:scale-[0.98]"
                title="Upload Statement of Work to auto-extract deliverables"
              >
                <Upload className="w-3.5 h-3.5 text-stone-500" />
                <span>Upload SOW</span>
              </button>
            )}

            {/* Add Client Engagement button */}
            <button
              type="button"
              onClick={onOpenAddClient}
              className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-xs active:scale-[0.98] ${
                isAdmin
                  ? 'bg-stone-900 hover:bg-stone-800 text-white cursor-pointer'
                  : 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
              }`}
              title={isAdmin ? 'Create new client engagement' : 'Admin role required to create clients'}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Client</span>
              {!isAdmin && <span className="text-[10px] text-stone-400 font-mono">(Admin)</span>}
            </button>

            {/* Authenticated Consultant Profile Pill */}
            {!currentUser ? (
              <button
                type="button"
                onClick={onSignInGoogle}
                disabled={isSigningIn}
                className="inline-flex items-center space-x-1.5 bg-stone-900 hover:bg-stone-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-xs cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isSigningIn ? 'Signing in...' : 'Sign in'}</span>
              </button>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center space-x-2 bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 rounded-xl px-2.5 py-1.5 transition-all text-left cursor-pointer shadow-2xs"
                  title="View your verified Chapter 3 profile"
                >
                  {firebaseUser?.photoURL ? (
                    <img
                      src={firebaseUser.photoURL}
                      alt={currentUser.name}
                      className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-stone-200"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-stone-900 text-white text-[11px] font-medium flex items-center justify-center text-center select-none shrink-0">
                      {currentUser.initials}
                    </div>
                  )}

                  <div className="hidden md:block leading-tight pr-1">
                    <span className="text-xs font-semibold text-stone-900 block truncate max-w-[110px]">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono block">
                      {currentUser.role}
                    </span>
                  </div>

                  <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Details Dropdown */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white border border-stone-200 rounded-2xl shadow-xl p-3 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
                    
                    {/* User Summary Card */}
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 mb-2.5">
                      <div className="flex items-center space-x-3">
                        {firebaseUser?.photoURL ? (
                          <img
                            src={firebaseUser.photoURL}
                            alt={currentUser.name}
                            className="w-9 h-9 rounded-full object-cover ring-1 ring-stone-200 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-stone-900 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                            {currentUser.initials}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-stone-900 truncate">
                            {currentUser.name}
                          </p>
                          <p className="text-[11px] text-stone-500 font-mono truncate">
                            {currentUser.email}
                          </p>
                          <span className="inline-block mt-0.5 text-[10px] text-stone-600 font-mono">
                            {currentUser.title} · {currentUser.role}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-stone-200/70 flex items-center justify-between text-[10px] text-stone-500 font-mono">
                        <span className="flex items-center space-x-1 text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Tenant: @chapter3.ca</span>
                        </span>
                        <span className="text-stone-400">Locked Identity</span>
                      </div>
                    </div>

                    {/* Consultant Switcher for Role Testing */}
                    {onSelectConsultant && (
                      <div className="mb-2 pb-2 border-b border-stone-100">
                        <div className="px-1 mb-1.5 flex items-center justify-between text-[10px] font-mono uppercase text-stone-400">
                          <span>Switch Role Persona</span>
                          <span className="text-[9px] text-stone-400 font-normal">RBAC Testing</span>
                        </div>
                        <div className="space-y-1">
                          {teamMembers.map((member) => (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => {
                                onSelectConsultant(member);
                                setProfileDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                                currentUser.id === member.id || currentUser.email === member.email
                                  ? 'bg-stone-100 text-stone-900 font-semibold'
                                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                              }`}
                            >
                              <div className="flex items-center space-x-2 truncate">
                                <span className="w-5 h-5 rounded-full bg-stone-800 text-white font-mono text-[9px] flex items-center justify-center shrink-0">
                                  {member.initials}
                                </span>
                                <span className="truncate">{member.name}</span>
                              </div>
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                member.role === 'Admin' 
                                  ? 'bg-stone-900 text-white' 
                                  : 'bg-stone-200 text-stone-700'
                              }`}>
                                {member.role}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sign Out Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        if (onSignOutGoogle) onSignOutGoogle();
                      }}
                      className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl text-xs font-medium transition-all cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-stone-400" />
                      <span>Sign Out of Workspace</span>
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
