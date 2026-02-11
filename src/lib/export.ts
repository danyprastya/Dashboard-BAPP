// Export functionality for Excel and Text
import type { CustomerWithAreas, ContractWithProgress } from "@/types/database";
import { MONTH_NAMES, MONTH_NAMES_FULL } from "@/types/database";

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

// Generate Excel-compatible HTML table that matches dashboard layout with merged cells
export function generateExcelTable(
  data: CustomerWithAreas[]
): string {
  // First, build flat row data with merge info
  interface RowData {
    rowNumber: number;
    customer: string;
    contract: string;
    area: string;
    period: string;
    monthlyData: string[];
    // Merge info
    customerMergeDown: number;
    contractMergeDown: number;
    skipCustomer: boolean;
    skipContract: boolean;
  }
  
  const rowsData: RowData[] = [];
  let rowNumber = 0;

  // Calculate merge spans
  data.forEach((customer) => {
    // Count total contracts for this customer
    let customerContractCount = 0;
    customer.areas.forEach((area) => {
      customerContractCount += area.contracts.length;
    });

    // Group contracts by name across all areas
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

    let isFirstCustomerRow = true;
    
    contractGroups.forEach((contractItems, contractKey) => {
      let isFirstContractRow = true;
      
      contractItems.forEach(({ contract, area }) => {
        rowNumber++;
        
        const monthlyData = MONTH_NAMES.map((_, monthIndex) => {
          const progress = contract.monthly_progress.find(
            (mp) => mp.month === monthIndex + 1
          );
          return progress ? `${progress.percentage}%` : "-";
        });

        rowsData.push({
          rowNumber,
          customer: customer.name,
          contract: contractKey,
          area,
          period: contract.period,
          monthlyData,
          customerMergeDown: isFirstCustomerRow ? customerContractCount - 1 : 0,
          contractMergeDown: isFirstContractRow ? contractItems.length - 1 : 0,
          skipCustomer: !isFirstCustomerRow,
          skipContract: !isFirstContractRow,
        });

        isFirstCustomerRow = false;
        isFirstContractRow = false;
      });
    });
  });
  
  // Header row
  const headers = [
    "NO",
    "CUSTOMER",
    "NAMA KONTRAK",
    "AREA",
    "PERIODE",
    ...MONTH_NAMES,
  ];

  // Generate HTML table for Excel
  let html = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
  <Style ss:ID="Header">
    <Font ss:Bold="1"/>
    <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
    <Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
    </Borders>
  </Style>
  <Style ss:ID="Cell">
    <Alignment ss:Vertical="Center" ss:WrapText="1"/>
    <Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
    </Borders>
  </Style>
  <Style ss:ID="CellCenter">
    <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    <Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
    </Borders>
  </Style>
  <Style ss:ID="CellMerge">
    <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
    <Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
    </Borders>
  </Style>
  <Style ss:ID="Progress100">
    <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    <Interior ss:Color="#22C55E" ss:Pattern="Solid"/>
    <Font ss:Color="#FFFFFF"/>
    <Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
    </Borders>
  </Style>
  <Style ss:ID="Progress75">
    <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    <Interior ss:Color="#86EFAC" ss:Pattern="Solid"/>
    <Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
    </Borders>
  </Style>
  <Style ss:ID="Progress50">
    <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    <Interior ss:Color="#FDE047" ss:Pattern="Solid"/>
    <Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
    </Borders>
  </Style>
  <Style ss:ID="Progress25">
    <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    <Interior ss:Color="#FED7AA" ss:Pattern="Solid"/>
    <Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
    </Borders>
  </Style>
  <Style ss:ID="Progress0">
    <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    <Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/>
    <Font ss:Color="#9CA3AF"/>
    <Borders>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
    </Borders>
  </Style>
</Styles>
<Worksheet ss:Name="BAPP Report">
<Table>
`;

  // Add column widths
  html += `<Column ss:Width="40"/>`;  // NO
  html += `<Column ss:Width="150"/>`; // CUSTOMER
  html += `<Column ss:Width="250"/>`; // NAMA KONTRAK
  html += `<Column ss:Width="150"/>`; // AREA
  html += `<Column ss:Width="100"/>`; // PERIODE
  for (let i = 0; i < 12; i++) {
    html += `<Column ss:Width="60"/>`; // Month columns
  }

  // Header row
  html += `<Row ss:Height="30">`;
  headers.forEach((cell) => {
    html += `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`;
  });
  html += `</Row>`;

  // Data rows with merging
  rowsData.forEach((row) => {
    html += `<Row ss:Height="40">`;
    
    // NO column
    html += `<Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${row.rowNumber}</Data></Cell>`;
    
    // CUSTOMER column (with merge)
    if (!row.skipCustomer) {
      const mergeAttr = row.customerMergeDown > 0 ? ` ss:MergeDown="${row.customerMergeDown}"` : "";
      html += `<Cell ss:StyleID="CellMerge"${mergeAttr}><Data ss:Type="String">${escapeXml(row.customer)}</Data></Cell>`;
    }
    
    // NAMA KONTRAK column (with merge)
    if (!row.skipContract) {
      const mergeAttr = row.contractMergeDown > 0 ? ` ss:MergeDown="${row.contractMergeDown}"` : "";
      html += `<Cell ss:StyleID="CellMerge"${mergeAttr}><Data ss:Type="String">${escapeXml(row.contract)}</Data></Cell>`;
    }
    
    // Set index for next cells (need to skip merged cells)
    if (row.skipCustomer && row.skipContract) {
      html += `<Cell ss:Index="4" ss:StyleID="Cell"><Data ss:Type="String">${escapeXml(row.area)}</Data></Cell>`;
    } else if (row.skipCustomer) {
      html += `<Cell ss:Index="3" ss:StyleID="CellMerge"${row.contractMergeDown > 0 ? ` ss:MergeDown="${row.contractMergeDown}"` : ""}><Data ss:Type="String">${escapeXml(row.contract)}</Data></Cell>`;
      html += `<Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeXml(row.area)}</Data></Cell>`;
    } else if (row.skipContract) {
      html += `<Cell ss:Index="4" ss:StyleID="Cell"><Data ss:Type="String">${escapeXml(row.area)}</Data></Cell>`;
    } else {
      // AREA column (no merge)
      html += `<Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeXml(row.area)}</Data></Cell>`;
    }
    
    // PERIODE column
    html += `<Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(row.period)}</Data></Cell>`;
    
    // Month columns
    row.monthlyData.forEach((value) => {
      const percent = parseInt(value.replace("%", "")) || 0;
      let styleId = "Progress0";
      if (percent === 100) styleId = "Progress100";
      else if (percent >= 75) styleId = "Progress75";
      else if (percent >= 50) styleId = "Progress50";
      else if (percent >= 25) styleId = "Progress25";
      else if (percent > 0) styleId = "Progress25";
      
      html += `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
    });
    
    html += `</Row>`;
  });

  html += `</Table>
</Worksheet>
</Workbook>`;

  return html;
}

