import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export function RuleAlertBanner({ error, successMessage, onClear }) {
  if (!error && !successMessage) return null;

  if (successMessage) {
    return (
      <div className="mb-5 flex items-center justify-between border border-[#D0E2D4] bg-[#F0F5F1] px-4 py-3 text-xs text-[#1E3F24] rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1E3F24]" />
          <span className="font-medium leading-relaxed">{successMessage}</span>
        </div>
        {onClear && (
          <button onClick={onClear} className="text-[#1E3F24] hover:opacity-60 transition p-1">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mb-5 border border-[#F0D0D0] bg-[#FAF2F2] p-4 text-[#7A1D1D] rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#7A1D1D]" />
          <div>
            <div className="flex items-center gap-2">
              {error.ruleViolated && (
                <span className="inline-block border border-[#7A1D1D] bg-[#7A1D1D] px-2 py-0.5 font-mono-tabular text-[10px] font-semibold text-white rounded-md tracking-wider">
                  RULE {error.ruleViolated} VIOLATION
                </span>
              )}
              <span className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#8C3A3A]">
                {error.code}
              </span>
            </div>
            <p className="mt-1 text-xs font-medium leading-relaxed text-[#7A1D1D]">{error.message}</p>
            {error.details && (
              <div className="mt-2.5 border-t border-[#F0D0D0] pt-2 font-mono-tabular text-[11px] text-[#7A1D1D]/90">
                {Object.entries(error.details).map(([k, v]) => (
                  <span key={k} className="mr-4 inline-block">
                    <strong className="font-semibold text-[#7A1D1D]">{k}:</strong>{' '}
                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {onClear && (
          <button onClick={onClear} className="text-[#7A1D1D] hover:opacity-60 transition p-1">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
