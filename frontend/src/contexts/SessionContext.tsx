import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, TaxiCompany } from '../types';
import { ApiService } from '../services/apiService';

interface SessionContextType {
  role: UserRole | null;
  companyId: string | null;
  company: TaxiCompany | null;
  companies: TaxiCompany[];
  loadingCompanies: boolean;
  setTravelerRole: () => void;
  setSupplierRole: (companyId: string) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ROLE: 'ato_session_role',
  COMPANY_ID: 'ato_session_company_id',
};

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(STORAGE_KEYS.ROLE);
      if (saved === 'TRAVELER' || saved === 'SUPPLIER') return saved;
    }
    return null;
  });

  const [companyId, setCompanyIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(STORAGE_KEYS.COMPANY_ID);
    }
    return null;
  });

  const [companies, setCompanies] = useState<TaxiCompany[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  useEffect(() => {
    let isMounted = true;
    ApiService.getCatalogBootstrap()
      .then((res) => {
        if (isMounted && res.data?.companies) {
          setCompanies(res.data.companies);
        }
      })
      .catch(() => {
        // Silently handled; downstream views provide dedicated retry/error banners
      })
      .finally(() => {
        if (isMounted) setLoadingCompanies(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const company = companyId ? companies.find((c) => c.company_id === companyId) || null : null;

  const setTravelerRole = () => {
    setRoleState('TRAVELER');
    setCompanyIdState(null);
    sessionStorage.setItem(STORAGE_KEYS.ROLE, 'TRAVELER');
    sessionStorage.removeItem(STORAGE_KEYS.COMPANY_ID);
  };

  const setSupplierRole = (id: string) => {
    setRoleState('SUPPLIER');
    setCompanyIdState(id);
    sessionStorage.setItem(STORAGE_KEYS.ROLE, 'SUPPLIER');
    sessionStorage.setItem(STORAGE_KEYS.COMPANY_ID, id);
  };

  const clearSession = () => {
    setRoleState(null);
    setCompanyIdState(null);
    sessionStorage.removeItem(STORAGE_KEYS.ROLE);
    sessionStorage.removeItem(STORAGE_KEYS.COMPANY_ID);
  };

  return (
    <SessionContext.Provider
      value={{
        role,
        companyId,
        company,
        companies,
        loadingCompanies,
        setTravelerRole,
        setSupplierRole,
        clearSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export function useSession(): SessionContextType {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return ctx;
}
