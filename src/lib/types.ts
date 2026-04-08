export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Agency {
  id: string;
  name: string;
  created_at: string;
}

export interface AgencyMember {
  id: string;
  user_id: string;
  agency_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
}

export interface Booking {
  id: string;
  agency_id: string;
  booking_ref: string;
  client_name: string;
  activity: string;
  travel_date: string;
  amount: number;
  status: "confirmed" | "pending" | "cancelled";
  created_at: string;
}

export type BookingStatus = Booking["status"];
