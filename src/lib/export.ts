// Export functionality using exceljs library for proper Excel files with styling
import ExcelJS from "exceljs";
import type { CustomerWithAreas, ContractWithProgress } from "@/types/database";
import { MONTH_NAMES, MONTH_NAMES_FULL, parsePeriodToNumber } from "@/types/database";

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

// Format export date for filename
function formatExportDate(): string {
  const now = new Date();
  return `${now.getDate().toString().padStart(2, "0")}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getFullYear()}`;
}

// Export types
export type ExportFormat = "excel" | "txt";
export type ExportScope = "all" | "customer" | "contract";

export interface ExportOptions {
  format: ExportFormat;
  scope: ExportScope;
  year: number;
  customerId?: string;
  customerName?: string;
  contractId?: string;
  includeTimeline?: boolean;
  includeSignatures?: boolean;
  includeNotes?: boolean;
}

// Row data interface for Excel export with merge tracking
interface ExcelRowData {
  rowNumber: number;
  customer: string;
  contract: string;
  area: string;
  period: string;
  periodValue: number; // For month merging
  monthlyData: (number | string)[];
  customerRowStart: number;
  customerRowSpan: number;
  contractRowStart: number;
  contractRowSpan: number;
  isFirstCustomerRow: boolean;
  isFirstContractRow: boolean;
  excelRowNumber: number; // Actual Excel row number for month merging
}

// Build flat row data with merge information for vertical merging
function buildRowData(data: CustomerWithAreas[]): ExcelRowData[] {
  const rowsData: ExcelRowData[] = [];
  let rowNumber = 0;
  let excelRow = 1; // Start at row 1 (row 0 is header in 0-indexed)

  data.forEach((customer) => {
    // Count total contracts for this customer across all areas
    let customerContractCount = 0;
    customer.areas.forEach((area) => {
      customerContractCount += area.contracts.length;
    });

    // Group contracts by name across all areas for this customer
    const contractGroups = new Map<string, { contract: ContractWithProgress; area: string }[]>();
    customer.areas.forEach((area) => {
      area.contracts.forEach((contract) => {
        const contractKey = `${contract.name} - ${contract.total_signatures} tanda tangan`;
        if (!contractGroups.has(contractKey)) {
          contractGroups.set(contractKey, []);
        }
        contractGroups.get(contractKey)!.push({ contract, area: area.name });
      });
    });

    const customerRowStart = excelRow;
    let isFirstCustomerRow = true;

    contractGroups.forEach((contractItems, contractKey) => {
      const contractRowStart = excelRow;
      let isFirstContractRow = true;

      contractItems.forEach(({ contract, area }) => {
        rowNumber++;

        // Parse period value for correct data placement
        const periodVal = parsePeriodToNumber(contract.period);
        
        // Get monthly progress data - place values at START of each period for merged cells
        const monthlyData: (number | string)[] = Array(12).fill("-");
        
        if (periodVal >= 1) {
          // For periods >= 1 month, place data at start of each period
          for (let startMonth = 1; startMonth <= 12; startMonth += periodVal) {
            const endMonth = Math.min(startMonth + periodVal - 1, 12);
            // Progress is stored at the END month of each period
            const progress = contract.monthly_progress.find(
              (mp) => mp.month === endMonth
            );
            if (progress) {
              // Place value at START month so merged cell shows it
              monthlyData[startMonth - 1] = progress.percentage;
            }
          }
        } else {
          // For half-month periods, keep original logic
          MONTH_NAMES.forEach((_, monthIndex) => {
            const progress = contract.monthly_progress.find(
              (mp) => mp.month === monthIndex + 1
            );
            if (progress) {
              monthlyData[monthIndex] = progress.percentage;
            }
          });
        }

        rowsData.push({
          rowNumber,
          customer: customer.name,
          contract: contractKey,
          area,
          period: contract.period,
          periodValue: periodVal,
          monthlyData,
          customerRowStart,
          customerRowSpan: customerContractCount,
          contractRowStart,
          contractRowSpan: contractItems.length,
          isFirstCustomerRow,
          isFirstContractRow,
          excelRowNumber: excelRow + 1, // +1 because header is row 1
        });

        excelRow++;
        isFirstCustomerRow = false;
        isFirstContractRow = false;
      });
    });
  });

  return rowsData;
}

