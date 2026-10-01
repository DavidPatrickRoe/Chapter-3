import React from 'react';
import { 
  Building2, 
  LogIn, 
  ShieldCheck, 
  AlertCircle, 
  Lock, 
  CheckCircle2, 
  Users, 
  Sparkles,
  ArrowRight,
  X
} from 'lucide-react';
import { TEAM_MEMBERS } from '../data/initialData';

interface LoginScreenProps {
  onSignIn: () => void;
  isSigningIn: boolean;
  authError: string | null;
  onClearError: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onSignIn,
  isSigningIn,
  authError,
  onClearError
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between font-sans selection:bg-sky-500 selection:text-white relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[30rem] h-[30rem] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Simple Brand Header */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 font-bold text-white text-base">
            C3
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight text-white font-serif">Chapter 3</span>
              <span className="text-[10px] uppercase font-bold tracking-widest bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full border border-sky-400/30">
                Consulting OS
              </span>
            </div>
            <p className="text-xs text-slate-400">Sales & Marketing Growth Advisory</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Tenant Domain: <strong className="text-slate-200">@chapter3.ca</strong></span>
        </div>
      </header>

      {/* Main Login Card Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-10">
        <div className="max-w-md w-full">
          
          {/* Main Card */}
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-slate-950/80">
            
            {/* Header / Lock Icon */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 p-0.5 shadow-lg shadow-sky-500/30">
                <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                  <Lock className="w-6 h-6 text-sky-400" />
                </div>
              </div>

              <h1 className="text-2xl font-extrabold text-white font-serif tracking-tight">
                Workspace Single Sign-On
              </h1>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Welcome to Chapter 3 Consulting OS. Please authenticate with your Google tenant account to enter your workspace.
              </p>
            </div>

            {/* Error Notification Banner */}
            {authError && (
              <div className="mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-200 p-3.5 rounded-2xl text-xs flex items-start space-x-3">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-rose-300">Sign-In Failed</p>
                  <p className="mt-0.5 text-rose-200/90 leading-relaxed">{authError}</p>
                </div>
                <button
                  type="button"
                  onClick={onClearError}
                  className="text-rose-400 hover:text-rose-200 cursor-pointer p-0.5"
                  title="Dismiss error"
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
                className="w-full group flex items-center justify-center space-x-3 bg-white hover:bg-slate-100 text-slate-950 py-3.5 px-5 rounded-2xl font-bold text-sm shadow-xl shadow-white/5 transition-all duration-150 cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSigningIn ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    <span>Authenticating with Google...</span>
                  </>
                ) : (
                  <>
                    {/* Official Google 'G' icon */}
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

              {/* Policy & Security Note */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-2 text-xs text-slate-400">
                <div className="flex items-center space-x-2 text-slate-300 font-bold">
                  <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Strict Identity Tagging Policy</span>
                </div>
                <p className="leading-relaxed text-[11px] text-slate-400">
                  Only accounts from the <strong className="text-sky-300">@chapter3.ca</strong> Google tenant are permitted to sign in. Once signed in, you are permanently tagged to your consultant persona. Persona switching is disabled for all users and administrators.
                </p>
              </div>
            </div>

            {/* Authorized Team Directory Preview */}
            <div className="mt-6 pt-5 border-t border-slate-800/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
                <span>Authorized Chapter 3 Consultants</span>
                <Users className="w-3.5 h-3.5 text-slate-400" />
              </p>
              <div className="space-y-1.5">
                {TEAM_MEMBERS.map((member) => (
                  <div 
                    key={member.id}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-950/40 border border-slate-800/40 text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${member.avatarColor} text-white font-bold text-[10px] flex items-center justify-center text-center select-none shrink-0`}>
                        {member.initials}
                      </div>
                      <span className="text-slate-300 font-medium text-xs">{member.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{member.email}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Bottom Security Assurance */}
          <div className="mt-4 text-center">
            <p className="text-[11px] text-slate-400 flex items-center justify-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Encrypted Firestore Live Sync & ABAC Security Enforced</span>
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-6 py-4 border-t border-slate-900 text-center text-xs text-slate-400">
        Chapter 3 Consulting Ltd. © {new Date().getFullYear()} — Client Operations & Sales Growth Advisory OS
      </footer>
    </div>
  );
};
