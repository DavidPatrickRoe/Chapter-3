import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  ChevronDown, 
  Plus, 
  ShieldCheck, 
  User as UserIcon, 
  Check, 
  Filter, 
  Sparkles,
  Layers,
  CalendarCheck,
  Database,
  LogIn,
  LogOut,
  CheckCircle2
} from 'lucide-react';
import { TeamMember, Role } from '../types';
import { FirebaseUser } from '../firebase/config';

interface NavbarProps {
  currentUser: TeamMember;
  teamMembers: TeamMember[];
  onSelectUser: (user: TeamMember) => void;
  showInactive: boolean;
  onToggleShowInactive: (show: boolean) => void;
  onOpenAddClient: () => void;
  activeClientCount: number;
  inactiveClientCount: number;
  totalOpenTasks: number;
  cloudStatus?: 'connected' | 'syncing' | 'offline';
  firebaseUser?: FirebaseUser | null;
  onSignInGoogle?: () => void;
  onSignOutGoogle?: () => void;
  isSigningIn?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  teamMembers,
  onSelectUser,
  showInactive,
  onToggleShowInactive,
  onOpenAddClient,
  activeClientCount,
  inactiveClientCount,
  totalOpenTasks,
  cloudStatus = 'connected',
  firebaseUser,
  onSignInGoogle,
  onSignOutGoogle,
  isSigningIn = false
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdmin = currentUser.role === 'Admin';


  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-teal-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20 font-bold text-white tracking-wider text-base">
                C3
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-xl tracking-tight text-white font-serif">Chapter 3</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full border border-sky-400/30">
                    Consulting OS
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">Sales & Marketing Growth Advisory</p>
              </div>
            </div>

