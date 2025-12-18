import {
  CustomerWithAreas,
  MonthlyProgressDetail,
  ContractWithProgress,
} from "@/types/database";

// Helper to generate random progress data
function generateMonthlyProgress(
  totalSignatures: number,
  monthIndex: number
): MonthlyProgressDetail {
  const currentMonth = new Date().getMonth();
  const isPastMonth = monthIndex < currentMonth;
  const isCurrentMonth = monthIndex === currentMonth;

  // Past months are mostly completed, current month is partial
  const completionChance = isPastMonth ? 0.85 : isCurrentMonth ? 0.5 : 0.1;

  const signatures = Array.from({ length: totalSignatures }, (_, i) => ({
    id: `sig-${i}`,
    name: `Penandatangan ${i + 1}`,
    role: i === 0 ? "Manager" : i === 1 ? "Supervisor" : "Staff",
    is_completed: Math.random() < completionChance,
    completed_at: Math.random() < completionChance ? new Date().toISOString() : null,
  }));

  const isUploadCompleted = Math.random() < completionChance;
  const totalItems = totalSignatures + 1; // signatures + upload
  const completedItems =
    signatures.filter((s) => s.is_completed).length + (isUploadCompleted ? 1 : 0);
  const percentage = Math.round((completedItems / totalItems) * 100);

  return {
    month: monthIndex + 1,
    year: new Date().getFullYear(),
    signatures,
    is_upload_completed: isUploadCompleted,
    upload_link: isUploadCompleted ? "https://example.com/upload" : null,
    percentage,
  };
}

