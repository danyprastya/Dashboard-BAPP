// Export functionality for PDF and Excel
import type { CustomerWithAreas, ContractWithProgress } from "@/types/database";
import { MONTH_NAMES_FULL } from "@/types/database";

// Format date helper
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

// Export types
export type ExportFormat = "excel" | "pdf";
export type ExportScope = "all" | "customer" | "contract";

export interface ExportOptions {
  format: ExportFormat;
  scope: ExportScope;
  year: number;
  customerId?: string;
  contractId?: string;
  includeTimeline?: boolean;
  includeSignatures?: boolean;
  includeNotes?: boolean;
}

// Generate CSV content for Excel export
export function generateExcelData(
  data: CustomerWithAreas[],
  options: ExportOptions
): string {
  const rows: string[][] = [];
  
  // Header row
  const headers = [
    "Customer",
    "Area",
    "Kontrak",
    "Periode",
    "Jenis Invoice",
    "Bulan",
    "Progress (%)",
    "Status",
    "Tanda Tangan Selesai",
    "Total Tanda Tangan",
    "Upload Dokumen",
  ];
  
  if (options.includeSignatures) {
    headers.push("Detail Tanda Tangan");
  }
  if (options.includeNotes) {
    headers.push("Catatan");
  }
  if (options.includeTimeline) {
    headers.push("Terakhir Update");
  }
  
  rows.push(headers);

  // Data rows
  data.forEach((customer) => {
    // Filter by customer if specified
    if (options.customerId && customer.id !== options.customerId) return;

    customer.areas.forEach((area) => {
      area.contracts.forEach((contract) => {
        // Filter by contract if specified
        if (options.contractId && contract.id !== options.contractId) return;

        contract.monthly_progress.forEach((progress) => {
          const completedSigs = progress.signatures.filter((s) => s.is_completed).length;
          const status =
            progress.percentage === 100
              ? "Selesai"
              : progress.percentage > 0
              ? "Dalam Proses"
              : "Belum Mulai";

          const row = [
            customer.name,
            area.name,
            contract.name,
            contract.period,
            contract.invoice_type,
            MONTH_NAMES_FULL[progress.month - 1],
            progress.percentage.toString(),
            status,
            completedSigs.toString(),
            progress.signatures.length.toString(),
            progress.is_upload_completed ? "Ya" : "Tidak",
          ];

          if (options.includeSignatures) {
            const sigDetails = progress.signatures
              .map(
                (s) =>
                  `${s.name} (${s.role}): ${s.is_completed ? "✓" : "✗"}${
                    s.completed_at ? ` - ${formatDate(s.completed_at)}` : ""
                  }`
              )
              .join("; ");
            row.push(sigDetails);
          }

          if (options.includeNotes) {
            row.push(progress.notes || "-");
          }

          if (options.includeTimeline) {
            row.push(formatDate(progress.updated_at));
          }

          rows.push(row);
        });
      });
    });
  });

  // Convert to CSV
  return rows
    .map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if contains comma or newline
          const escaped = cell.replace(/"/g, '""');
          if (escaped.includes(",") || escaped.includes("\n") || escaped.includes('"')) {
            return `"${escaped}"`;
          }
          return escaped;
        })
        .join(",")
    )
    .join("\n");
}

// Generate summary report data
export function generateSummaryReport(
  data: CustomerWithAreas[],
  year: number
): {
  totalCustomers: number;
  totalContracts: number;
  overallProgress: number;
  completedContracts: number;
  inProgressContracts: number;
  notStartedContracts: number;
  customerSummaries: Array<{
    name: string;
    totalContracts: number;
    averageProgress: number;
    completedCount: number;
  }>;
} {
  let totalContracts = 0;
  let completedContracts = 0;
  let inProgressContracts = 0;
  let notStartedContracts = 0;
  let totalProgress = 0;

  const customerSummaries: Array<{
    name: string;
    totalContracts: number;
    averageProgress: number;
    completedCount: number;
  }> = [];

  data.forEach((customer) => {
    let customerContracts = 0;
    let customerProgress = 0;
    let customerCompleted = 0;

    customer.areas.forEach((area) => {
      area.contracts.forEach((contract) => {
        totalContracts++;
        customerContracts++;

        // Calculate average progress for this contract
        const avgProgress =
          contract.monthly_progress.reduce((sum, p) => sum + p.percentage, 0) /
          contract.monthly_progress.length;

        totalProgress += avgProgress;
        customerProgress += avgProgress;

        if (contract.yearly_status === "completed") {
          completedContracts++;
          customerCompleted++;
        } else if (contract.yearly_status === "in_progress") {
          inProgressContracts++;
        } else {
          notStartedContracts++;
        }
      });
    });

    if (customerContracts > 0) {
      customerSummaries.push({
        name: customer.name,
        totalContracts: customerContracts,
        averageProgress: Math.round(customerProgress / customerContracts),
        completedCount: customerCompleted,
      });
    }
  });

  return {
    totalCustomers: data.length,
    totalContracts,
    overallProgress: totalContracts > 0 ? Math.round(totalProgress / totalContracts) : 0,
    completedContracts,
    inProgressContracts,
    notStartedContracts,
    customerSummaries,
  };
}