            {/* Live Metrics & Cloud DB Pill Badges */}
            <div className="hidden lg:flex items-center space-x-2 pl-6 border-l border-slate-800 text-xs">
              <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                <Building2 className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-slate-400">Active Clients:</span>
                <span className="font-semibold text-white">{activeClientCount}</span>
              </div>
              <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                <CalendarCheck className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-slate-400">Open Priority Tasks:</span>
                <span className="font-semibold text-teal-300">{totalOpenTasks}</span>
              </div>
              <div 
                className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 cursor-help"
                title={cloudStatus === 'connected' ? 'Firestore database live & synced' : cloudStatus === 'syncing' ? 'Syncing changes to Firestore' : 'Operating in offline cache mode'}
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">Database:</span>
                <span className="flex items-center space-x-1 font-semibold text-emerald-300">
                  <span className={`w-1.5 h-1.5 rounded-full ${cloudStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : cloudStatus === 'syncing' ? 'bg-amber-400 animate-spin' : 'bg-slate-500'}`} />
                  <span>{cloudStatus === 'connected' ? 'Firestore Live' : cloudStatus === 'syncing' ? 'Syncing...' : 'Local Cache'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Controls: Filters, Add Client, User Switcher */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            
            {/* Active vs Inactive Toggle */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700/80 text-xs shadow-inner">
              <button
                type="button"
                onClick={() => onToggleShowInactive(false)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all duration-150 flex items-center space-x-1.5 ${
                  !showInactive
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Active</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${!showInactive ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                  {activeClientCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onToggleShowInactive(true)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all duration-150 flex items-center space-x-1.5 ${
                  showInactive
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Inactive / Archived</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${showInactive ? 'bg-slate-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                  {inactiveClientCount}
                </span>
              </button>
            </div>

            {/* Add Client Card Button */}
            <button
              type="button"
              onClick={onOpenAddClient}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 ${
                isAdmin
                  ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-900/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-750 border border-slate-700 cursor-pointer'
              }`}
              title={isAdmin ? 'Create New Client Card' : 'Admin role required to create new clients'}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Client Card</span>
              {!isAdmin && (
                <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">Admin Only</span>
              )}
            </button>

            {/* Google Authentication Section */}
            {!firebaseUser ? (
              <button
                type="button"
                onClick={onSignInGoogle}
                disabled={isSigningIn}
                className="flex items-center space-x-2 bg-white hover:bg-slate-100 text-slate-900 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-60 cursor-pointer border border-slate-200"
                title="Sign in with your Google account"
              >
                {isSigningIn ? (
                  <span className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4 text-sky-600" />
                )}
                <span className="whitespace-nowrap">{isSigningIn ? 'Signing in...' : 'Sign in with Google'}</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                {/* Visible Logout Button */}
                <button
                  type="button"
                  onClick={onSignOutGoogle}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-100 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Sign out of Google account"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}

            {/* User Switcher Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/90 rounded-xl px-3 py-1.5 transition-all text-left group"
              >
                {firebaseUser?.photoURL ? (
                  <img
                    src={firebaseUser.photoURL}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full object-cover shadow shrink-0 border border-sky-400/50"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${currentUser.avatarColor} flex items-center justify-center text-center leading-none select-none font-bold text-white text-[16px] pt-0.5 shadow shrink-0`}>
                    {currentUser.initials}
                  </div>
                )}
                <div className="hidden md:block">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-white truncate max-w-[110px]">{currentUser.name}</span>
                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                      isAdmin ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-sky-400/20 text-sky-300 border border-sky-400/30'
                    }`}>
                      {currentUser.role}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] text-slate-400 block truncate max-w-[120px]">{currentUser.email}</span>
                    {firebaseUser && (
                      <span className="text-[9px] text-emerald-400 font-bold flex items-center space-x-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Google</span>
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-76 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
                  {/* Google Authenticated Status Banner */}
                  {firebaseUser ? (
                    <div className="px-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl mb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Google Authenticated</span>
                        </span>
                        <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                          {currentUser.role}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white mt-1 truncate">
                        {firebaseUser.displayName || currentUser.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {firebaseUser.email}
                      </p>
                    </div>
                  ) : (
                    <div className="px-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        Not Signed in with Google
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Sign in to sync your consultant profile and verify changes.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          if (onSignInGoogle) onSignInGoogle();
                        }}
                        className="w-full mt-2 flex items-center justify-center space-x-2 bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Sign in with Google</span>
                      </button>
                    </div>
                  )}

                  <div className="px-3 py-1.5 border-b border-slate-800 mb-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Switch Team Persona</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Preview permissions & role-based views</p>
                  </div>

                  <div className="space-y-1 max-h-56 overflow-y-auto">
                    {teamMembers.map((member) => {
                      const isSelected = member.id === currentUser.id;
                      const memberIsAdmin = member.role === 'Admin';
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => {
                            onSelectUser(member);
                            setUserDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-all text-left ${
                            isSelected
                              ? 'bg-slate-800 border border-sky-500/40 text-white'
                              : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${member.avatarColor} flex items-center justify-center text-center leading-none select-none font-bold text-white text-[16px] pt-0.5 shadow-sm shrink-0`}>
                              {member.initials}
                            </div>
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="text-xs font-semibold text-white">{member.name}</span>
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                                  memberIsAdmin ? 'bg-amber-400/20 text-amber-300' : 'bg-sky-400/20 text-sky-300'
                                }`}>
                                  {member.role}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400">{member.title}</p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-sky-400" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Dropdown Logout button if user is authenticated with Google */}
                  {firebaseUser && (
                    <div className="mt-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          if (onSignOutGoogle) onSignOutGoogle();
                        }}
                        className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-200 border border-rose-800/50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Logout ({firebaseUser.email?.split('@')[0]})</span>
                      </button>
                    </div>
                  )}

                  <div className="mt-2 pt-2 border-t border-slate-800 px-3 py-1.5 bg-slate-950/50 rounded-xl">
                    <p className="text-[10px] text-slate-400 leading-tight">
                      <strong className="text-slate-300">Admin:</strong> Client lifecycle & summary edits.<br />
                      <strong className="text-slate-300">User:</strong> Task creation, statuses, deliverables, & notes.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
