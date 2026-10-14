import React from 'react';
import { 
  LogIn, 
  ShieldCheck, 
  AlertCircle, 
  Lock, 
  CheckCircle2, 
  Users, 
  ArrowRight,
  X
} from 'lucide-react';
import { TEAM_MEMBERS } from '../data/initialData';

import { TeamMember } from '../types';

interface LoginScreenProps {
  onSignIn: () => void;
  onSelectConsultant?: (member: TeamMember) => void;
  isSigningIn: boolean;
  authError: string | null;
  onClearError: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onSignIn,
  onSelectConsultant,
  isSigningIn,
  authError,
  onClearError
}) => {
  return (
    <div className="min-h-screen bg-[#141312] text-stone-100 flex flex-col justify-between font-sans selection:bg-stone-100 selection:text-stone-900 relative overflow-hidden">
      
      {/* Top Header */}
      <header className="relative z-10 max-w-6xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-baseline space-x-2.5">
          <span className="font-serif text-2xl font-normal tracking-tight text-stone-100">
            Chapter 3
          </span>
          <span className="text-[11px] font-mono tracking-widest text-stone-500 uppercase border-l border-stone-800 pl-2.5">
            Advisory
          </span>
        </div>

        <div className="flex items-center space-x-2 text-[11px] font-mono text-stone-400 bg-stone-900/80 px-3 py-1.5 rounded-xl border border-stone-800">
          <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
          <span>Tenant: <strong className="text-stone-200">@chapter3.ca</strong></span>
        </div>
      </header>

      {/* Main Login Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="max-w-md w-full">
          
          {/* Card */}
          <div className="bg-[#1C1A18] border border-stone-800/90 rounded-3xl p-8 sm:p-9 shadow-2xl shadow-black/60">
            
            {/* Seal & Heading */}
            <div className="text-center mb-8">
              <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center font-serif text-2xl text-stone-200">
                3
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl font-normal text-stone-100 tracking-tight">
                Client Operations Portal
              </h1>
              <p className="text-xs text-stone-400 mt-2 leading-relaxed">
                Sign in with your verified Chapter 3 Google Workspace account to access active consulting engagements.
              </p>
            </div>

            {/* Error Notification Banner */}
            {authError && (
              <div className="mb-6 bg-rose-950/40 border border-rose-900/60 text-rose-200 p-3.5 rounded-xl text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-rose-300">Access Restricted</p>
                  <p className="mt-0.5 text-rose-200/80 text-[11px] leading-relaxed">{authError}</p>
                </div>
                <button
                  type="button"
                  onClick={onClearError}
                  className="text-rose-400 hover:text-rose-200 cursor-pointer p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Google Sign In Button */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={onSignIn}
                disabled={isSigningIn}
                className="w-full flex items-center justify-center space-x-3 bg-stone-100 hover:bg-white text-stone-950 py-3.5 px-5 rounded-xl font-medium text-xs shadow-lg transition-all duration-150 cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSigningIn ? (
                  <>
                    <span className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Google account...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign in with Google Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-500" />
                  </>
                )}
              </button>

              {/* Policy note */}
              <div className="p-3.5 bg-stone-900/60 rounded-xl border border-stone-800/80 text-[11px] text-stone-400 space-y-1">
                <div className="flex items-center space-x-1.5 text-stone-300 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
                  <span>Tenant Binding</span>
                </div>
                <p className="leading-relaxed">
                  Only accounts from <strong className="text-stone-200">@chapter3.ca</strong> are authorized. Sessions are permanently tagged to your consultant persona.
                </p>
              </div>
            </div>

            {/* Team Directory preview & instant tenant access */}
            <div className="mt-6 pt-5 border-t border-stone-800/80">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500">
                  Chapter 3 Practice Directory
                </span>
                <span className="text-[10px] font-mono text-stone-500">
                  Select Consultant to Enter
                </span>
              </div>
              <div className="space-y-1.5">
                {TEAM_MEMBERS.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => onSelectConsultant && onSelectConsultant(member)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs bg-stone-900/40 hover:bg-stone-800/80 border border-stone-800/60 hover:border-stone-700 transition-all text-left cursor-pointer group"
                    title={`Enter platform as ${member.name} (${member.role})`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-stone-800 text-stone-300 font-mono text-[9px] flex items-center justify-center font-medium group-hover:bg-stone-700 transition-colors shrink-0">
                        {member.initials}
                      </div>
                      <div className="truncate">
                        <span className="text-stone-300 text-xs font-medium block truncate group-hover:text-stone-100">
                          {member.name}
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono block">
                          {member.email}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                      <span className="text-[10px] text-stone-400 font-mono bg-stone-800/80 px-2 py-0.5 rounded-md">
                        {member.role}
                      </span>
                      <ArrowRight className="w-3 h-3 text-stone-600 group-hover:text-stone-300 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Bottom Security Note */}
          <div className="mt-4 text-center">
            <p className="text-[11px] text-stone-500 font-mono flex items-center justify-center space-x-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>Encrypted Firestore Live Synchronization</span>
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl w-full mx-auto px-6 py-4 text-center text-[11px] font-mono text-stone-600 border-t border-stone-900">
        Chapter 3 Consulting Ltd. © {new Date().getFullYear()} · Halifax, Nova Scotia · chapter3.ca
      </footer>
    </div>
  );
};
