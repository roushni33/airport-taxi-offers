const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

/**
 * Custom Error class that preserves backend Rule Violation metadata (R1-R9).
 */
export class ApiClientError extends Error {
  constructor(message, code, ruleViolated = null, details = null, status = 400) {
    super(message);
    this.code = code;
    this.ruleViolated = ruleViolated;
    this.details = details;
    this.status = status;
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok || !payload?.success) {
    throw new ApiClientError(
      payload?.message || `HTTP Error ${res.status}`,
      payload?.code || 'API_ERROR',
      payload?.error?.ruleViolated || null,
      payload?.error?.details || null,
      res.status
    );
  }

  return payload.data;
}

export const api = {
  // 1. Bootstrap Catalog
  getBootstrap: () => request('/catalog/bootstrap'),

  // 2. Route Price & Pickup Preview (Flow 1, R1/R2/R3)
  getRoutePreview: (flightId, hotelId) =>
    request(`/catalog/route-preview?flight_id=${encodeURIComponent(flightId)}&hotel_id=${encodeURIComponent(hotelId)}`),

  // 3. Create Ride Request (Flow 1, M1/M2/G2)
  createRequest: (body) =>
    request('/requests', { method: 'POST', body: JSON.stringify(body) }),

  // 4. List All Requests
  listRequests: () => request('/requests'),

  // 5. Get Single Request & Offers with Sort/Filter (Flow 1, M4/G5)
  getRequestById: (requestId, { sort = '', car_type = '' } = {}) => {
    const params = new URLSearchParams();
    if (sort) params.set('sort', sort);
    if (car_type) params.set('car_type', car_type);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request(`/requests/${encodeURIComponent(requestId)}${qs}`);
  },

  // 6. Supplier Dashboard (Flow 2, M2/R4/S2)
  getSupplierDashboard: (companyId) =>
    request(`/suppliers/${encodeURIComponent(companyId)}/dashboard`),

  // 7. Supplier Assigns a Car & Price (Flow 2, M3/R7/G1/G4)
  assignCarOffer: (companyId, body) =>
    request(`/suppliers/${encodeURIComponent(companyId)}/offers`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // 8. Traveler Books an Offer (Flow 1, M4/M6/R8)
  bookOffer: (offerId) =>
    request(`/offers/${encodeURIComponent(offerId)}/book`, { method: 'POST' }),

  // 9. Traveler Rejects an Offer (Flow 1, M4/R8)
  rejectOffer: (offerId) =>
    request(`/offers/${encodeURIComponent(offerId)}/reject`, { method: 'POST' }),

  // 10. Lookup 10-Digit Booking Summary (Flow 1, M5)
  getBookingSummary: (bookingNumber) =>
    request(`/bookings/${encodeURIComponent(bookingNumber)}`),

  // 11. Traveler Sends Flight/Pickup Change Request (Flow 1, M7/R9)
  createChangeRequest: (bookingNumber, body) =>
    request(`/bookings/${encodeURIComponent(bookingNumber)}/change-request`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // 12. Supplier Accepts or Rejects Change Request (Flow 2, M7/R9)
  respondChangeRequest: (changeId, action) =>
    request(`/change-requests/${encodeURIComponent(changeId)}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),

  // 13. Stretch S1: Shared Rides
  getShareableMatches: (requestId) =>
    request(`/requests/${encodeURIComponent(requestId)}/shareable`),

  mergeSharedRequests: (request_id_1, request_id_2) =>
    request('/requests/share', {
      method: 'POST',
      body: JSON.stringify({ request_id_1, request_id_2 }),
    }),

  // 14. Admin Demo Reset
  resetDemo: () => request('/admin/reset-demo', { method: 'POST' }),
};

