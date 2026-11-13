import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import { TopBar } from './components/TopBar';
import { TravelerWorkspace } from './components/TravelerWorkspace';
import { SupplierWorkspace } from './components/SupplierWorkspace';

export default function App() {
  const [catalog, setCatalog] = useState(null);
  const [bootError, setBootError] = useState(null);
  const [activeRole, setActiveRole] = useState('TRAVELER');
  const [selectedCompanyId, setSelectedCompanyId] = useState('TX-JP-01');
  const [resetCounter, setResetCounter] = useState(0);

  useEffect(() => {
    api
      .getBootstrap()
      .then((data) => {
        setCatalog(data);
        if (data.companies?.length > 0) {
          setSelectedCompanyId(data.companies[0].company_id);
        }
      })
      .catch((err) => setBootError(err.message));
  }, []);

  const handleResetDemo = async () => {
    await api.resetDemo();
    setResetCounter((c) => c + 1);
  };

  const handleJumpToSupplier = (companyId) => {
    setSelectedCompanyId(companyId);
    setActiveRole('SUPPLIER');
  };

  if (bootError) {
    return (
      <div className="mx-auto max-w-xl p-10 font-mono-tabular text-sm text-[#7F1D1D]">
        Failed to connect to backend at http://localhost:4000/api/v1: {bootError}
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="p-10 text-center font-mono-tabular text-xs text-[#5E5D59]">
        Loading Airport Taxi Offers Exchange...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F6] text-[#161615]">
      <TopBar
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        selectedCompanyId={selectedCompanyId}
        setSelectedCompanyId={setSelectedCompanyId}
        companies={catalog.companies}
        onResetDemo={handleResetDemo}
      />

      {activeRole === 'TRAVELER' ? (
        <TravelerWorkspace
          key={`traveler-${resetCounter}`}
          catalog={catalog}
          onJumpToSupplier={handleJumpToSupplier}
        />
      ) : (
        <SupplierWorkspace
          key={`supplier-${selectedCompanyId}-${resetCounter}`}
          companyId={selectedCompanyId}
        />
      )}
    </div>
  );
}