// Generate and download Excel file using exceljs with styling
async function generateExcelFile(data: CustomerWithAreas[], filename: string): Promise<void> {
  const rowsData = buildRowData(data);

  // Create workbook and worksheet
  const wb = new ExcelJS.Workbook();
  wb.creator = "Dashboard BAPP";
  wb.created = new Date();
  
  const ws = wb.addWorksheet("BAPP Report", {
    views: [{ state: "frozen", ySplit: 1 }], // Freeze header row
  });

  // Define columns with widths
  ws.columns = [
    { key: "no", width: 6 },
    { key: "customer", width: 28 },
    { key: "contract", width: 45 },
    { key: "area", width: 22 },
    { key: "period", width: 16 },
    ...MONTH_NAMES.map((name) => ({ key: name.toLowerCase(), width: 10 })),
  ];

  // Header row
  const headers = ["NO", "CUSTOMER", "NAMA KONTRAK", "AREA", "PERIODE", ...MONTH_NAMES];
  const headerRow = ws.addRow(headers);
  
  // Style header row
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    // Header background color - dark blue
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A5F" }, // Dark blue
    };
    // Header font - white, bold
    cell.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
      size: 11,
    };
    // Alignment - center horizontal, middle vertical
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    // Border
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
  });

  // Alternating row colors for data
  const evenRowColor = "FFF3F4F6"; // Light gray
  const oddRowColor = "FFFFFFFF"; // White

  // Add data rows
  rowsData.forEach((row, rowIndex) => {
    const rowData = [
      row.rowNumber,
      row.customer,
      row.contract,
      row.area,
      row.period,
      ...row.monthlyData.map((v) => {
        if (v === "-") return "";
        if (typeof v === "number") return `${v}%`;
        return v;
      }),
    ];
    
    const dataRow = ws.addRow(rowData);
    dataRow.height = 24;
    
    // Determine row background color (alternating)
    const isEvenRow = rowIndex % 2 === 0;
    const bgColor = isEvenRow ? evenRowColor : oddRowColor;
    
    dataRow.eachCell((cell, colNumber) => {
      // Background color - alternating rows
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: bgColor },
      };
      
      // Font
      cell.font = {
        size: 10,
        color: { argb: "FF333333" },
      };
      
      // Alignment - vertical always middle
      // Horizontal: center for percentage columns (6-17), left for others
      const isPercentageColumn = colNumber >= 6 && colNumber <= 17;
      cell.alignment = {
        horizontal: isPercentageColumn ? "center" : "left",
        vertical: "middle",
        wrapText: true,
      };
      
      // Border
      cell.border = {
        top: { style: "thin", color: { argb: "FFD1D5DB" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } },
      };
    });
  });

  // Apply merges for customer and contract columns
  rowsData.forEach((row) => {
    // Customer column merge (column B = 2)
    if (row.isFirstCustomerRow && row.customerRowSpan > 1) {
      ws.mergeCells(
        row.customerRowStart + 1, 2,
        row.customerRowStart + row.customerRowSpan, 2
      );
    }

    // Contract column merge (column C = 3)
    if (row.isFirstContractRow && row.contractRowSpan > 1) {
      ws.mergeCells(
        row.contractRowStart + 1, 3,
        row.contractRowStart + row.contractRowSpan, 3
      );
    }
  });

  // After merging, reapply alignment to merged cells
  rowsData.forEach((row) => {
    if (row.isFirstCustomerRow && row.customerRowSpan > 1) {
      const cell = ws.getCell(row.customerRowStart + 1, 2);
      cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    }
    if (row.isFirstContractRow && row.contractRowSpan > 1) {
      const cell = ws.getCell(row.contractRowStart + 1, 3);
      cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    }
  });

  // Apply horizontal month merging based on period
  // Month columns start at column 6 (F = JAN) to column 17 (Q = DES)
  const MONTH_START_COL = 6;
  
  rowsData.forEach((row) => {
    const periodValue = row.periodValue;
    
    // Only merge if period > 1 month
    if (periodValue > 1 && periodValue <= 12) {
      const excelRow = row.excelRowNumber;
      
      // Calculate merge groups
      // For period 3: merge cols 6-8 (JAN-MAR), 9-11 (APR-JUN), 12-14 (JUL-SEP), 15-17 (OKT-DES)
      for (let startMonth = 1; startMonth <= 12; startMonth += periodValue) {
        const endMonth = Math.min(startMonth + periodValue - 1, 12);
        
        if (endMonth > startMonth) {
          const startCol = MONTH_START_COL + startMonth - 1;
          const endCol = MONTH_START_COL + endMonth - 1;
          
          // Merge the cells
          ws.mergeCells(excelRow, startCol, excelRow, endCol);
          
          // Reapply styling to merged cell
          const mergedCell = ws.getCell(excelRow, startCol);
          mergedCell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
        }
      }
    }
  });

  // Generate buffer and download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Legacy function kept for compatibility - now uses xlsx
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function generateExcelTable(_data: CustomerWithAreas[]): string {
  // This function is no longer used but kept for backward compatibility
  // The actual export now uses xlsx library directly
  return "";
}

