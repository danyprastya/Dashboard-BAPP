// Utility functions for file preview from various cloud storage services

export interface FilePreviewError {
  code: "folder_link" | "not_shared" | "invalid_format" | "unknown";
  message: string;
  suggestion: string;
}

export interface FilePreviewInfo {
  type: "google-drive" | "google-docs" | "google-folder" | "onedrive" | "dropbox" | "direct" | "unknown";
  previewUrl: string | null;
  downloadUrl: string | null;
  canEmbed: boolean;
  originalUrl: string;
  error?: FilePreviewError;
}

// Google Drive folder for BAPP uploads
export const BAPP_UPLOAD_FOLDER_URL = "https://drive.google.com/drive/folders/1gV42SqS99fhJEg19yQv6-64cxzJViPq5?usp=sharing";

/**
 * Check if URL is a Google Drive folder link (common mistake)
 */
function isGoogleDriveFolder(url: string): boolean {
  return url.includes("/folders/") || url.includes("drive.google.com/drive/folders");
}

/**
 * Extract Google Drive file ID from various URL formats
 */
function extractGoogleDriveFileId(url: string): string | null {
  // Format: https://drive.google.com/file/d/FILE_ID/view
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];

  // Format: https://drive.google.com/open?id=FILE_ID
  const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return openMatch[1];

  // Format: https://docs.google.com/document/d/FILE_ID/edit
  const docsMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (docsMatch) return docsMatch[1];

  return null;
}

/**
 * Detect Google Docs/Sheets/Slides type
 */
function detectGoogleDocsType(url: string): "document" | "spreadsheets" | "presentation" | "file" {
  if (url.includes("docs.google.com/document")) return "document";
  if (url.includes("docs.google.com/spreadsheets")) return "spreadsheets";
  if (url.includes("docs.google.com/presentation")) return "presentation";
  return "file";
}

/**
 * Extract OneDrive/SharePoint embed info
 */
function extractOneDriveInfo(url: string): { previewUrl: string | null; canEmbed: boolean } {
  // OneDrive share links can be converted to embed
  // Format: https://onedrive.live.com/embed?...
  if (url.includes("onedrive.live.com") || url.includes("1drv.ms")) {
    // Try to convert share link to embed
    if (url.includes("/embed?")) {
      return { previewUrl: url, canEmbed: true };
    }
    // For regular share links, we can try to modify to embed
    const embedUrl = url.replace("/view", "/embed").replace("view.aspx", "embed");
    return { previewUrl: embedUrl, canEmbed: true };
  }
  return { previewUrl: null, canEmbed: false };
}

/**
 * Extract Dropbox preview info
 */
function extractDropboxInfo(url: string): { previewUrl: string | null; canEmbed: boolean } {
  // Dropbox links: change dl=0 to dl=1 for raw file, or use raw=1 param
  if (url.includes("dropbox.com")) {
    // For preview, we need to use the embedded viewer
    // Change www.dropbox.com to www.dropbox.com/s/... format
    let previewUrl = url.replace("?dl=0", "?raw=1").replace("?dl=1", "?raw=1");
    if (!previewUrl.includes("?")) {
      previewUrl += "?raw=1";
    }
    return { previewUrl, canEmbed: true };
  }
  return { previewUrl: null, canEmbed: false };
}

/**
 * Check if URL is a direct file link (image, PDF, etc.)
 */
function isDirectFileLink(url: string): boolean {
  const directExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
  const lowerUrl = url.toLowerCase();
  return directExtensions.some((ext) => lowerUrl.includes(ext));
}

/**
 * Parse any file URL and return preview information
 */
