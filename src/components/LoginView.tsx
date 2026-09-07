import React, { useState } from 'react';
import {
  ShieldCheck,
  Headphones,
  Sparkles,
  Radio,
  BookmarkCheck,
  ArrowRight,
  AlertCircle,
  Loader2,
  Lock,
} from 'lucide-react';

interface LoginViewProps {
  onSignIn: () => Promise<void>;
  authError: string | null;
  authLoading: boolean;
  onClearError?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onSignIn,
  authError,
  authLoading,
  onClearError,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignInClick = async () => {
    setIsSubmitting(true);
    if (onClearError) onClearError();
    try {
      await onSignIn();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = authLoading || isSubmitting;

  return (
    <div
      id="login-view"
      className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-10 px-4 sm:px-6"
    >
      <div className="w-full max-w-xl">
        {/* Main Authentication Card */}
        <div
          id="card-login-auth"
          className="bg-white rounded-2xl border border-[#E8EAED] p-6 sm:p-10 shadow-sm transition-all"
        >
          {/* Header Brand & Icon */}
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center mb-4 shadow-xs">
              <Radio className="w-7 h-7" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F1F3F4] text-[#3C4043] text-xs font-medium mb-3">
              <Lock className="w-3 h-3 text-[#5F6368]" />
              <span>Authentication Required</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-medium text-[#202124] tracking-tight">
              Sign in to Iris
            </h1>

            <p className="mt-2 text-sm text-[#5F6368] max-w-md leading-relaxed">
              Personalised, broadcast-ready audio news briefings tailored for your daily commute.
            </p>
          </div>

          {/* Access Protection Notice */}
          <div
            id="login-protection-notice"
            className="mt-6 p-4 rounded-xl bg-[#F8F9FA] border border-[#E8EAED] text-xs text-[#3C4043] flex items-start gap-3"
          >
            <ShieldCheck className="w-4 h-4 text-[#1A73E8] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-[#202124] block">Protected Access Mode</span>
              <p className="text-[#5F6368] leading-relaxed">
                To prevent unauthorized bot traffic and safeguard API synthesis capacity, access to Iris studio features is reserved for authenticated users.
              </p>
            </div>
          </div>

          {/* Auth Error Banner */}
          {authError && (
            <div
              id="login-auth-error"
              className="mt-4 p-3.5 rounded-xl bg-[#FDF2F2] border border-[#FAD2CF] text-xs text-[#C5221F] flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-[#D93025] shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Sign-in Notice</span>
                <p className="mt-0.5 leading-relaxed">{authError}</p>
              </div>
            </div>
          )}

          {/* Action: Google Sign In Button */}
          <div className="mt-8 space-y-3">
            <button
              id="btn-google-login"
              type="button"
              onClick={handleSignInClick}
              disabled={isBusy}
              className="w-full h-12 rounded-xl bg-white hover:bg-[#F8F9FA] active:bg-[#F1F3F4] text-[#202124] text-sm font-medium border border-[#DADCE0] hover:border-[#BDC1C6] flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBusy ? (
                <>
                  <Loader2 className="w-4 h-4 text-[#1A73E8] animate-spin" />
                  <span>Connecting to Google Account...</span>
                </>
              ) : (
                <>
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
                  <span className="font-medium text-[#3C4043]">Sign in with Google</span>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E8EAED]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-[#80868B] font-medium">
                Included with your account
              </span>
            </div>
          </div>

          {/* Unlocked Features Summary */}
          <div className="space-y-3.5 text-xs text-[#3C4043]">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <strong className="font-medium text-[#202124] block">
                  AI-Crafted Audio Scripts
                </strong>
                <span className="text-[#5F6368]">
                  Intelligently synthesise multiple articles into a coherent, seamless morning broadcast.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center shrink-0 mt-0.5">
                <Headphones className="w-3.5 h-3.5" />
              </div>
              <div>
                <strong className="font-medium text-[#202124] block">
                  Personalised Commute Player
                </strong>
                <span className="text-[#5F6368]">
                  Custom speech rate, playback voices, category filtering, and background commute streaming.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center shrink-0 mt-0.5">
                <BookmarkCheck className="w-3.5 h-3.5" />
              </div>
              <div>
                <strong className="font-medium text-[#202124] block">
                  Cloud Persistence & Queue
                </strong>
                <span className="text-[#5F6368]">
                  Save digests to your personal library and sync your Listen Later queue across sessions.
                </span>
              </div>
            </div>
          </div>

          {/* Security / Privacy Footer */}
          <p className="mt-8 text-[11px] text-[#80868B] text-center leading-relaxed">
            Authentication is powered securely by Google Identity Services and Firebase. No personal credentials or passwords are stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );
};
