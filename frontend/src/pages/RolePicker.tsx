import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { User, Briefcase, Star, ArrowRight } from 'lucide-react';

export const RolePicker: React.FC = () => {
  const navigate = useNavigate();
  const { role, companyId, companies, loadingCompanies, setTravelerRole, setSupplierRole } = useSession();

  const [selectedRole, setSelectedRole] = useState<'TRAVELER' | 'SUPPLIER' | null>(role || 'TRAVELER');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companyId || '');

  useEffect(() => {
    if (!selectedCompanyId && companies.length > 0) {
      setSelectedCompanyId(companies[0].company_id);
    }
  }, [companies, selectedCompanyId]);

  const handleConfirm = () => {
    if (selectedRole === 'TRAVELER') {
      setTravelerRole();
      navigate('/traveler/request');
    } else if (selectedRole === 'SUPPLIER') {
      setSupplierRole(selectedCompanyId);
      navigate('/supplier/dashboard');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '720px', paddingTop: 'var(--space-10)' }}>
      {/* Page Header */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
        <h1 style={{ marginBottom: 'var(--space-2)' }}>
          Airport Taxi Platform
        </h1>
        <p style={{ maxWidth: '520px', margin: '0 auto' }}>
          Upfront route price ranges, verified fleet availability, and deterministic business rules. Select a role to continue.
        </p>
      </div>

      {/* Role Selection Cards */}
      <div
        role="radiogroup"
        aria-label="Select User Role"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {/* Traveler Option */}
        <div
          role="radio"
          aria-checked={selectedRole === 'TRAVELER'}
          tabIndex={0}
          onClick={() => setSelectedRole('TRAVELER')}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              setSelectedRole('TRAVELER');
            }
          }}
          className="card card-hover"
          style={{
            cursor: 'pointer',
            borderColor: selectedRole === 'TRAVELER' ? 'var(--action)' : 'var(--border-subtle)',
            backgroundColor: selectedRole === 'TRAVELER' ? 'var(--surface-2)' : 'var(--surface-1)',
            padding: 'var(--space-5)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <div style={{ color: 'var(--action)' }}>
                <User size={20} />
              </div>
              <input
                type="radio"
                name="user_role"
                checked={selectedRole === 'TRAVELER'}
                onChange={() => setSelectedRole('TRAVELER')}
                tabIndex={-1}
                style={{ width: '16px', height: '16px', accentColor: 'var(--action)', margin: 0, minHeight: 'auto' }}
              />
            </div>
            <h2 style={{ fontSize: '1.125rem', marginBottom: 'var(--space-1)' }}>Traveler</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Request an airport ride with passenger counts, child ages, luggage requirements, and a budget proposal.
            </p>
          </div>

          <div style={{ marginTop: 'var(--space-4)', fontSize: '0.8125rem', color: 'var(--action)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Create ride request</span>
            <ArrowRight size={13} />
          </div>
        </div>

        {/* Supplier Option */}
        <div
          role="radio"
          aria-checked={selectedRole === 'SUPPLIER'}
          tabIndex={0}
          onClick={() => setSelectedRole('SUPPLIER')}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              setSelectedRole('SUPPLIER');
            }
          }}
          className="card card-hover"
          style={{
            cursor: 'pointer',
            borderColor: selectedRole === 'SUPPLIER' ? 'var(--action)' : 'var(--border-subtle)',
            backgroundColor: selectedRole === 'SUPPLIER' ? 'var(--surface-2)' : 'var(--surface-1)',
            padding: 'var(--space-5)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <div style={{ color: 'var(--action)' }}>
                <Briefcase size={20} />
              </div>
              <input
                type="radio"
                name="user_role"
                checked={selectedRole === 'SUPPLIER'}
                onChange={() => setSelectedRole('SUPPLIER')}
                tabIndex={-1}
                style={{ width: '16px', height: '16px', accentColor: 'var(--action)', margin: 0, minHeight: 'auto' }}
              />
            </div>
            <h2 style={{ fontSize: '1.125rem', marginBottom: 'var(--space-1)' }}>Taxi Supplier</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Review servable open requests, assign eligible fleet vehicles, quote offer prices, and manage bookings.
            </p>
          </div>

          <div style={{ marginTop: 'var(--space-4)', fontSize: '0.8125rem', color: 'var(--action)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Access fleet dashboard</span>
            <ArrowRight size={13} />
          </div>
        </div>
      </div>

      {/* Supplier Company Selection */}
      {selectedRole === 'SUPPLIER' && (
        <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)' }}>
          <h3 style={{ fontSize: '0.9375rem', marginBottom: 'var(--space-3)' }}>
            Select Taxi Fleet
          </h3>
          {loadingCompanies ? (
            <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading registered taxi companies...
            </div>
          ) : companies.length === 0 ? (
            <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No companies available. Please ensure the backend is running.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {companies.map((company) => {
                const isSelected = selectedCompanyId === company.company_id;
                return (
                  <div
                    key={company.company_id}
                    onClick={() => setSelectedCompanyId(company.company_id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--action)' : 'var(--border-subtle)',
                      backgroundColor: isSelected ? 'var(--surface-2)' : 'var(--surface-field)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <input
                        type="radio"
                        name="supplier_company"
                        checked={isSelected}
                        onChange={() => setSelectedCompanyId(company.company_id)}
                        style={{ width: '15px', height: '15px', accentColor: 'var(--action)', margin: 0, minHeight: 'auto' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {company.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '1px' }}>
                          Airports: {company.airports.join(', ')} · Fleet: {company.vehicles?.length || 0} cars · Hours: {company.service_from}–{company.service_until}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                      <Star size={12} fill="var(--warning)" color="var(--warning)" />
                      <span className="tabular-nums">{(company.rating ?? 0).toFixed(1)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Primary Action Button */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          className="btn-primary"
          onClick={handleConfirm}
          disabled={!selectedRole}
          style={{ minWidth: '200px' }}
        >
          <span>Continue as {selectedRole === 'TRAVELER' ? 'Traveler' : 'Supplier'}</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
