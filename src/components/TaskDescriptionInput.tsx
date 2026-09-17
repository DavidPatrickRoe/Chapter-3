import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, RotateCcw, X, Loader2, Check } from 'lucide-react';

interface TaskDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  label?: string;
  labelClassName?: string;
  id?: string;
}

export const TaskDescriptionInput: React.FC<TaskDescriptionInputProps> = ({
  value,
  onChange,
  placeholder = 'e.g. Conduct ICP buyer persona validation interviews',
  required = true,
  autoFocus = false,
  label = 'Task Description *',
  labelClassName = 'text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1',
  id = 'task-description-input'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [previousDraft, setPreviousDraft] = useState<string | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const hasDraftText = Boolean(value && value.trim().length > 0);
  const charCount = value.length;

  const handleRewrite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!hasDraftText || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    const draftBeforeRewrite = value;

    try {
      const response = await fetch('/api/gemini/rewrite-action-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: draftBeforeRewrite })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.rewrittenText) {
        let cleanText = String(data.rewrittenText).trim();
        // Strict constraint: strictly 300 characters or fewer
        if (cleanText.length > 300) {
          cleanText = cleanText.slice(0, 300).trimEnd();
        }

        setPreviousDraft(draftBeforeRewrite);
        onChange(cleanText);
        setShowUndoToast(true);

        // Auto-dismiss undo notification after 14 seconds
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => {
          setShowUndoToast(false);
        }, 14000);

        // Refocus the input
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      } else {
        throw new Error(data.error || 'Failed to rewrite description');
      }
    } catch (err: any) {
      console.error('Error during Gemini rewrite:', err);
      setErrorMessage(err.message || 'Unable to connect to Gemini rewrite service');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (previousDraft !== null) {
      onChange(previousDraft);
      setPreviousDraft(null);
      setShowUndoToast(false);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleDismissUndo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowUndoToast(false);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  };

  return (
    <div className="space-y-1.5">
      {/* Label and Character / Gemini Status Header */}
      <div className="flex items-center justify-between">
        <label htmlFor={id} className={labelClassName}>
          {label}
        </label>
        <div className="flex items-center space-x-2 text-[11px]">
          {charCount > 0 && (
            <span
              className={`font-mono transition-colors ${
                charCount > 280
                  ? 'text-rose-600 font-bold'
                  : charCount > 240
                  ? 'text-amber-600 font-medium'
                  : 'text-slate-400'
              }`}
            >
              {charCount}/300
            </span>
          )}
        </div>
      </div>

      {/* Input Container with Embedded Gemini Button and Loading FX */}
      <div className="relative group">
        <input
          ref={inputRef}
          id={id}
          type="text"
          required={required}
          autoFocus={autoFocus}
          maxLength={300}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            // If user types manually after rewrite, clear undo toast
            if (showUndoToast && previousDraft && e.target.value !== previousDraft) {
              // keep previousDraft for undo but dismiss toast after changes
            }
          }}
          disabled={isLoading}
          className={`w-full bg-slate-50 border rounded-xl py-2 pl-3 pr-24 text-xs text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white ${
            isLoading
              ? 'border-sky-400 bg-sky-50/40 opacity-90'
              : errorMessage
              ? 'border-rose-400'
              : 'border-slate-300'
          }`}
        />

        {/* Transient Loading Shimmer Bar */}
        {isLoading && (
          <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden rounded-b-xl">
            <div className="w-full h-full bg-gradient-to-r from-sky-400 via-teal-400 to-indigo-500 animate-pulse"></div>
          </div>
        )}

        {/* Embedded Gemini Rewrite Button */}
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
          <button
            type="button"
            id={`${id}-gemini-btn`}
            onClick={handleRewrite}
            disabled={!hasDraftText || isLoading}
            title={
              !hasDraftText
                ? 'Enter a draft description to rewrite with Gemini'
                : isLoading
                ? 'Rewriting into action item with Gemini...'
                : 'Rewrite as Action Item with Gemini (max 300 chars)'
            }
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all select-none cursor-pointer ${
              isLoading
                ? 'bg-sky-100 text-sky-700 cursor-wait'
                : hasDraftText
                ? 'bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white shadow-xs hover:shadow-sm active:scale-97'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-sky-600" />
                <span className="hidden sm:inline text-[10px]">Refining...</span>
              </>
            ) : (
              <>
                <Sparkles className={`w-3 h-3 ${hasDraftText ? 'text-teal-200' : 'text-slate-400'}`} />
                <span>Rewrite</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Undo Banner / Toast */}
      {showUndoToast && previousDraft && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-sky-50 to-teal-50 border border-sky-200/80 rounded-xl text-xs text-sky-900 shadow-2xs animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center space-x-1.5 min-w-0">
            <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span className="text-[11px] font-medium text-slate-700 truncate">
              Rewritten into action item by Gemini
            </span>
          </div>
          <div className="flex items-center space-x-2 shrink-0 ml-2">
            <button
              type="button"
              onClick={handleUndo}
              className="flex items-center space-x-1 text-[11px] font-bold text-sky-700 hover:text-sky-900 bg-white hover:bg-sky-100/60 px-2 py-0.5 rounded-md border border-sky-300/80 transition-colors shadow-2xs cursor-pointer"
              title="Revert to your original draft text"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={handleDismissUndo}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Error Message if Network/Server Issue */}
      {errorMessage && (
        <p className="text-[11px] text-rose-600 font-medium animate-in fade-in duration-150">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
