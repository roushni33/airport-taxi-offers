import React from 'react';
import { RotateCcw, User, Building2 } from 'lucide-react';

export function TopBar({
  activeRole,        // 'TRAVELER' | 'SUPPLIER'
  setActiveRole,
  selectedCompanyId, // e.g. 'TX-JP-01'
  setSelectedCompanyId,
  companies = [],
  onResetDemo,
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#E8E6DF] bg-[#F8F8F6]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6 py-3.5">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Airport Taxi - Ride Offers"
            className="h-10 w-auto object-contain select-none"
          />
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-[#161615]">
              Airport Taxi  - Ride Offers
            </h1>
            <p className="text-[11px] text-[#787670]">
              Rule-Verified Ground Transport Exchange · INR (₹) · Local Airport Time
            </p>
          </div>
        </div>

        {/* Persona Switcher & Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-xl border border-[#DDD9CE] bg-[#ECEAE3] p-1 gap-1">
            <button
              type="button"
              onClick={() => setActiveRole('TRAVELER')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition ${
                activeRole === 'TRAVELER'
                  ? 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-[#161615] font-semibold'
                  : 'text-[#686660] hover:text-[#161615]'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Flow 1: Traveler
            </button>

            <button
              type="button"
              onClick={() => setActiveRole('SUPPLIER')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition ${
                activeRole === 'SUPPLIER'
                  ? 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-[#161615] font-semibold'
                  : 'text-[#686660] hover:text-[#161615]'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              Flow 2: Taxi Supplier
            </button>
          </div>

          {/* Supplier Company Selector */}
          {activeRole === 'SUPPLIER' && (
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="border border-[#DDD9CE] bg-white px-3 py-1.5 font-mono-tabular text-xs font-medium text-[#161615] rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus:border-[#161615] focus:outline-none"
            >
              {companies.map((c) => (
                <option key={c.company_id} value={c.company_id}>
                  [{c.company_id}] {c.name} ({c.airports.join(', ')}) ★{c.rating}
                </option>
              ))}
            </select>
          )}

          {/* 1-Click Reset Demo Button */}
          <button
            type="button"
            onClick={onResetDemo}
            title="Reset SQLite state back to initial 3 open requests"
            className="flex items-center gap-1.5 border border-[#DDD9CE] bg-white px-3 py-1.5 text-xs font-medium text-[#686660] hover:border-[#161615] hover:text-[#161615] rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition active:scale-[0.98]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Demo DB
          </button>
        </div>
      </div>
    </header>
  );
}
