export type CarType = 'HATCHBACK' | 'SEDAN' | 'SUV' | 'BUS';

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
  lat: number;
  lng: number;
  serves_cities?: string[];
}

export interface Flight {
  flight_id: string;
  airline: string;
  flight_number: string;
  from: string;
  to: string;
  departure_local: string;
  arrival_local: string;
  earliest_pickup?: string;
  stops: number;
  duration_minutes: number;
  price_per_seat?: {
    amount: number;
    currency: string;
  };
  seats_left?: number;
  cabin?: string;
}

export interface Hotel {
  hotel_id: string;
  name: string;
  aliases?: string[];
  city: string;
  area: string;
  lat?: number;
  lng?: number;
  rating?: number;
  stars?: number;
  check_in_from?: string;
  check_out_until?: string;
  family_friendly?: boolean;
  image?: string;
}

export interface Route {
  airport: string;
  city: string;
  area: string;
  distance_km: number;
  drive_minutes: number;
  price_min_inr: number;
  price_max_inr: number;
}

export interface Vehicle {
  vehicle_id: string;
  type: CarType;
  seats: number;
  large_bags: number;
  small_bags: number;
}

export interface AreaCoverage {
  city: string;
  area: string;
}

export interface TaxiCompany {
  company_id: string;
  name: string;
  airports: string[];
  areas: AreaCoverage[];
  service_from: string;
  service_until: string;
  rating: number;
  vehicles: Vehicle[];
}

export interface BookedRideRecord {
  ride_id: string;
  company_id: string;
  vehicle_id: string;
  start: string; // YYYY-MM-DDTHH:MM
  end: string;   // YYYY-MM-DDTHH:MM
}

export type RequestStatus = 'OPEN' | 'BOOKED' | 'EXPIRED';

export interface IneligibleReason {
  company_id: string;
  name: string;
  rule: string;
  reason: string;
}

export interface SupplierMatching {
  can_be_served: boolean;
  eligible_supplier_count: number;
  eligible_suppliers: Array<{ company_id: string; name: string }>;
  ineligible_reasons: IneligibleReason[];
}

export interface RideRequest {
  request_id: string;
  traveler_name: string;
  flight_id: string;
  hotel_id: string;
  adults: number;
  child_ages: number[];
  large_bags: number;
  small_bags: number;
  pickup: string; // YYYY-MM-DDTHH:MM
  busy_end?: string;
  car_type: CarType | null;
  price_inr: number;
  status: RequestStatus;
  booking_number?: string | null;
  flight?: Flight;
  hotel?: Hotel;
  route?: Route;
  total_passengers?: number;
  supplier_matching?: SupplierMatching;
  offers?: TaxiOffer[];
  created_at?: string;
}

export type OfferStatus = 'OPEN' | 'BOOKED' | 'REJECTED' | 'NOT_CHOSEN' | 'EXPIRED';

export interface TaxiOffer {
  offer_id: string;
  request_id: string;
  company_id: string;
  company_name: string;
  company_rating: number;
  vehicle_id: string;
  vehicle_type: CarType;
  seats: number;
  large_bags: number;
  small_bags: number;
  price_inr: number;
  expires_at?: string | null;
  status: OfferStatus;
  car_still_free?: boolean;
  created_at?: string;
}

export type ChangeStatus = 'WAITING' | 'ACCEPTED' | 'REJECTED';

export interface ChangeRequest {
  change_id: string;
  booking_number: string;
  new_flight_id?: string;
  new_pickup?: string;
  new_busy_end?: string;
  status: ChangeStatus;
  created_at: string;
  decided_at?: string;
  rejection_reason?: string;
  new_flight?: Flight;
}

export type BookingStatus = 'CONFIRMED' | 'CANCELLED';

export interface BookingSummary {
  booking_number: string;
  status: BookingStatus;
  request_id: string;
  offer_id: string;
  traveler_name: string;
  flight: {
    flight_id: string;
    arrival_local: string;
    from?: string;
    to?: string;
    airline?: string;
    flight_number?: string;
  };
  hotel: {
    hotel_id: string;
    name: string;
    city?: string;
    area?: string;
  };
  pickup: string;
  busy_end: string;
  drive_minutes: number;
  supplier: {
    company_id: string;
    name: string;
    rating?: number;
  };
  car: {
    vehicle_id: string;
    type: CarType;
    seats?: number;
    large_bags?: number;
    small_bags?: number;
  };
  price_inr: number;
  change_requests: ChangeRequest[];
  booked_at: string;
}

export interface VehicleEvaluation extends Vehicle {
  eligible: boolean;
  ruleFailed: 'R5' | 'R6' | null;
  reason: string | null;
}

export interface ServableRequest {
  request_id: string;
  traveler_name: string;
  flight_id: string;
  hotel_id: string;
  flight: Flight;
  hotel: Hotel;
  route: Route;
  adults: number;
  child_ages: number[];
  large_bags: number;
  small_bags: number;
  pickup: string;
  busy_end: string;
  car_type: CarType | null;
  traveler_price_inr: number;
  vehicle_evaluations: VehicleEvaluation[];
  my_offers: TaxiOffer[];
}

export interface FleetBusySlot {
  vehicle_id: string;
  type: CarType;
  busy_windows: Array<{
    source_id: string;
    start: string;
    end: string;
  }>;
}

export interface SupplierDashboardData {
  company: {
    company_id: string;
    name: string;
  };
  servable_requests: ServableRequest[];
  my_offers: TaxiOffer[];
  my_bookings: BookingSummary[];
  change_requests: ChangeRequest[];
  fleet_busy_schedule: FleetBusySlot[];
}

export interface ApiResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T | null;
  error: {
    ruleViolated: 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7' | 'R8' | 'R9' | string | null;
    details?: any;
  } | null;
  meta: {
    timestamp: string;
  };
}

export interface RoutePreviewData {
  flight: {
    flight_id: string;
    to: string;
    arrival_local: string;
    airline?: string;
    flight_number?: string;
  };
  hotel: {
    hotel_id: string;
    name: string;
    city: string;
    area: string;
  };
  earliest_pickup: string;
  route: Route;
}

export interface CatalogBootstrapData {
  flights: Flight[];
  hotels: Hotel[];
  airports: Airport[];
  routes: Route[];
  companies: TaxiCompany[];
  car_types: CarType[];
}

export type UserRole = 'TRAVELER' | 'SUPPLIER';

