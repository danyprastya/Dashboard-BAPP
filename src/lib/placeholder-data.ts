import {
  CustomerWithAreas,
  MonthlyProgressDetail,
  ContractWithProgress,
  SignatureDetail,
  Signature,
} from "@/types/database";

// Helper to generate random progress data with dynamic signature count
function generateMonthlyProgress(
  totalSignatures: number,
  monthIndex: number,
  year: number
): MonthlyProgressDetail {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const isPastMonth = year < currentYear || (year === currentYear && monthIndex < currentMonth);
  const isCurrentMonth = year === currentYear && monthIndex === currentMonth;

  // Past months are mostly completed, current month is partial
  const completionChance = isPastMonth ? 0.85 : isCurrentMonth ? 0.5 : 0.1;

  const signatures: SignatureDetail[] = Array.from({ length: totalSignatures }, (_, i) => ({
    id: `sig-${i}`,
    name: `Penandatangan ${i + 1}`,
    role: i === 0 ? "Manager" : i === 1 ? "Supervisor" : i === 2 ? "Staff" : `Pihak ${i + 1}`,
    order: i + 1,
    is_completed: Math.random() < completionChance,
    completed_at: Math.random() < completionChance ? new Date().toISOString() : null,
  }));

  const isUploadCompleted = Math.random() < completionChance;
  const totalItems = totalSignatures + 1; // signatures + upload (dynamic based on signature count)
  const completedItems =
    signatures.filter((s) => s.is_completed).length + (isUploadCompleted ? 1 : 0);
  const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return {
    id: null,
    month: monthIndex + 1,
    year: year,
    signatures,
    is_upload_completed: isUploadCompleted,
    upload_link: isUploadCompleted ? "https://example.com/upload" : null,
    notes: null, // No notes in placeholder data
    percentage,
    total_items: totalItems,
    completed_items: completedItems,
  };
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

// Generate placeholder data that matches the screenshot structure
export function generatePlaceholderData(year: number = new Date().getFullYear()): CustomerWithAreas[] {
  // Helper to create contract with variable signature count
  const createContract = (
    id: string,
    customerId: string,
    areaId: string,
    name: string,
    period: string,
    invoiceType: "Pusat" | "Regional 2" | "Regional 3",
    notes: string | null,
    signatureCount: number
  ): ContractWithProgress => {
    const signatures: Signature[] = Array.from({ length: signatureCount }, (_, i) => ({
      id: `${id}-sig-${i}`,
      contract_id: id,
      name: `Penandatangan ${i + 1}`,
      role: i === 0 ? "Manager" : i === 1 ? "Supervisor" : i === 2 ? "Staff" : `Pihak ${i + 1}`,
      order: i + 1,
      created_at: new Date().toISOString(),
    }));

    return {
      id,
      customer_id: customerId,
      area_id: areaId,
      name,
      period,
      invoice_type: invoiceType,
      notes,
      total_signatures: signatureCount,
      signatures,
      monthly_progress: Array.from({ length: 12 }, (_, i) =>
        generateMonthlyProgress(signatureCount, i, year)
      ),
      yearly_status: "in_progress",
    };
  };

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
            createContract("1a1", "1", "1a", "CHEKLIST DIGISLAM / REKAP SLA GEDUNG", "1 bulan", "Pusat", null, 3),
            createContract("1a2", "1", "1a", "BAP PENGAMANAN", "1 bulan", "Pusat", null, 2),
            createContract("1a3", "1", "1a", "BAP MO KELISTRIKAN", "1 bulan", "Pusat", null, 3),
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
            createContract("2a1", "2", "2a", "FMC PELAYANAN & BACK OFFICE", "1 bulan", "Regional 2", null, 3),
            createContract("2a2", "2", "2a", "TTC SOETA", "1 bulan", "Regional 3", null, 3),
            createContract("2a3", "2", "2a", "TTC DAGO", "1 bulan", "Regional 3", null, 2),
            createContract("2a4", "2", "2a", "WAREHOUSE (GUDANG)", "1 bulan", "Regional 3", null, 3),
            createContract("2a5", "2", "2a", "OMU SHOP NONMALL DAGO", "1 bulan", "Regional 3", null, 4),
            createContract("2a6", "2", "2a", "OMU BRANCH REG (SOETA)", "1 bulan", "Regional 2", null, 3),
            createContract("2a7", "2", "2a", "OMU BRANCH BDG WINDU", "1 bulan", "Regional 2", null, 2),
            createContract("2a8", "2", "2a", "OMU BRANCH SOREANG", "1 bulan", "Regional 2", null, 3),
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
            createContract("3a1", "3", "3a", "BR SC GEDUNG", "3 bulan", "Pusat", "Mulai TW2 Rekon & BAPP sudah di Reg 2", 3),
            createContract("3a2", "3", "3a", "Pemakaian KBM R2 & R4", "1 bulan", "Pusat", null, 2),
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
            createContract("4a1", "4", "4a", "GEDUNG / BR", "1 bulan", "Pusat", null, 3),
            createContract("4a2", "4", "4a", "GEDUNG / SC", "1 bulan", "Pusat", null, 3),
            createContract("4a3", "4", "4a", "LISTRIK", "1 bulan", "Pusat", null, 2),
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
            createContract("5a1", "5", "5a", "CORPU", "1 bulan", "Pusat", null, 3),
            createContract("5a2", "5", "5a", "SENTOT", "1 bulan", "Pusat", null, 4),
            createContract("5a3", "5", "5a", "BUAH BATU", "1 bulan", "Pusat", null, 3),
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
            createContract("6a1", "6", "6a", "BA Pemeriksaan & BA Pelaksanaan BR & SC Gedung CISANGGARUNG", "1 bulan", "Regional 3", null, 3),
            createContract("6a2", "6", "6a", "Jasa Tenaga Keamanan CISANGGARUNG", "1 bulan", "Regional 3", null, 2),
            createContract("6a3", "6", "6a", "SC Gedung RUSUNAWA", "1 bulan", "Regional 3", null, 3),
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
            createContract("7a1", "7", "7a", "SC Gedung SENTOT", "1 bulan", "Pusat", null, 3),
            createContract("7a2", "7", "7a", "BR Gedung BUAH BATU", "3 bulan", "Pusat", null, 4),
            createContract("7a3", "7", "7a", "SC Gedung BUAH BATU", "1 bulan", "Pusat", null, 3),
            createContract("7a4", "7", "7a", "SC & Jasa Security CISANGGARUNG", "1 bulan", "Pusat", null, 2),
            createContract("7a5", "7", "7a", "SC & Jasa Security CILIWUNG", "1 bulan", "Pusat", null, 2),
            createContract("7a6", "7", "7a", "Gedung CORPU", "1 bulan", "Pusat", null, 3),
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
            createContract("9a1", "9", "9a", "PBF (Pemeliharaan Bangunan & Fasilitas)", "1 bulan", "Regional 3", null, 3),
            createContract("9a2", "9", "9a", "Pemeliharaan AC / AHU", "2 bulan", "Regional 3", "Invoice Terakhir Periode Feb", 2),
          ],
        },
      ],
    },
  ];

  // Update yearly status based on generated progress
  return data.map((customer) => ({
    ...customer,
    areas: customer.areas.map((area) => ({
      ...area,
      contracts: area.contracts.map((contract) => ({
        ...contract,
        yearly_status: calculateYearlyStatus(contract),
      })),
    })),
  }));
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