// Export to Excel using proper xlsx format
export async function exportToExcel(
  data: CustomerWithAreas[],
  options: ExportOptions
): Promise<void> {
  // Filter data if customerName is specified
  const filteredData = options.customerName
    ? data.filter((c) => c.name === options.customerName)
    : data;

  const customerPart = options.customerName
    ? `_${options.customerName.replace(/[^a-zA-Z0-9]/g, "_")}`
    : "";
  const filename = `BAPP_Report${customerPart}_TA_${options.year}_${formatExportDate()}.xlsx`;
  
  await generateExcelFile(filteredData, filename);
}

// Export single customer to Excel
export async function exportCustomerToExcel(
  customer: CustomerWithAreas,
  year: number
): Promise<void> {
  const customerName = customer.name.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `BAPP_Report_${customerName}_TA_${year}_${formatExportDate()}.xlsx`;
  
  await generateExcelFile([customer], filename);
}

// Download file helper (for text exports)
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

// Generate summary report data
export function generateSummaryReport(
  data: CustomerWithAreas[]
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

  lines.push("=".repeat(60));
  lines.push(`LAPORAN PROGRESS KONTRAK`);
  lines.push("=".repeat(60));
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

  lines.push("=".repeat(60));
  lines.push(`Laporan dibuat: ${new Date().toLocaleString("id-ID")}`);
  lines.push("=".repeat(60));

  return lines.join("\n");
}

// Generate TXT export content
export function generateTxtData(
  data: CustomerWithAreas[],
  options: ExportOptions
): string {
  const lines: string[] = [];
  
  lines.push("=".repeat(80));
  lines.push(`LAPORAN BAPP - TAHUN ${options.year}`);
  if (options.customerName) {
    lines.push(`Customer: ${options.customerName}`);
  }
  lines.push(`Tanggal Export: ${new Date().toLocaleString("id-ID")}`);
  lines.push("=".repeat(80));
  lines.push("");

  let rowNumber = 0;

  data.forEach((customer) => {
    lines.push("-".repeat(80));
    lines.push(`CUSTOMER: ${customer.name}`);
    lines.push("-".repeat(80));

    customer.areas.forEach((area) => {
      area.contracts.forEach((contract) => {
        rowNumber++;
        lines.push("");
        lines.push(`[${rowNumber}] ${contract.name}${contract.notes ? ` (${contract.notes})` : ""}`);
        lines.push(`    Area    : ${area.name}`);
        lines.push(`    Periode : ${contract.period}`);
        lines.push(`    TTD     : ${contract.total_signatures} tanda tangan`);
        lines.push("");
        lines.push(`    Progress Bulanan:`);
        
        MONTH_NAMES.forEach((monthName, monthIndex) => {
          const progress = contract.monthly_progress.find(
            (mp) => mp.month === monthIndex + 1
          );
          const percent = progress ? `${progress.percentage}%` : "-";
          const status = 
            !progress ? "     " :
            progress.percentage === 100 ? "[✓]" :
            progress.percentage > 0 ? "[○]" : "[✗]";
          lines.push(`      ${monthName.padEnd(3)} : ${status} ${percent.padStart(4)}`);
        });
        lines.push("");
      });
    });
    lines.push("");
  });

  lines.push("=".repeat(80));
  lines.push(`Total Data: ${rowNumber} kontrak`);
  lines.push("=".repeat(80));

  return lines.join("\n");
}

// Export to TXT
export function exportToTxt(
  data: CustomerWithAreas[],
  options: ExportOptions
): void {
  // Filter data if customerName is specified
  const filteredData = options.customerName
    ? data.filter((c) => c.name === options.customerName)
    : data;

  const txt = generateTxtData(filteredData, options);
  const customerPart = options.customerName
    ? `_${options.customerName.replace(/[^a-zA-Z0-9]/g, "_")}`
    : "";
  const filename = `BAPP_Report${customerPart}_TA_${options.year}_${formatExportDate()}.txt`;
  downloadFile(txt, filename, "text/plain;charset=utf-8");
}

// Export single customer to TXT
export function exportCustomerToTxt(
  customer: CustomerWithAreas,
  year: number
): void {
  const options: ExportOptions = {
    format: "txt",
    scope: "customer",
    year,
    customerName: customer.name,
  };
  const txt = generateTxtData([customer], options);
  const customerName = customer.name.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `BAPP_Report_${customerName}_TA_${year}_${formatExportDate()}.txt`;
  downloadFile(txt, filename, "text/plain;charset=utf-8");
}

// Export summary to text (can be printed as PDF)
export function exportSummaryReport(
  data: CustomerWithAreas[],
  year: number
): void {
  const summary = generateSummaryReport(data);
  const lines: string[] = [];

  lines.push("=".repeat(60));
  lines.push(`RINGKASAN LAPORAN BAPP TAHUN ${year}`);
  lines.push("=".repeat(60));
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
  lines.push("=".repeat(60));
  lines.push(`Laporan dibuat: ${new Date().toLocaleString("id-ID")}`);
  lines.push("=".repeat(60));

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