// Generate contract timeline report
export function generateContractTimeline(
  contract: ContractWithProgress,
  customerName: string,
  areaName: string
): string {
  const lines: string[] = [];

  lines.push("=" .repeat(60));
  lines.push(`LAPORAN PROGRESS KONTRAK`);
  lines.push("=" .repeat(60));
  lines.push("");
  lines.push(`Kontrak    : ${contract.name}`);
  lines.push(`Customer   : ${customerName}`);
  lines.push(`Area       : ${areaName}`);
  lines.push(`Periode    : ${contract.period}`);
  lines.push(`Invoice    : ${contract.invoice_type}`);
  lines.push(`TTD Total  : ${contract.total_signatures}`);
  lines.push("");
  lines.push("-".repeat(60));
  lines.push("PROGRESS BULANAN");
  lines.push("-".repeat(60));
  lines.push("");

  contract.monthly_progress.forEach((progress) => {
    const completedSigs = progress.signatures.filter((s) => s.is_completed).length;
    const status =
      progress.percentage === 100
        ? "✓ SELESAI"
        : progress.percentage > 0
        ? "○ PROSES"
        : "✗ BELUM";

    lines.push(`${MONTH_NAMES_FULL[progress.month - 1]} ${progress.year}`);
    lines.push(`  Status    : ${status} (${progress.percentage}%)`);
    lines.push(`  TTD       : ${completedSigs}/${progress.signatures.length}`);
    lines.push(`  Upload    : ${progress.is_upload_completed ? "Sudah" : "Belum"}`);

    if (progress.notes) {
      lines.push(`  Catatan   : ${progress.notes}`);
    }

    // Signature details
    lines.push("  Detail Tanda Tangan:");
    progress.signatures.forEach((sig) => {
      const sigStatus = sig.is_completed ? "✓" : "✗";
      const sigTime = sig.completed_at ? ` (${formatDate(sig.completed_at)})` : "";
      lines.push(`    ${sigStatus} ${sig.name} - ${sig.role}${sigTime}`);
    });

    if (progress.updated_at) {
      lines.push(`  Update    : ${formatDate(progress.updated_at)}`);
    }

    lines.push("");
  });

  lines.push("=" .repeat(60));
  lines.push(`Laporan dibuat: ${new Date().toLocaleString("id-ID")}`);
  lines.push("=" .repeat(60));

  return lines.join("\n");
}

// Download file helper
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export to Excel (CSV)
export function exportToExcel(
  data: CustomerWithAreas[],
  options: ExportOptions
): void {
  const csv = generateExcelData(data, options);
  const filename = `BAPP_Report_${options.year}_${new Date().toISOString().split("T")[0]}.csv`;
  // Add BOM for proper Excel UTF-8 handling
  const csvWithBOM = "\uFEFF" + csv;
  downloadFile(csvWithBOM, filename, "text/csv;charset=utf-8");
}

// Export summary to text (can be printed as PDF)
export function exportSummaryReport(
  data: CustomerWithAreas[],
  year: number
): void {
  const summary = generateSummaryReport(data, year);
  const lines: string[] = [];

  lines.push("=" .repeat(60));
  lines.push(`RINGKASAN LAPORAN BAPP TAHUN ${year}`);
  lines.push("=" .repeat(60));
  lines.push("");
  lines.push(`Total Customer       : ${summary.totalCustomers}`);
  lines.push(`Total Kontrak        : ${summary.totalContracts}`);
  lines.push(`Progress Keseluruhan : ${summary.overallProgress}%`);
  lines.push("");
  lines.push("-".repeat(60));
  lines.push("STATUS KONTRAK");
  lines.push("-".repeat(60));
  lines.push(`✓ Selesai        : ${summary.completedContracts}`);
  lines.push(`○ Dalam Proses   : ${summary.inProgressContracts}`);
  lines.push(`✗ Belum Mulai    : ${summary.notStartedContracts}`);
  lines.push("");
  lines.push("-".repeat(60));
  lines.push("RINGKASAN PER CUSTOMER");
  lines.push("-".repeat(60));

  summary.customerSummaries.forEach((cs) => {
    lines.push(`\n${cs.name}`);
    lines.push(`  Kontrak  : ${cs.totalContracts}`);
    lines.push(`  Progress : ${cs.averageProgress}%`);
    lines.push(`  Selesai  : ${cs.completedCount}/${cs.totalContracts}`);
  });

  lines.push("");
  lines.push("=" .repeat(60));
  lines.push(`Laporan dibuat: ${new Date().toLocaleString("id-ID")}`);
  lines.push("=" .repeat(60));

  const content = lines.join("\n");
  const filename = `BAPP_Summary_${year}_${new Date().toISOString().split("T")[0]}.txt`;
  downloadFile(content, filename, "text/plain;charset=utf-8");
}

// Export single contract timeline
export function exportContractReport(
  contract: ContractWithProgress,
  customerName: string,
  areaName: string
): void {
  const content = generateContractTimeline(contract, customerName, areaName);
  const filename = `BAPP_${contract.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.txt`;
  downloadFile(content, filename, "text/plain;charset=utf-8");
}
