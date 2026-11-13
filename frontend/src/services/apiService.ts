/**
 * Production HTTP API Service
 * 
 * Centralized, environment-configured HTTP client for the Airport Taxi Offers application.
 * Connects all frontend workflows directly to the backend Express/SQLite API.
 */
import {
  ApiResponse,
  CatalogBootstrapData,
  RoutePreviewData,
  RideRequest,
  TaxiOffer,
  BookingSummary,
  ChangeRequest,
  SupplierDashboardData,
  CarType,
} from '../types';

const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:4000/api/v1';

const DEFAULT_TIMEOUT_MS = 12000;

class ApiError extends Error {
  code: string;
  ruleViolated: string | null;
  details?: any;

  constructor(message: string, code = 'API_ERROR', ruleViolated: string | null = null, details: any = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.ruleViolated = ruleViolated;
    this.details = details;
  }
}

/**
 * Reusable HTTP fetch wrapper with timeout, JSON parsing, and unified error handling.
 */
async function httpRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    let json: any = null;

    if (contentType.includes('application/json')) {
      json = await response.json();
    } else {
      const text = await response.text();
      if (!response.ok) {
        throw new ApiError(
          `Server responded with HTTP ${response.status}: ${text.slice(0, 200)}`,
          `HTTP_${response.status}`
        );
      }
      return {
        success: true,
        code: 'OK',
        message: 'Success',
        data: text as unknown as T,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      };
    }

    if (!response.ok || json.success === false) {
      const ruleViolated = json?.error?.ruleViolated || null;
      const details = json?.error?.details || null;
      const code = json?.code || `HTTP_${response.status}`;
      const message = json?.message || `Request failed with status ${response.status}`;

      throw new ApiError(message, code, ruleViolated, details);
    }

    return json as ApiResponse<T>;
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err instanceof ApiError) {
      throw err;
    }

    if (err.name === 'AbortError') {
      throw new ApiError(
        'Request timed out. The backend server took too long to respond.',
        'TIMEOUT_ERROR'
      );
    }

    // Network / connectivity error (e.g. backend down or CORS failure)
    throw new ApiError(
      'Cannot connect to the Airport Taxi Offers backend. Please ensure the backend server is running on http://localhost:4000.',
      'NETWORK_ERROR'
    );
  }
}

export const ApiService = {
  getBaseUrl(): string {
    return API_BASE_URL;
  },

  // 1. Catalog Bootstrap
  getCatalogBootstrap(): Promise<ApiResponse<CatalogBootstrapData>> {
    return httpRequest<CatalogBootstrapData>('/catalog/bootstrap');
  },

  // 2. Route Preview
  getRoutePreview(flightId: string, hotelId: string): Promise<ApiResponse<RoutePreviewData>> {
    const params = new URLSearchParams({
      flight_id: flightId,
      hotel_id: hotelId,
    });
    return httpRequest<RoutePreviewData>(`/catalog/route-preview?${params.toString()}`);
  },

  // 3. Create Ride Request
  createRequest(body: {
    traveler_name: string;
    flight_id: string;
    hotel_id: string;
    adults: number;
    child_ages?: number[];
    large_bags?: number;
    small_bags?: number;
    pickup?: string;
    car_type?: CarType | null;
    price_inr: number;
  }): Promise<ApiResponse<RideRequest>> {
    return httpRequest<RideRequest>('/requests', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // 4. List All Requests
  getRequests(): Promise<ApiResponse<RideRequest[]>> {
    return httpRequest<RideRequest[]>('/requests');
  },

  // 5. Get Single Request Details & Offers (with sorting & car type filter)
  getRequest(
    requestId: string,
    sort?: 'price_asc' | 'price_desc',
    carTypeFilter?: string
  ): Promise<ApiResponse<RideRequest>> {
    const params = new URLSearchParams();
    if (sort) params.set('sort', sort);
    if (carTypeFilter && carTypeFilter !== 'ALL') params.set('car_type', carTypeFilter);

    const qs = params.toString() ? `?${params.toString()}` : '';
    return httpRequest<RideRequest>(`/requests/${encodeURIComponent(requestId)}${qs}`);
  },

  // 6. Supplier Dashboard
  getSupplierDashboard(companyId: string): Promise<ApiResponse<SupplierDashboardData>> {
    return httpRequest<SupplierDashboardData>(`/suppliers/${encodeURIComponent(companyId)}/dashboard`);
  },

  // 7. Assign Car Offer
  assignCar(
    companyId: string,
    body: {
      request_id: string;
      vehicle_id: string;
      price_inr: number;
      expires_at?: string | null;
    }
  ): Promise<ApiResponse<TaxiOffer>> {
    return httpRequest<TaxiOffer>(`/suppliers/${encodeURIComponent(companyId)}/offers`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // 8. Book Offer
  bookOffer(offerId: string): Promise<ApiResponse<BookingSummary>> {
    return httpRequest<BookingSummary>(`/offers/${encodeURIComponent(offerId)}/book`, {
      method: 'POST',
    });
  },

  // 9. Reject Offer
  rejectOffer(offerId: string): Promise<ApiResponse<{ offer_id: string; status: 'REJECTED' }>> {
    return httpRequest<{ offer_id: string; status: 'REJECTED' }>(
      `/offers/${encodeURIComponent(offerId)}/reject`,
      { method: 'POST' }
    );
  },

  // 10. Get Booking Details by 10-Digit Number
  getBooking(bookingNumber: string): Promise<ApiResponse<BookingSummary>> {
    return httpRequest<BookingSummary>(`/bookings/${encodeURIComponent(bookingNumber)}`);
  },

  // 11. Create Schedule Change Request
  createChangeRequest(
    bookingNumber: string,
    body: { new_flight_id?: string; new_pickup?: string }
  ): Promise<ApiResponse<ChangeRequest>> {
    return httpRequest<ChangeRequest>(
      `/bookings/${encodeURIComponent(bookingNumber)}/change-request`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );
  },

  // 12. Supplier Accepts or Rejects Change Request
  respondToChangeRequest(
    changeId: string,
    action: 'ACCEPT' | 'REJECT'
  ): Promise<ApiResponse<BookingSummary>> {
    return httpRequest<BookingSummary>(
      `/change-requests/${encodeURIComponent(changeId)}/respond`,
      {
        method: 'POST',
        body: JSON.stringify({ action }),
      }
    );
  },

  // Get Single Change Request Details
  getChangeRequest(
    changeId: string
  ): Promise<ApiResponse<ChangeRequest & { booking: BookingSummary }>> {
    return httpRequest<ChangeRequest & { booking: BookingSummary }>(
      `/change-requests/${encodeURIComponent(changeId)}`
    );
  },

  // 13. Reset Demo State (Admin Endpoint)
  resetDemo(): Promise<ApiResponse<{ reset: boolean; open_requests_seeded: number }>> {
    return httpRequest<{ reset: boolean; open_requests_seeded: number }>(
      '/admin/reset-demo',
      { method: 'POST' }
    );
  },
};
