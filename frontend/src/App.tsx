import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider } from './contexts/SessionContext';
import { NavBar } from './components/common/NavBar';
import { Footer } from './components/common/Footer';

// Pages
import { RolePicker } from './pages/RolePicker';
import { RequestForm } from './pages/RequestForm';
import { OffersList } from './pages/OffersList';
import { BookingSummary } from './pages/BookingSummary';
import { ChangeRequest } from './pages/ChangeRequest';
import { SupplierDashboard } from './pages/SupplierDashboard';
import { AssignCar } from './pages/AssignCar';
import { ChangeResponse } from './pages/ChangeResponse';

export const App: React.FC = () => {
  return (
    <SessionProvider>
      <BrowserRouter>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <NavBar />
          <main style={{ flex: 1 }}>
            <Routes>
              {/* Entry & Role Picker */}
              <Route path="/" element={<RolePicker />} />

              {/* Traveler Flow */}
              <Route path="/traveler/request" element={<RequestForm />} />
              <Route path="/traveler/offers/:requestId" element={<OffersList />} />
              <Route path="/traveler/booking/:bookingNumber?" element={<BookingSummary />} />
              <Route path="/traveler/change-request/:bookingNumber" element={<ChangeRequest />} />

              {/* Supplier Flow */}
              <Route path="/supplier/dashboard" element={<SupplierDashboard />} />
              <Route path="/supplier/request/:requestId/assign" element={<AssignCar />} />
              <Route path="/supplier/change-request/:changeId" element={<ChangeResponse />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </SessionProvider>
  );
};