export function parseFileUrl(url: string): FilePreviewInfo {
  if (!url || typeof url !== "string") {
    return {
      type: "unknown",
      previewUrl: null,
      downloadUrl: null,
      canEmbed: false,
      originalUrl: url || "",
    };
  }

  const trimmedUrl = url.trim();

  // Check for Google Drive folder link (common error)
  if (isGoogleDriveFolder(trimmedUrl)) {
    return {
      type: "google-folder",
      previewUrl: null,
      downloadUrl: null,
      canEmbed: false,
      originalUrl: trimmedUrl,
      error: {
        code: "folder_link",
        message: "Link tidak valid",
        suggestion: "Periksa kembali URL dan pastikan link merujuk ke file bukan folder dari file tersebut.",
      },
    };
  }

  // Google Drive file
  if (trimmedUrl.includes("drive.google.com")) {
    const fileId = extractGoogleDriveFileId(trimmedUrl);
    if (fileId) {
      return {
        type: "google-drive",
        previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
        canEmbed: true,
        originalUrl: trimmedUrl,
      };
    }
  }

  // Google Docs/Sheets/Slides
  if (trimmedUrl.includes("docs.google.com")) {
    const fileId = extractGoogleDriveFileId(trimmedUrl);
    const docType = detectGoogleDocsType(trimmedUrl);
    if (fileId) {
      return {
        type: "google-docs",
        previewUrl: `https://docs.google.com/${docType}/d/${fileId}/preview`,
        downloadUrl: `https://docs.google.com/${docType}/d/${fileId}/export?format=pdf`,
        canEmbed: true,
        originalUrl: trimmedUrl,
      };
    }
  }

  // OneDrive
  if (trimmedUrl.includes("onedrive.live.com") || trimmedUrl.includes("1drv.ms") || trimmedUrl.includes("sharepoint.com")) {
    const oneDriveInfo = extractOneDriveInfo(trimmedUrl);
    return {
      type: "onedrive",
      previewUrl: oneDriveInfo.previewUrl,
      downloadUrl: null,
      canEmbed: oneDriveInfo.canEmbed,
      originalUrl: trimmedUrl,
    };
  }

  // Dropbox
  if (trimmedUrl.includes("dropbox.com")) {
    const dropboxInfo = extractDropboxInfo(trimmedUrl);
    return {
      type: "dropbox",
      previewUrl: dropboxInfo.previewUrl,
      downloadUrl: dropboxInfo.previewUrl,
      canEmbed: dropboxInfo.canEmbed,
      originalUrl: trimmedUrl,
    };
  }

  // Direct file link
  if (isDirectFileLink(trimmedUrl)) {
    return {
      type: "direct",
      previewUrl: trimmedUrl,
      downloadUrl: trimmedUrl,
      canEmbed: true,
      originalUrl: trimmedUrl,
    };
  }

  // Unknown - can still try to open in new tab
  return {
    type: "unknown",
    previewUrl: null,
    downloadUrl: null,
    canEmbed: false,
    originalUrl: trimmedUrl,
  };
}

/**
 * Get icon name based on file type
 */
export function getFileTypeIcon(url: string): "file" | "file-text" | "image" | "table" | "presentation" {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes("spreadsheet") || lowerUrl.includes(".xlsx") || lowerUrl.includes(".xls")) {
    return "table";
  }
  if (lowerUrl.includes("presentation") || lowerUrl.includes(".pptx") || lowerUrl.includes(".ppt")) {
    return "presentation";
  }
  if (lowerUrl.includes(".jpg") || lowerUrl.includes(".jpeg") || lowerUrl.includes(".png") || lowerUrl.includes(".gif")) {
    return "image";
  }
  if (lowerUrl.includes(".pdf") || lowerUrl.includes("document")) {
    return "file-text";
  }
  
  return "file";
}

/**
 * Get provider name for display
 */
export function getProviderName(type: FilePreviewInfo["type"]): string {
  switch (type) {
    case "google-drive":
      return "Google Drive";
    case "google-docs":
      return "Google Docs";
    case "google-folder":
      return "Google Drive Folder";
    case "onedrive":
      return "OneDrive";
    case "dropbox":
      return "Dropbox";
    case "direct":
      return "Direct Link";
    default:
      return "External Link";
  }
}

/**
 * Generate suggested filename for BAPP documents
 * Format: Customer-Contract-Area-Year-PerXBulan-Month.pdf
 */
export function generateBAPPFilename(
  customerName: string,
  contractName: string,
  areaName: string | null,
  year: number,
  periodMonths: number,
  month: number
): string {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  
  // Clean up names - keep spaces for readability
  const cleanCustomer = customerName.trim();
  const cleanContract = contractName.trim();
  const cleanArea = areaName ? areaName.trim() : "";
  
  // Format period
  const periodLabel = `Per${periodMonths}Bulan`;
  
  // Format month
  const monthLabel = monthNames[month - 1];
  
  // Build filename with hyphen separator
  const parts = [cleanCustomer, cleanContract];
  if (cleanArea) parts.push(cleanArea);
  parts.push(String(year), periodLabel, monthLabel);
  
  return parts.join("-") + ".pdf";
}
