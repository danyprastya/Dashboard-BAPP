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
  customer_id: string;
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
  sub_period: number; // 1 or 2 (for half-month periods)
  upload_link: string | null;
  is_upload_completed: boolean;
  notes: string | null; // Catatan untuk bulan ini
  notes_updated_at: string | null; // Timestamp catatan diupdate
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
export interface SignatureDetail {
  id: string;
  name: string;
  role: string;
  order: number;
  is_completed: boolean;
  completed_at: string | null;
}

export interface MonthlyProgressDetail {
  id: string | null;
  month: number;
  year: number;
  sub_period: number; // 1 or 2 (for half-month periods)
  signatures: SignatureDetail[];
  is_upload_completed: boolean;
  upload_link: string | null;
  notes: string | null; // Catatan untuk bulan ini
  notes_updated_at: string | null; // Timestamp catatan diupdate
  updated_at: string | null; // Timestamp progress diupdate
  percentage: number;
  total_items: number; // total signatures + 1 (upload)
  completed_items: number;
}

export interface ContractWithProgress {
  id: string;
  customer_id: string;
  area_id: string;
  name: string;
  period: string;
  invoice_type: "Pusat" | "Regional 2" | "Regional 3";
  notes: string | null;
  total_signatures: number;
  signatures: Signature[];
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
export interface UserProfile {
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
  area_name: string | null;
  period: string | null;
  invoice_type: string | null;
  status: "all" | "completed" | "in_progress" | "not_started";
}

// Form Types for CRUD
export interface ContractFormData {
  customer_id: string;
  area_id: string;
  name: string;
  period: string;
  invoice_type: "Pusat" | "Regional 2" | "Regional 3";
  notes: string;
  year: number;
  signatures: { name: string; role: string }[];
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

// Period options for contracts
export const PERIOD_OPTIONS = [
  { value: 0.5, label: "Per 1/2 Bulan" },
  { value: 1, label: "Per 1 Bulan" },
  { value: 2, label: "Per 2 Bulan" },
  { value: 3, label: "Per 3 Bulan" },
  { value: 4, label: "Per 4 Bulan" },
  { value: 6, label: "Per 6 Bulan" },
  { value: 12, label: "Per 12 Bulan" },
] as const;

export type PeriodValue = typeof PERIOD_OPTIONS[number]["value"];

// Helper function to get period months (which months are active for a period)
export function getPeriodMonths(periodValue: number): number[] {
  // Handle half-month period - return all 12 months
  if (periodValue === 0.5) {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }
  
  const months: number[] = [];
  for (let i = periodValue; i <= 12; i += periodValue) {
    months.push(Math.round(i)); // Use Math.round to avoid floating point issues
  }
  return months;
}

// Helper function to parse period string to number
export function parsePeriodToNumber(period: string): number {
  // Handle "Per 1/2 Bulan" special case
  if (period.includes("1/2")) {
    return 0.5;
  }
  const match = period.match(/\d+/);
  return match ? parseInt(match[0]) : 1;
}

// Helper function to check if period is half-monthly
export function isHalfMonthPeriod(period: string): boolean {
  return period.includes("1/2") || parsePeriodToNumber(period) === 0.5;
}

// Helper function to calculate percentage dynamically
export function calculateProgress(
  completedSignatures: number,
  totalSignatures: number,
  isUploadCompleted: boolean
): { percentage: number; totalItems: number; completedItems: number } {
  const totalItems = totalSignatures + 1; // signatures + upload
  const completedItems = completedSignatures + (isUploadCompleted ? 1 : 0);
  const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  return { percentage, totalItems, completedItems };
}

// Contract summary for import functionality
export interface ContractSummary {
  id: string;
  customerName: string;
  areaName: string | null;
  name: string; // Contract name/package name
  invoiceType: string;
  period: string;
  signatureCount: number;
  year: number;
}
