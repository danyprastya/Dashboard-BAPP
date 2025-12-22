"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { Loader2, Plus, Trash2, Save, AlertCircle } from "lucide-react";
import type { ContractFormData } from "@/types/database";
import {
  createContract,
  updateContract,
  getOrCreateCustomer,
  getOrCreateArea,
  fetchUniqueCustomerNames,
  fetchUniqueAreaNames,
  fetchUniqueContractNames,
} from "@/lib/supabase/data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { showSuccessToast, showErrorToast } from "@/lib/toast";

// Valid invoice types matching database constraint
const INVOICE_TYPES = ["Pusat", "Regional 2", "Regional 3"] as const;
type InvoiceType = (typeof INVOICE_TYPES)[number];

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  initialData?: ContractFormData & { id?: string };
}

interface SignatureInput {
  id: string;
  name: string;
  role: string;
}

export function ContractFormDialog({
  open,
  onOpenChange,
  onSave,
  initialData,
}: ContractFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customer: "",
    area: "",
    name: "",
    invoice_type: "Pusat" as InvoiceType,
    period: "",
    notes: "",
    year: new Date().getFullYear(),
  });
  const [signatures, setSignatures] = useState<SignatureInput[]>([
    { id: "sig-1", name: "", role: "" },
    { id: "sig-2", name: "", role: "" },
  ]);

  // Autocomplete options
  const [customerOptions, setCustomerOptions] = useState<string[]>([]);
  const [areaOptions, setAreaOptions] = useState<string[]>([]);
  const [contractNameOptions, setContractNameOptions] = useState<string[]>([]);

  const isEditMode = !!initialData?.id;

  // Fetch autocomplete options when dialog opens
  useEffect(() => {
    if (open && isSupabaseConfigured()) {
      // Fetch all options in parallel
      Promise.all([
        fetchUniqueCustomerNames(),
        fetchUniqueAreaNames(),
        fetchUniqueContractNames(),
      ]).then(([customers, areas, contracts]) => {
        setCustomerOptions(customers);
        setAreaOptions(areas);
        setContractNameOptions(contracts);
      });
    }
  }, [open]);

  // Initialize form for edit mode
  useEffect(() => {
    if (open && initialData) {
      setFormData({
        customer: initialData.customer_id || "",
        area: initialData.area_id || "",
        name: initialData.name,
        invoice_type: (initialData.invoice_type as InvoiceType) || "Pusat",
        period: initialData.period || "",
        notes: initialData.notes || "",
        year: new Date().getFullYear(),
      });
      setSignatures(
        initialData.signatures.map((sig, idx) => ({
          id: `sig-${idx}`,
          name: sig.name,
          role: sig.role,
        }))
      );
      setError(null);
    } else if (open) {
      // Reset form for new contract
      setFormData({
        customer: "",
        area: "",
        name: "",
        invoice_type: "Pusat",
        period: "",
        notes: "",
        year: new Date().getFullYear(),
      });
      setSignatures([
        { id: "sig-1", name: "", role: "" },
        { id: "sig-2", name: "", role: "" },
      ]);
      setError(null);
    }
  }, [open, initialData]);

  const handleAddSignature = () => {
    const newId = `sig-${Date.now()}`;
    setSignatures([...signatures, { id: newId, name: "", role: "" }]);
  };

  const handleRemoveSignature = (id: string) => {
    if (signatures.length > 1) {
      setSignatures(signatures.filter((s) => s.id !== id));
    }
  };

  const handleSignatureChange = (
    id: string,
    field: "name" | "role",
    value: string
  ) => {
    setSignatures(
      signatures.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const validateForm = (): string | null => {
    if (!formData.customer.trim()) {
      return "Nama customer harus diisi";
    }
    if (!formData.name.trim()) {
      return "Nama kontrak harus diisi";
    }
    if (!INVOICE_TYPES.includes(formData.invoice_type)) {
      return "Jenis invoice tidak valid";
    }
    if (formData.year < 2000 || formData.year > 2100) {
      return "Tahun harus antara 2000 dan 2100";
    }
    if (signatures.length === 0) {
      return "Minimal harus ada 1 tanda tangan";
    }
    const validSignatures = signatures.filter((s) => s.name.trim());
    if (validSignatures.length === 0) {
      return "Minimal harus ada 1 tanda tangan dengan nama yang diisi";
    }
    return null;
  };

  const handleSave = async () => {
    setError(null);

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      showErrorToast(validationError, "Validasi Gagal");
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      if (isSupabaseConfigured()) {
        // Get or create customer by name
        const customer = await getOrCreateCustomer(formData.customer.trim());
        if (!customer) {
          throw new Error("Gagal membuat/menemukan customer");
        }

        // Get or create area by name under the customer
        const areaName = formData.area.trim() || "Default";
        const area = await getOrCreateArea(customer.id, areaName);
        if (!area) {
          throw new Error("Gagal membuat/menemukan area");
        }

        // Filter out empty signatures and prepare data
        const signaturesList = signatures
          .filter((s) => s.name.trim())
          .map((s) => ({
            name: s.name.trim(),
            role: s.role.trim() || "Pejabat",
          }));

        if (isEditMode && initialData?.id) {
          await updateContract(initialData.id, {
            customer_id: customer.id,
            area_id: area.id,
            name: formData.name.trim(),
            invoice_type: formData.invoice_type,
            period: formData.period.trim(),
            notes: formData.notes.trim() || null,
            year: formData.year,
          });
          showSuccessToast("Kontrak berhasil diperbarui", {
            description: `${formData.name} telah disimpan`,
          });
        } else {
          await createContract(
            {
              customer_id: customer.id,
              area_id: area.id,
              name: formData.name.trim(),
              invoice_type: formData.invoice_type,
              period: formData.period.trim(),
              notes: formData.notes.trim() || undefined,
              year: formData.year,
            },
            signaturesList
          );
          showSuccessToast("Kontrak berhasil ditambahkan", {
            description: `${formData.name} untuk ${formData.customer}`,
          });
        }
      } else {
        // Simulate delay for placeholder mode
        await new Promise((resolve) => setTimeout(resolve, 500));
        showSuccessToast("Mode Demo: Kontrak tersimpan", {
          description: "Perubahan tidak akan disimpan secara permanen",
        });
      }

      onSave();
      onOpenChange(false);
    } catch (err) {
      console.error("Error saving contract:", err);
      showErrorToast(err, "Gagal Menyimpan Kontrak");
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isValid =
    formData.customer.trim() &&
    formData.name.trim() &&
    signatures.some((s) => s.name.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {isEditMode ? "Edit Kontrak" : "Tambah Kontrak Baru"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isEditMode
              ? "Edit informasi kontrak dan tanda tangan"
              : "Masukkan informasi kontrak dan konfigurasi tanda tangan"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          {/* Customer - Autocomplete Input */}
          <div className="space-y-2">
            <Label htmlFor="customer">
              Customer <span className="text-destructive">*</span>
            </Label>
            <AutocompleteInput
              id="customer"
              placeholder="Ketik atau pilih customer..."
              value={formData.customer}
              onChange={(value) =>
                setFormData({ ...formData, customer: value })
              }
              options={customerOptions}
              emptyMessage="Customer baru akan dibuat"
            />
            <p className="text-xs text-muted-foreground">
              Pilih dari daftar atau ketik nama baru
            </p>
          </div>

          {/* Area - Autocomplete Input */}
          <div className="space-y-2">
            <Label htmlFor="area">Area</Label>
            <AutocompleteInput
              id="area"
              placeholder="Ketik atau pilih area..."
              value={formData.area}
              onChange={(value) => setFormData({ ...formData, area: value })}
              options={areaOptions}
              emptyMessage="Area baru akan dibuat"
            />
            <p className="text-xs text-muted-foreground">
              Kosongkan untuk menggunakan area &quot;Default&quot;
            </p>
          </div>

          {/* Contract Name - Autocomplete Input */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nama Kontrak <span className="text-destructive">*</span>
            </Label>
            <AutocompleteInput
              id="name"
              placeholder="Ketik atau pilih nama kontrak..."
              value={formData.name}
              onChange={(value) => setFormData({ ...formData, name: value })}
              options={contractNameOptions}
              emptyMessage="Nama kontrak baru"
            />
            <p className="text-xs text-muted-foreground">
              Pilih nama yang sama untuk mengelompokkan kontrak
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Invoice Type - Select Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="invoice-type">
                Jenis Invoice <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.invoice_type}
                onValueChange={(value: InvoiceType) =>
                  setFormData({ ...formData, invoice_type: value })
                }
              >
                <SelectTrigger id="invoice-type">
                  <SelectValue placeholder="Pilih jenis" />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year - Number Input */}
            <div className="space-y-2">
              <Label htmlFor="year">
                Tahun <span className="text-destructive">*</span>
              </Label>
              <Input
                id="year"
                type="number"
                min={2000}
                max={2100}
                value={formData.year}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    year: parseInt(e.target.value) || new Date().getFullYear(),
                  })
                }
              />
            </div>
          </div>

          {/* Period - Text Input */}
          <div className="space-y-2">
            <Label htmlFor="period">Periode</Label>
            <Input
              id="period"
              placeholder="Contoh: 1 Bulan, Triwulan, dll"
              value={formData.period}
              onChange={(e) =>
                setFormData({ ...formData, period: e.target.value })
              }
            />
          </div>

          {/* Notes - Textarea */}
          <div className="space-y-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea
              id="notes"
              placeholder="Catatan tambahan (opsional)"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
            />
          </div>

          <Separator />

          {/* Signatures Configuration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">
                Konfigurasi Tanda Tangan ({signatures.length}){" "}
                <span className="text-destructive">*</span>
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSignature}
              >
                <Plus className="mr-1 h-3 w-3" />
                Tambah
              </Button>
            </div>

            <div className="space-y-3">
              {signatures.map((sig, index) => (
                <div
                  key={sig.id}
                  className="flex items-start gap-2 rounded-md border p-3"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <Input
                        placeholder="Nama pejabat *"
                        value={sig.name}
                        onChange={(e) =>
                          handleSignatureChange(sig.id, "name", e.target.value)
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="ml-8">
                      <Input
                        placeholder="Jabatan (contoh: Pejabat Pembuat Komitmen)"
                        value={sig.role}
                        onChange={(e) =>
                          handleSignatureChange(sig.id, "role", e.target.value)
                        }
                        className="h-8"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSignature(sig.id)}
                    disabled={signatures.length <= 1}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Progress = (TTD selesai + Upload) / (
              {signatures.filter((s) => s.name.trim()).length || 1} TTD + 1
              Upload) × 100%
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Batal
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !isValid}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {isEditMode ? "Update" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