// Generate placeholder data that matches the screenshot structure
export function generatePlaceholderData(): CustomerWithAreas[] {
  const data: CustomerWithAreas[] = [
    {
      id: "1",
      name: "TELKOM",
      areas: [
        {
          id: "1a",
          name: "",
          code: "a",
          contracts: [
            {
              id: "1a1",
              name: "CHEKLIST DIGISLAM / REKAP SLA GEDUNG",
              period: "1 bulan",
              invoice_type: "Pusat",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
            {
              id: "1a2",
              name: "BAP PENGAMANAN",
              period: "1 bulan",
              invoice_type: "Pusat",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
            {
              id: "1a3",
              name: "BAP MO KELISTRIKAN",
              period: "1 bulan",
              invoice_type: "Pusat",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
          ],
        },
      ],
    },
    {
      id: "2",
      name: "TELKOMSEL",
      areas: [
        {
          id: "2a",
          name: "",
          code: "a",
          contracts: [
            {
              id: "2a1",
              name: "FMC PELAYANAN & BACK OFFICE",
              period: "1 bulan",
              invoice_type: "Regional 2",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
            {
              id: "2a2",
              name: "TTC SOETA",
              period: "1 bulan",
              invoice_type: "Regional 3",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
            {
              id: "2a3",
              name: "TTC DAGO",
              period: "1 bulan",
              invoice_type: "Regional 3",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
            {
              id: "2a4",
              name: "WAREHOUSE (GUDANG)",
              period: "1 bulan",
              invoice_type: "Regional 3",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
            {
              id: "2a5",
              name: "OMU SHOP NONMALL DAGO",
              period: "1 bulan",
              invoice_type: "Regional 3",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
            {
              id: "2a6",
              name: "OMU BRANCH REG (SOETA)",
              period: "1 bulan",
              invoice_type: "Regional 2",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
            {
              id: "2a7",
              name: "OMU BRANCH BDG WINDU",
              period: "1 bulan",
              invoice_type: "Regional 2",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
            {
              id: "2a8",
              name: "OMU BRANCH SOREANG",
              period: "1 bulan",
              invoice_type: "Regional 2",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
          ],
        },
      ],
    },
    {
      id: "3",
      name: "TELKOM AKSES",
      areas: [
        {
          id: "3a",
          name: "",
          code: "a",
          contracts: [
            {
              id: "3a1",
              name: "BR SC GEDUNG",
              period: "3 bulan",
              invoice_type: "Pusat",
              notes: "Mulai TW2 Rekon & BAPP sudah di Reg 2",
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
            {
              id: "3a2",
              name: "Pemakaian KBM R2 & R4",
              period: "1 bulan",
              invoice_type: "Pusat",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
          ],
        },
      ],
    },
    {
      id: "4",
      name: "INFOMEDIA BB",
      areas: [
        {
          id: "4a",
          name: "",
          code: "a",
          contracts: [
            {
              id: "4a1",
              name: "GEDUNG / BR",
              period: "1 bulan",
              invoice_type: "Pusat",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
            {
              id: "4a2",
              name: "GEDUNG / SC",
              period: "1 bulan",
              invoice_type: "Pusat",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
            {
              id: "4a3",
              name: "LISTRIK",
              period: "1 bulan",
              invoice_type: "Pusat",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
          ],
        },
      ],
    },
    {
      id: "5",
      name: "TELKOM MEDIKA",
      areas: [
        {
          id: "5a",
          name: "",
          code: "a",
          contracts: [
            {
              id: "5a1",
              name: "CORPU",
              period: "1 bulan",
              invoice_type: "Pusat",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
            {
              id: "5a2",
              name: "SENTOT",
              period: "1 bulan",
              invoice_type: "Pusat",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
            {
              id: "5a3",
              name: "BUAH BATU",
              period: "1 bulan",
              invoice_type: "Pusat",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
          ],
        },
      ],
    },
    {
      id: "6",
      name: "YPT",
      areas: [
        {
          id: "6a",
          name: "",
          code: "a",
          contracts: [
            {
              id: "6a1",
              name: "BA Pemeriksaan & BA Pelaksanaan BR & SC Gedung CISANGGARUNG",
              period: "1 bulan",
              invoice_type: "Regional 3",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
            {
              id: "6a2",
              name: "Jasa Tenaga Keamanan CISANGGARUNG",
              period: "1 bulan",
              invoice_type: "Regional 3",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
            {
              id: "6a3",
              name: "SC Gedung RUSUNAWA",
              period: "1 bulan",
              invoice_type: "Regional 3",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
          ],
        },
      ],
    },
    {
      id: "7",
      name: "YAKES",
      areas: [
        {
          id: "7a",
          name: "",
          code: "a",
          contracts: [
            {
              id: "7a1",
              name: "SC Gedung SENTOT",
              period: "1 bulan",
              invoice_type: "Pusat",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
            {
              id: "7a2",
              name: "BR Gedung BUAH BATU",
              period: "3 bulan",
              invoice_type: "Pusat",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
            {
              id: "7a3",
              name: "SC Gedung BUAH BATU",
              period: "1 bulan",
              invoice_type: "Pusat",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
            {
              id: "7a4",
              name: "SC & Jasa Security CISANGGARUNG",
              period: "1 bulan",
              invoice_type: "Pusat",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
            {
              id: "7a5",
              name: "SC & Jasa Security CILIWUNG",
              period: "1 bulan",
              invoice_type: "Pusat",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
            {
              id: "7a6",
              name: "Gedung CORPU",
              period: "1 bulan",
              invoice_type: "Pusat",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
          ],
        },
      ],
    },
    {
      id: "8",
      name: "EXMA",
      areas: [
        {
          id: "8a",
          name: "",
          code: "",
          contracts: [],
        },
      ],
    },
    {
      id: "9",
      name: "BI TASIKMALAYA",
      areas: [
        {
          id: "9a",
          name: "",
          code: "a",
          contracts: [
            {
              id: "9a1",
              name: "PBF (Pemeliharaan Bangunan & Fasilitas)",
              period: "1 bulan",
              invoice_type: "Regional 3",
              notes: null,
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
            {
              id: "9a2",
              name: "Pemeliharaan AC / AHU",
              period: "2 bulan",
              invoice_type: "Regional 3",
              notes: "Invoice Terakhir Periode Feb",
              total_signatures: 3,
              monthly_progress: Array.from({ length: 12 }, (_, i) =>
                generateMonthlyProgress(3, i)
              ),
              yearly_status: "in_progress",
            },
          ],
        },
      ],
    },
  ];

  return data;
}

// Calculate yearly status based on monthly progress
export function calculateYearlyStatus(
  contract: ContractWithProgress
): "completed" | "in_progress" | "not_started" {
  const allCompleted = contract.monthly_progress.every(
    (m) => m.percentage === 100
  );
  const anyStarted = contract.monthly_progress.some((m) => m.percentage > 0);

  if (allCompleted) return "completed";
  if (anyStarted) return "in_progress";
  return "not_started";
}

// Get progress color class based on percentage (soft colors)
export function getProgressColorClass(percentage: number): string {
  if (percentage === 100) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  if (percentage >= 75) return "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300";
  if (percentage >= 50) return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
  if (percentage >= 25) return "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300";
  if (percentage > 0) return "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
  return "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400";
}

// Get status badge color
export function getStatusColorClass(
  status: "completed" | "in_progress" | "not_started"
): string {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
    case "in_progress":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    case "not_started":
      return "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400";
  }
}