// Escape XML special characters
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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

// Export to Excel (XML SpreadsheetML format)
export function exportToExcel(
  data: CustomerWithAreas[],
  options: ExportOptions
): void {
  // Filter data if customerName is specified
  const filteredData = options.customerName
    ? data.filter((c) => c.name === options.customerName)
    : data;

  const xml = generateExcelTable(filteredData);
  const customerPart = options.customerName
    ? `_${options.customerName.replace(/[^a-zA-Z0-9]/g, "_")}`
    : "";
  const filename = `BAPP Report${customerPart}_${options.year}_${formatExportDate()}.xls`;
  downloadFile(xml, filename, "application/vnd.ms-excel");
}

// Export single customer to Excel
export function exportCustomerToExcel(
  customer: CustomerWithAreas,
  year: number
): void {
  const xml = generateExcelTable([customer]);
  const customerName = customer.name.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `BAPP Report_${customerName}_${year}_${formatExportDate()}.xls`;
  downloadFile(xml, filename, "application/vnd.ms-excel");
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
  const filename = `BAPP Report${customerPart}_${options.year}_${formatExportDate()}.txt`;
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
  const filename = `BAPP Report_${customerName}_${year}_${formatExportDate()}.txt`;
  downloadFile(txt, filename, "text/plain;charset=utf-8");
}

// Export summary to text (can be printed as PDF)
export function exportSummaryReport(
  data: CustomerWithAreas[],
  year: number
): void {
  const summary = generateSummaryReport(data);
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
