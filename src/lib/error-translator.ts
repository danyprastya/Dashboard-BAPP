// Error message translator - converts database errors to user-friendly Indonesian messages

interface ErrorTranslation {
  pattern: RegExp;
  message: string;
  code?: string;
}

const errorTranslations: ErrorTranslation[] = [
  // Unique constraint violations
  {
    pattern: /duplicate key value violates unique constraint "areas_customer_id_code_key"/i,
    message: "Area dengan kode yang sama sudah ada untuk customer ini. Silakan gunakan kode area yang berbeda.",
    code: "AREA_DUPLICATE_CODE",
  },
  {
    pattern: /duplicate key value violates unique constraint "customers_name_key"/i,
    message: "Customer dengan nama yang sama sudah ada. Silakan gunakan nama yang berbeda.",
    code: "CUSTOMER_DUPLICATE_NAME",
  },
  {
    pattern: /duplicate key value violates unique constraint/i,
    message: "Data dengan nilai yang sama sudah ada. Silakan periksa dan gunakan nilai yang unik.",
    code: "DUPLICATE_KEY",
  },
  // Foreign key violations
  {
    pattern: /violates foreign key constraint.*customer/i,
    message: "Customer yang dipilih tidak valid atau sudah dihapus.",
    code: "INVALID_CUSTOMER_REF",
  },
  {
    pattern: /violates foreign key constraint.*area/i,
    message: "Area yang dipilih tidak valid atau sudah dihapus.",
    code: "INVALID_AREA_REF",
  },
  {
    pattern: /violates foreign key constraint/i,
    message: "Referensi data tidak valid. Data yang direferensikan mungkin sudah dihapus.",
    code: "INVALID_FOREIGN_KEY",
  },
  // Check constraint violations
  {
    pattern: /violates check constraint.*invoice_type/i,
    message: "Jenis invoice tidak valid. Pilih salah satu: Pusat, Regional 2, atau Regional 3.",
    code: "INVALID_INVOICE_TYPE",
  },
  {
    pattern: /violates check constraint/i,
    message: "Data yang dimasukkan tidak memenuhi aturan validasi.",
    code: "CHECK_CONSTRAINT",
  },
  // Not null violations
  {
    pattern: /null value in column "([^"]+)" violates not-null constraint/i,
    message: "Field $1 wajib diisi dan tidak boleh kosong.",
    code: "REQUIRED_FIELD",
  },
  // Authentication errors
  {
    pattern: /invalid login credentials/i,
    message: "Email atau password salah. Silakan periksa kembali.",
    code: "INVALID_CREDENTIALS",
  },
  {
    pattern: /email not confirmed/i,
    message: "Email belum diverifikasi. Silakan cek inbox email Anda.",
    code: "EMAIL_NOT_CONFIRMED",
  },
  {
    pattern: /user not found/i,
    message: "Pengguna tidak ditemukan.",
    code: "USER_NOT_FOUND",
  },
  // Network errors
  {
    pattern: /network|fetch|connection|timeout/i,
    message: "Gagal terhubung ke server. Periksa koneksi internet Anda.",
    code: "NETWORK_ERROR",
  },
  // Permission errors
  {
    pattern: /permission denied|not authorized|unauthorized/i,
    message: "Anda tidak memiliki izin untuk melakukan tindakan ini.",
    code: "PERMISSION_DENIED",
  },
  // Row not found
  {
    pattern: /no rows returned/i,
    message: "Data tidak ditemukan.",
    code: "NOT_FOUND",
  },
  // Generic database errors
  {
    pattern: /database|postgres|supabase/i,
    message: "Terjadi kesalahan pada database. Silakan coba lagi.",
    code: "DATABASE_ERROR",
  },
];

export interface TranslatedError {
  message: string;
  code?: string;
  originalMessage: string;
}

/**
 * Translates a database or API error message to user-friendly Indonesian
 */
export function translateError(error: unknown): TranslatedError {
  // Extract error message
  let originalMessage: string;
  
  if (error instanceof Error) {
    originalMessage = error.message;
  } else if (typeof error === "string") {
    originalMessage = error;
  } else if (error && typeof error === "object" && "message" in error) {
    originalMessage = String((error as { message: unknown }).message);
  } else {
    originalMessage = "Unknown error";
  }

  // Try to match against known patterns
  for (const translation of errorTranslations) {
    const match = originalMessage.match(translation.pattern);
    if (match) {
      // Replace placeholders like $1 with captured groups
      let message = translation.message;
      if (match.length > 1) {
        for (let i = 1; i < match.length; i++) {
          message = message.replace(`$${i}`, match[i]);
        }
      }
      return {
        message,
        code: translation.code,
        originalMessage,
      };
    }
  }

  // Default fallback
  return {
    message: "Terjadi kesalahan. Silakan coba lagi atau hubungi administrator.",
    originalMessage,
  };
}

/**
 * Creates a formatted error message with optional code
 */
export function formatErrorForDisplay(translated: TranslatedError): string {
  if (translated.code) {
    return `${translated.message} (Kode: ${translated.code})`;
  }
  return translated.message;
}
