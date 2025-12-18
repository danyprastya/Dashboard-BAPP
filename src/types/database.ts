// Database Types for BAPP Dashboard
// These types mirror the Supabase database schema

export interface Customer {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Area {
  id: string;
  customer_id: string;
  name: string;
  code: string;
  created_at: string;
  updated_at: string;
}

export interface BAPPContract {
  id: string;
  area_id: string;
  name: string;
  period: string; // e.g., "1 bulan", "3 bulan"
  invoice_type: "Pusat" | "Regional 2" | "Regional 3";
  notes: string | null;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface Signature {
  id: string;
  contract_id: string;
  name: string;
  role: string;
  order: number;
  created_at: string;
}

export interface MonthlyProgress {
  id: string;
  contract_id: string;
  month: number; // 1-12
  year: number;
  upload_link: string | null;
  is_upload_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface SignatureProgress {
  id: string;
  monthly_progress_id: string;
  signature_id: string;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
}

// Computed/View Types for Frontend
export interface MonthlyProgressDetail {
  month: number;
  year: number;
  signatures: {
    id: string;
    name: string;
    role: string;
    is_completed: boolean;
    completed_at: string | null;
  }[];
  is_upload_completed: boolean;
  upload_link: string | null;
  percentage: number;
}

export interface ContractWithProgress {
  id: string;
  name: string;
  period: string;
  invoice_type: "Pusat" | "Regional 2" | "Regional 3";
  notes: string | null;
  total_signatures: number;
  monthly_progress: MonthlyProgressDetail[];
  yearly_status: "completed" | "in_progress" | "not_started";
}

export interface AreaWithContracts {
  id: string;
  name: string;
  code: string;
  contracts: ContractWithProgress[];
}

export interface CustomerWithAreas {
  id: string;
  name: string;
  areas: AreaWithContracts[];
}

// Auth Types
export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "viewer";
  created_at: string;
}

// Filter Types
export interface DashboardFilters {
  year: number;
  search: string;
  customer_id: string | null;
  invoice_type: string | null;
  status: "all" | "completed" | "in_progress" | "not_started";
}

// Month names in Indonesian
export const MONTH_NAMES = [
  "JAN", "FEB", "MAR", "APR", "MEI", "JUN",
  "JUL", "AGS", "SEP", "OKT", "NOV", "DES"
] as const;

export const MONTH_NAMES_FULL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
] as const;
