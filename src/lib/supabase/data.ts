import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import type {
  Customer,
  Area,
  BAPPContract,
  CustomerWithAreas,
  ContractWithProgress,
  ContractSummary,
  MonthlyProgressDetail,
  SignatureDetail,
  UserProfile,
} from "@/types/database";
import { isHalfMonthPeriod } from "@/types/database";

// ===================
// FETCH FUNCTIONS
// ===================

export async function fetchCustomers(): Promise<Customer[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching customers:", error);
    return [];
  }

  return data || [];
}

export async function fetchCustomersWithAreas(): Promise<CustomerWithAreas[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("*")
    .order("name");

  if (customersError) {
    console.error("Error fetching customers:", customersError);
    return [];
  }

  const { data: areas, error: areasError } = await supabase
    .from("areas")
    .select("*")
    .order("code");

  if (areasError) {
    console.error("Error fetching areas:", areasError);
    return [];
  }

  // Build customers with areas (without contracts for the form dropdown)
  return (customers || []).map((customer) => ({
    ...customer,
    areas: (areas || [])
      .filter((area) => area.customer_id === customer.id)
      .map((area) => ({
        ...area,
        contracts: [],
      })),
  }));
}

export async function fetchAreas(customerId?: string): Promise<Area[]> {
  const supabase = createClient();
  if (!supabase) return [];

  let query = supabase.from("areas").select("*").order("code");

  if (customerId) {
    query = query.eq("customer_id", customerId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching areas:", error);
    return [];
  }

  return data || [];
}

export async function fetchUniqueContractNames(): Promise<string[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("bapp_contracts")
    .select("name")
    .order("name");

  if (error) {
    console.error("Error fetching contract names:", error);
    return [];
  }

  // Get unique names
  const uniqueNames = [...new Set((data || []).map((c) => c.name))];
  return uniqueNames;
}

export async function fetchUniqueAreaNames(): Promise<string[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("areas")
    .select("name")
    .order("name");

  if (error) {
    console.error("Error fetching area names:", error);
    return [];
  }

  // Get unique names
  const uniqueNames = [...new Set((data || []).map((a) => a.name))];
  return uniqueNames;
}

export async function fetchUniqueCustomerNames(): Promise<string[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("customers")
    .select("name")
    .order("name");

  if (error) {
    console.error("Error fetching customer names:", error);
    return [];
  }

  return (data || []).map((c) => c.name);
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }

  return data;
}

export async function fetchDashboardData(year: number): Promise<CustomerWithAreas[]> {
  const supabase = createClient();
  if (!supabase) return [];

  // OPTIMIZED: Fetch all data in parallel using Promise.all
  const [customersResult, areasResult, contractsResult] = await Promise.all([
    supabase.from("customers").select("*").order("name"),
    supabase.from("areas").select("*").order("code"),
    supabase.from("bapp_contracts").select("*").eq("year", year).order("name"),
  ]);

  if (customersResult.error) {
    console.error("Error fetching customers:", customersResult.error);
    return [];
  }
  if (areasResult.error) {
    console.error("Error fetching areas:", areasResult.error);
    return [];
  }
  if (contractsResult.error) {
    console.error("Error fetching contracts:", contractsResult.error);
    return [];
  }

  const customers = customersResult.data || [];
  const areas = areasResult.data || [];
  const contracts = contractsResult.data || [];

  // Early return if no contracts
  if (contracts.length === 0) {
    return [];
  }

  // OPTIMIZED: Batch fetch related data in parallel
  const contractIds = contracts.map((c) => c.id);
  
  const [signaturesResult, monthlyProgressResult] = await Promise.all([
    supabase
      .from("signatures")
      .select("*")
      .in("contract_id", contractIds)
      .order("order"),
    supabase
      .from("monthly_progress")
      .select("*")
      .in("contract_id", contractIds)
      .eq("year", year),
  ]);

  if (signaturesResult.error) {
    console.error("Error fetching signatures:", signaturesResult.error);
  }
  if (monthlyProgressResult.error) {
    console.error("Error fetching monthly progress:", monthlyProgressResult.error);
  }

  const signatures = signaturesResult.data || [];
  const monthlyProgress = monthlyProgressResult.data || [];

  // OPTIMIZED: Fetch signature progress only if we have monthly progress
  let signatureProgress: any[] = [];
  if (monthlyProgress.length > 0) {
    const progressIds = monthlyProgress.map((p) => p.id);
    const sigProgressResult = await supabase
      .from("signature_progress")
      .select("*")
      .in("monthly_progress_id", progressIds);

    if (sigProgressResult.error) {
      console.error("Error fetching signature progress:", sigProgressResult.error);
    }
    signatureProgress = sigProgressResult.data || [];
  }

  // OPTIMIZED: Create lookup Maps for O(1) access instead of O(n) array.filter
  const areasByCustomerId = new Map<string, typeof areas>();
  for (const area of areas) {
    if (!areasByCustomerId.has(area.customer_id)) {
      areasByCustomerId.set(area.customer_id, []);
    }
    areasByCustomerId.get(area.customer_id)!.push(area);
  }

  const contractsByKey = new Map<string, typeof contracts>();
  for (const contract of contracts) {
    const key = `${contract.customer_id}_${contract.area_id}`;
    if (!contractsByKey.has(key)) {
      contractsByKey.set(key, []);
    }
    contractsByKey.get(key)!.push(contract);
  }

  const signaturesByContractId = new Map<string, typeof signatures>();
  for (const sig of signatures) {
    if (!signaturesByContractId.has(sig.contract_id)) {
      signaturesByContractId.set(sig.contract_id, []);
    }
    signaturesByContractId.get(sig.contract_id)!.push(sig);
  }

  const progressByContractId = new Map<string, typeof monthlyProgress>();
  for (const prog of monthlyProgress) {
    if (!progressByContractId.has(prog.contract_id)) {
      progressByContractId.set(prog.contract_id, []);
    }
    progressByContractId.get(prog.contract_id)!.push(prog);
  }

  const sigProgressByProgressId = new Map<string, typeof signatureProgress>();
  for (const sp of signatureProgress) {
    if (!sigProgressByProgressId.has(sp.monthly_progress_id)) {
      sigProgressByProgressId.set(sp.monthly_progress_id, []);
    }
    sigProgressByProgressId.get(sp.monthly_progress_id)!.push(sp);
  }

  // Build the hierarchical data structure using Maps
  const result: CustomerWithAreas[] = customers.map((customer) => {
    const customerAreas = areasByCustomerId.get(customer.id) || [];

    const areasWithContracts = customerAreas.map((area) => {
      const key = `${customer.id}_${area.id}`;
      const areaContracts = contractsByKey.get(key) || [];

      const contractsWithProgress: ContractWithProgress[] = areaContracts.map(
        (contract) => {
          const contractSignatures = signaturesByContractId.get(contract.id) || [];
          const contractProgress = progressByContractId.get(contract.id) || [];

          // Check if this contract uses half-month periods
          const isHalfMonth = isHalfMonthPeriod(contract.period);

          // Build monthly progress - 24 items for half-month, 12 for regular
          const monthlyProgressData: MonthlyProgressDetail[] = [];
          
          for (let month = 1; month <= 12; month++) {
            const subPeriods = isHalfMonth ? [1, 2] : [1];
            
            for (const subPeriod of subPeriods) {
              const progress = contractProgress.find(
                (p) => p.month === month && 
                       (p.sub_period === subPeriod || (!isHalfMonth && (p.sub_period === 1 || p.sub_period === undefined)))
              );

              const progressSigProgress = progress 
                ? sigProgressByProgressId.get(progress.id) || []
                : [];

              const signaturesWithStatus: SignatureDetail[] =
                contractSignatures.map((sig) => {
                  const sigProgress = progressSigProgress.find(
                    (sp) => sp.signature_id === sig.id
                  );

                  return {
                    id: sig.id,
                    name: sig.name,
                    role: sig.role,
                    order: sig.order,
                    is_completed: sigProgress?.is_completed || false,
                    completed_at: sigProgress?.completed_at || null,
                  };
                });

              const completedSigs = signaturesWithStatus.filter(
                (s) => s.is_completed
              ).length;
              const isUploadCompleted = progress?.is_upload_completed || false;
              const totalItems = contractSignatures.length + 1;
              const completedItems = completedSigs + (isUploadCompleted ? 1 : 0);
              const percentage =
                totalItems > 0
                  ? Math.round((completedItems / totalItems) * 100)
                  : 0;

              monthlyProgressData.push({
                id: progress?.id || null,
                month,
                year,
                sub_period: subPeriod,
                signatures: signaturesWithStatus,
                is_upload_completed: isUploadCompleted,
                upload_link: progress?.upload_link || null,
                notes: progress?.notes || null,
                notes_updated_at: progress?.notes_updated_at || null,
                updated_at: progress?.updated_at || null,
                percentage,
                total_items: totalItems,
                completed_items: completedItems,
              });
            }
          }

          // Calculate yearly status
          const allCompleted = monthlyProgressData.every(
            (m) => m.percentage === 100
          );
          const anyStarted = monthlyProgressData.some((m) => m.percentage > 0);
          const yearlyStatus = allCompleted
            ? "completed"
            : anyStarted
            ? "in_progress"
            : "not_started";

          return {
            id: contract.id,
            customer_id: contract.customer_id,
            area_id: contract.area_id,
            name: contract.name,
            period: contract.period,
            invoice_type: contract.invoice_type,
            notes: contract.notes,
            total_signatures: contractSignatures.length,
            signatures: contractSignatures,
            monthly_progress: monthlyProgressData,
            yearly_status: yearlyStatus as
              | "completed"
              | "in_progress"
              | "not_started",
          };
        }
      );

      return {
        id: area.id,
        name: area.name,
        code: area.code,
        contracts: contractsWithProgress,
      };
    });

    return {
      id: customer.id,
      name: customer.name,
      areas: areasWithContracts,
    };
  });

  // Filter out customers with no contracts
  return result.filter((customer) =>
    customer.areas.some((area) => area.contracts.length > 0)
  );
}

// ===================
// CREATE FUNCTIONS
// ===================

export async function getOrCreateCustomer(name: string): Promise<Customer | null> {
  const supabase = createClient();
  if (!supabase) return null;

  // First, try to find existing customer by name (case-insensitive)
  const { data: existing, error: findError } = await supabase
    .from("customers")
    .select("*")
    .ilike("name", name.trim())
    .maybeSingle();

  if (findError) {
    console.error("Error finding customer:", findError);
    throw new Error(findError.message);
  }

  if (existing) {
    return existing;
  }

  // Create new customer if not found
  const { data, error } = await supabase
    .from("customers")
    .insert({ name: name.trim() })
    .select()
    .single();

  if (error) {
    console.error("Error creating customer:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function getOrCreateArea(
  customerId: string,
  name: string
): Promise<Area | null> {
  const supabase = createClient();
  if (!supabase) return null;

  // First, try to find existing area by name under this customer (case-insensitive)
  const { data: existing, error: findError } = await supabase
    .from("areas")
    .select("*")
    .eq("customer_id", customerId)
    .ilike("name", name.trim())
    .maybeSingle();

  if (findError) {
    console.error("Error finding area:", findError);
    throw new Error(findError.message);
  }

  if (existing) {
    return existing;
  }

  // Generate a unique code from name + timestamp to avoid collisions
  const baseCode = name.trim().substring(0, 8).toUpperCase().replace(/\s+/g, "_");
  const uniqueSuffix = Date.now().toString(36).toUpperCase().slice(-4);
  const code = `${baseCode}_${uniqueSuffix}`;
  
  const { data, error } = await supabase
    .from("areas")
    .insert({ customer_id: customerId, name: name.trim(), code })
    .select()
    .single();

  if (error) {
    console.error("Error creating area:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function createCustomer(name: string): Promise<Customer | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("customers")
    .insert({ name })
    .select()
    .single();

  if (error) {
    console.error("Error creating customer:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function createArea(
  customerId: string,
  name: string,
  code: string
): Promise<Area | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("areas")
    .insert({ customer_id: customerId, name, code })
    .select()
    .single();

  if (error) {
    console.error("Error creating area:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function createContract(
  contractData: {
    customer_id: string;
    area_id: string;
    name: string;
    period: string;
    invoice_type: string;
    notes?: string;
    year: number;
  },
  signatures: { name: string; role: string }[]
): Promise<BAPPContract | null> {
  const supabase = createClient();
  if (!supabase) return null;

  // Create the contract
  const { data: contract, error: contractError } = await supabase
    .from("bapp_contracts")
    .insert({
      customer_id: contractData.customer_id,
      area_id: contractData.area_id,
      name: contractData.name,
      period: contractData.period,
      invoice_type: contractData.invoice_type,
      notes: contractData.notes || null,
      year: contractData.year,
    })
    .select()
    .single();

  if (contractError) {
    console.error("Error creating contract:", contractError);
    logger.error("Gagal membuat kontrak", contractError.message);
    throw new Error(contractError.message);
  }

  // Create signatures
  if (signatures.length > 0) {
    const signaturesData = signatures.map((sig, index) => ({
      contract_id: contract.id,
      name: sig.name,
      role: sig.role,
      order: index + 1,
    }));

    const { error: sigError } = await supabase
      .from("signatures")
      .insert(signaturesData);

    if (sigError) {
      console.error("Error creating signatures:", sigError);
      logger.error("Gagal membuat tanda tangan", sigError.message);
      // Rollback contract creation
      await supabase.from("bapp_contracts").delete().eq("id", contract.id);
      throw new Error(sigError.message);
    }
  }

  logger.success(`Kontrak "${contractData.name}" berhasil dibuat`, `ID: ${contract.id}`);
  return contract;
}

// ===================
// UPDATE FUNCTIONS
// ===================

export async function updateContract(
  contractId: string,
  updates: Partial<BAPPContract>
): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  const { error } = await supabase
    .from("bapp_contracts")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", contractId);

  if (error) {
    console.error("Error updating contract:", error);
    throw new Error(error.message);
  }
}

export async function updateContractSignatures(
  contractId: string,
  signatures: { id?: string; name: string; role: string }[]
): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  // Get existing signatures for this contract
  const { data: existingSignatures, error: fetchError } = await supabase
    .from("signatures")
    .select("id, name, role, order")
    .eq("contract_id", contractId)
    .order("order");

  if (fetchError) {
    console.error("Error fetching existing signatures:", fetchError);
    throw new Error(fetchError.message);
  }

  const existingIds = new Set((existingSignatures || []).map((s) => s.id));
  const newSignatureIds = new Set(signatures.filter((s) => s.id && !s.id.startsWith("sig-new-")).map((s) => s.id));

  // Signatures to delete (exist in DB but not in new list)
  const toDelete = (existingSignatures || []).filter((s) => !newSignatureIds.has(s.id));
  
  // Signatures to update (exist in both, check if changed)
  const toUpdate: { id: string; name: string; role: string; order: number }[] = [];
  
  // Signatures to create (new ones without valid existing ID)
  const toCreate: { contract_id: string; name: string; role: string; order: number }[] = [];

  signatures.forEach((sig, index) => {
    const order = index + 1;
    
    if (sig.id && existingIds.has(sig.id)) {
      // Existing signature - check if needs update
      const existing = existingSignatures?.find((e) => e.id === sig.id);
      if (existing && (existing.name !== sig.name || existing.role !== sig.role || existing.order !== order)) {
        toUpdate.push({
          id: sig.id,
          name: sig.name,
          role: sig.role,
          order,
        });
      }
    } else {
      // New signature
      toCreate.push({
        contract_id: contractId,
        name: sig.name,
        role: sig.role,
        order,
      });
    }
  });

  // Delete removed signatures (this will cascade delete signature_progress due to FK)
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("signatures")
      .delete()
      .in("id", toDelete.map((s) => s.id));

    if (deleteError) {
      console.error("Error deleting signatures:", deleteError);
      throw new Error(deleteError.message);
    }
  }

  // OPTIMIZED: Batch update existing signatures using Promise.all for parallel execution
  if (toUpdate.length > 0) {
    const updatePromises = toUpdate.map((sig) =>
      supabase
        .from("signatures")
        .update({ name: sig.name, role: sig.role, order: sig.order })
        .eq("id", sig.id)
    );
    
    const results = await Promise.all(updatePromises);
    const updateError = results.find((r) => r.error);
    if (updateError?.error) {
      console.error("Error updating signature:", updateError.error);
      throw new Error(updateError.error.message);
    }
  }

  // Create new signatures (already batched)
  if (toCreate.length > 0) {
    const { error: insertError } = await supabase
      .from("signatures")
      .insert(toCreate);

    if (insertError) {
      console.error("Error creating signatures:", insertError);
      throw new Error(insertError.message);
    }
  }
}

export async function updateMonthlyProgress(
  contractId: string,
  month: number,
  year: number,
  uploadLink: string | null,
  isUploadCompleted: boolean,
  notes: string | null,
  signatureStatuses: { signatureId: string; isCompleted: boolean }[],
  subPeriod: number = 1
): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  // Get or create monthly progress record
  let { data: progress } = await supabase
    .from("monthly_progress")
    .select("id")
    .eq("contract_id", contractId)
    .eq("month", month)
    .eq("year", year)
    .eq("sub_period", subPeriod)
    .single();

  if (!progress) {
    // Create new monthly progress
    const { data: newProgress, error: createError } = await supabase
      .from("monthly_progress")
      .insert({
        contract_id: contractId,
        month,
        year,
        sub_period: subPeriod,
        upload_link: uploadLink,
        is_upload_completed: isUploadCompleted,
        notes: notes,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating monthly progress:", createError);
      throw new Error(createError.message);
    }

    progress = newProgress;
  } else {
    // Update existing monthly progress
    const { error: updateError } = await supabase
      .from("monthly_progress")
      .update({
        upload_link: uploadLink,
        is_upload_completed: isUploadCompleted,
        notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", progress.id);

    if (updateError) {
      console.error("Error updating monthly progress:", updateError);
      throw new Error(updateError.message);
    }
  }

  // Safety check - progress should now be defined
  if (!progress) {
    throw new Error("Failed to create or update monthly progress");
  }

  // OPTIMIZED: Batch fetch existing signature progress in single query
  const { data: existingSigProgress } = await supabase
    .from("signature_progress")
    .select("id, signature_id")
    .eq("monthly_progress_id", progress.id);

  const existingSigMap = new Map(
    (existingSigProgress || []).map((sp) => [sp.signature_id, sp.id])
  );

  // Separate into updates and inserts
  const toUpdate: { id: string; is_completed: boolean; completed_at: string | null }[] = [];
  const toInsert: { monthly_progress_id: string; signature_id: string; is_completed: boolean; completed_at: string | null }[] = [];

  for (const sigStatus of signatureStatuses) {
    const existingId = existingSigMap.get(sigStatus.signatureId);
    const completedAt = sigStatus.isCompleted ? new Date().toISOString() : null;

    if (existingId) {
      toUpdate.push({
        id: existingId,
        is_completed: sigStatus.isCompleted,
        completed_at: completedAt,
      });
    } else {
      toInsert.push({
        monthly_progress_id: progress.id,
        signature_id: sigStatus.signatureId,
        is_completed: sigStatus.isCompleted,
        completed_at: completedAt,
      });
    }
  }

  // OPTIMIZED: Batch insert new signature progress
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("signature_progress")
      .insert(toInsert);

    if (insertError) {
      console.error("Error inserting signature progress:", insertError);
      throw new Error(insertError.message);
    }
  }

  // OPTIMIZED: Batch update existing signature progress using upsert alternative
  // Since Supabase doesn't support batch update with different values easily,
  // we use Promise.all for parallel execution
  if (toUpdate.length > 0) {
    await Promise.all(
      toUpdate.map((update) =>
        supabase
          .from("signature_progress")
          .update({
            is_completed: update.is_completed,
            completed_at: update.completed_at,
          })
          .eq("id", update.id)
      )
    );
  }
  
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  logger.info(`Progress ${monthNames[month - 1]} ${year} diperbarui`, `Contract ID: ${contractId}`);
}

// ===================
// PERIOD MIGRATION FUNCTIONS
// ===================

export interface PeriodMigrationConfig {
  contractId: string;
  year: number;
  newPeriod: number;
  // For merge (converting UP): which data to use for each target period
  mergeConfig?: {
    targetMonth: number; // End month of the new period
    sourceMonth: number; // Which source month to copy data from
    notes: string[]; // Combined notes from selected months
  }[];
  // For split (converting DOWN): how to distribute data
  splitConfig?: {
    sourceMonth: number; // Source month with data
    targetMonths: { month: number; percentage: number }[]; // Distribution
  }[];
  // For half-month conversion: how to handle P2
  halfMonthMode?: "duplicate" | "empty";
}

export async function migrateContractPeriod(
  config: PeriodMigrationConfig
): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  const { contractId, year, newPeriod, mergeConfig, splitConfig, halfMonthMode = "duplicate" } = config;

  // First, get all existing monthly progress and signature progress
  const { data: existingProgress } = await supabase
    .from("monthly_progress")
    .select("*, signature_progress(*)")
    .eq("contract_id", contractId)
    .eq("year", year);

  // Get contract signatures for reference
  const { data: signatures } = await supabase
    .from("signatures")
    .select("*")
    .eq("contract_id", contractId)
    .order("order");

  if (!signatures) return;

  // Handle MERGE (converting UP - e.g., 1 month to 4 months)
  if (mergeConfig && mergeConfig.length > 0) {
    for (const merge of mergeConfig) {
      const sourceProgress = existingProgress?.find(
        (p) => p.month === merge.sourceMonth
      );

      if (sourceProgress) {
        // Get or create target month progress
        let { data: targetProgress } = await supabase
          .from("monthly_progress")
          .select("id")
          .eq("contract_id", contractId)
          .eq("month", merge.targetMonth)
          .eq("year", year)
          .single();

        const combinedNotes = merge.notes.length > 0 
          ? merge.notes.join("\n---\n") 
          : sourceProgress.notes;

        if (!targetProgress) {
          // Create new progress for target month
          const { data: newProgress } = await supabase
            .from("monthly_progress")
            .insert({
              contract_id: contractId,
              month: merge.targetMonth,
              year,
              upload_link: sourceProgress.upload_link,
              is_upload_completed: sourceProgress.is_upload_completed,
              notes: combinedNotes,
            })
            .select()
            .single();

          targetProgress = newProgress;
        } else {
          // Update target month with source data
          await supabase
            .from("monthly_progress")
            .update({
              upload_link: sourceProgress.upload_link,
              is_upload_completed: sourceProgress.is_upload_completed,
              notes: combinedNotes,
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetProgress.id);
        }

        // Copy signature progress
        if (targetProgress && sourceProgress.signature_progress) {
          // Delete existing signature progress for target
          await supabase
            .from("signature_progress")
            .delete()
            .eq("monthly_progress_id", targetProgress.id);

          // OPTIMIZED: Batch insert signature progress from source
          const sigProgressInserts = sourceProgress.signature_progress.map((sigProgress: any) => ({
            monthly_progress_id: targetProgress.id,
            signature_id: sigProgress.signature_id,
            is_completed: sigProgress.is_completed,
            completed_at: sigProgress.completed_at,
          }));

          if (sigProgressInserts.length > 0) {
            await supabase.from("signature_progress").insert(sigProgressInserts);
          }
        }

        // Clear source month if different from target
        if (merge.sourceMonth !== merge.targetMonth) {
          const sourceRecord = existingProgress?.find(
            (p) => p.month === merge.sourceMonth
          );
          if (sourceRecord) {
            await supabase
              .from("signature_progress")
              .delete()
              .eq("monthly_progress_id", sourceRecord.id);

            await supabase
              .from("monthly_progress")
              .update({
                upload_link: null,
                is_upload_completed: false,
                notes: null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", sourceRecord.id);
          }
        }
      }
    }
  }

  // Handle SPLIT (converting DOWN - e.g., 4 months to 1 month)
  if (splitConfig && splitConfig.length > 0) {
    for (const split of splitConfig) {
      const sourceProgress = existingProgress?.find(
        (p) => p.month === split.sourceMonth
      );

      if (sourceProgress) {
        for (const target of split.targetMonths) {
          // Get or create target month progress
          let { data: targetProgress } = await supabase
            .from("monthly_progress")
            .select("id")
            .eq("contract_id", contractId)
            .eq("month", target.month)
            .eq("year", year)
            .single();

          // Calculate how many signatures should be completed based on percentage
          const totalItems = signatures.length + 1;
          const completedItems = Math.round((target.percentage / 100) * totalItems);
          const completedSigs = Math.max(0, completedItems - 1); // -1 for upload

          if (!targetProgress) {
            const { data: newProgress } = await supabase
              .from("monthly_progress")
              .insert({
                contract_id: contractId,
                month: target.month,
                year,
                upload_link: completedItems >= totalItems ? sourceProgress.upload_link : null,
                is_upload_completed: completedItems >= totalItems,
                notes: sourceProgress.notes,
              })
              .select()
              .single();

            targetProgress = newProgress;
          } else {
            await supabase
              .from("monthly_progress")
              .update({
                upload_link: completedItems >= totalItems ? sourceProgress.upload_link : null,
                is_upload_completed: completedItems >= totalItems,
                notes: sourceProgress.notes,
                updated_at: new Date().toISOString(),
              })
              .eq("id", targetProgress.id);
          }

          // Create signature progress for target
          if (targetProgress) {
            await supabase
              .from("signature_progress")
              .delete()
              .eq("monthly_progress_id", targetProgress.id);

            // OPTIMIZED: Batch insert signature progress
            const sigProgressInserts = signatures.map((sig, i) => ({
              monthly_progress_id: targetProgress.id,
              signature_id: sig.id,
              is_completed: i < completedSigs,
              completed_at: i < completedSigs ? new Date().toISOString() : null,
            }));

            if (sigProgressInserts.length > 0) {
              await supabase.from("signature_progress").insert(sigProgressInserts);
            }
          }
        }
      }
    }
  }

  // Calculate which months should be ACTIVE in the new period
  const activeMonths = new Set<number>();
  
  if (newPeriod === 0.5) {
    // Per 1/2 Bulan: all months 1-12 are active (with 2 sub_periods each)
    for (let i = 1; i <= 12; i++) activeMonths.add(i);
  } else if (newPeriod === 1) {
    // Per 1 Bulan: all months 1-12 are active
    for (let i = 1; i <= 12; i++) activeMonths.add(i);
  } else if (newPeriod === 2) {
    // Per 2 Bulan: 2, 4, 6, 8, 10, 12
    for (let i = 2; i <= 12; i += 2) activeMonths.add(i);
  } else if (newPeriod === 3) {
    // Per 3 Bulan (Triwulan): 3, 6, 9, 12
    for (let i = 3; i <= 12; i += 3) activeMonths.add(i);
  } else if (newPeriod === 4) {
    // Per 4 Bulan (Caturwulan): 4, 8, 12
    for (let i = 4; i <= 12; i += 4) activeMonths.add(i);
  } else if (newPeriod === 6) {
    // Per 6 Bulan (Semester): 6, 12
    for (let i = 6; i <= 12; i += 6) activeMonths.add(i);
  } else if (newPeriod === 12) {
    // Per 12 Bulan (Tahunan): 12
    activeMonths.add(12);
  }

  // Clear ALL months that are NOT active in the new period
  // This ensures notes don't appear in wrong months after merge
  if (existingProgress) {
    for (const progress of existingProgress) {
      if (!activeMonths.has(progress.month)) {
        // This month should not have data in the new period - clear it
        await supabase
          .from("signature_progress")
          .delete()
          .eq("monthly_progress_id", progress.id);

        await supabase
          .from("monthly_progress")
          .update({
            upload_link: null,
            is_upload_completed: false,
            notes: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", progress.id);
      }
    }
  }

  // Update contract period - special handling for 0.5 (half-month)
  const periodString = newPeriod === 0.5 ? "Per 1/2 Bulan" : `Per ${newPeriod} Bulan`;
  
  await supabase
    .from("bapp_contracts")
    .update({
      period: periodString,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contractId);

  // For half-month period, create sub_period entries for all months
  if (newPeriod === 0.5) {
    for (let month = 1; month <= 12; month++) {
      // Get existing data (from previous period, might have sub_period = 1, null, or not exist)
      const existingData = existingProgress?.find(
        (p) => p.month === month && (p.sub_period === 1 || !p.sub_period || p.sub_period === null)
      );

      // Check if P1 entry exists with sub_period = 1
      const { data: existingP1 } = await supabase
        .from("monthly_progress")
        .select("id, sub_period")
        .eq("contract_id", contractId)
        .eq("month", month)
        .eq("year", year)
        .eq("sub_period", 1)
        .maybeSingle();

      // Check if P2 entry exists
      const { data: existingP2 } = await supabase
        .from("monthly_progress")
        .select("id")
        .eq("contract_id", contractId)
        .eq("month", month)
        .eq("year", year)
        .eq("sub_period", 2)
        .maybeSingle();

      // Handle P1 entry
      if (!existingP1 && existingData) {
        // Update existing entry to be P1 (set sub_period = 1)
        await supabase
          .from("monthly_progress")
          .update({
            sub_period: 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingData.id);
      } else if (!existingP1) {
        // Create new P1 entry if no existing data
        await supabase
          .from("monthly_progress")
          .insert({
            contract_id: contractId,
            month,
            year,
            sub_period: 1,
            upload_link: null,
            is_upload_completed: false,
            notes: null,
          });
      }

      // Handle P2 entry
      if (!existingP2) {
        // Determine if we should duplicate from existing data
        const shouldDuplicate = halfMonthMode === "duplicate" && existingData;
        
        // Create P2 entry
        const { data: newP2Progress } = await supabase
          .from("monthly_progress")
          .insert({
            contract_id: contractId,
            month,
            year,
            sub_period: 2,
            upload_link: shouldDuplicate ? existingData.upload_link : null,
            is_upload_completed: shouldDuplicate ? existingData.is_upload_completed : false,
            notes: shouldDuplicate ? existingData.notes : null,
          })
          .select()
          .single();

        // OPTIMIZED: Batch insert signature progress if duplicating
        if (newP2Progress && shouldDuplicate && existingData.signature_progress) {
          const sigProgressInserts = existingData.signature_progress.map((sigProgress: any) => ({
            monthly_progress_id: newP2Progress.id,
            signature_id: sigProgress.signature_id,
            is_completed: sigProgress.is_completed,
            completed_at: sigProgress.completed_at,
          }));

          if (sigProgressInserts.length > 0) {
            await supabase.from("signature_progress").insert(sigProgressInserts);
          }
        }
      }
    }
  }
}

// ===================
// IMPORT FROM YEAR FUNCTIONS
// ===================

export async function fetchContractsForYear(year: number): Promise<ContractSummary[]> {
  const supabase = createClient();
  if (!supabase) return [];

  // Fetch contracts with related data
  const { data, error } = await supabase
    .from("bapp_contracts")
    .select(`
      id,
      name,
      period,
      invoice_type,
      year,
      customer_id,
      area_id
    `)
    .eq("year", year)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching contracts for year:", error.message, error.details, error.hint);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // OPTIMIZED: Fetch customers, areas, and signatures in parallel
  const customerIds = [...new Set(data.map(c => c.customer_id).filter(Boolean))];
  const areaIds = [...new Set(data.map(c => c.area_id).filter(Boolean))];
  const contractIds = data.map(c => c.id);

  const [customersResult, areasResult, signaturesResult] = await Promise.all([
    supabase.from("customers").select("id, name").in("id", customerIds),
    supabase.from("areas").select("id, name").in("id", areaIds.length > 0 ? areaIds : ['none']),
    supabase.from("signatures").select("id, contract_id").in("contract_id", contractIds),
  ]);

  const customers = customersResult.data || [];
  const areas = areasResult.data || [];
  const signatures = signaturesResult.data || [];

  // OPTIMIZED: Use Map for O(1) lookup
  const customerMap = new Map(customers.map(c => [c.id, c.name]));
  const areaMap = new Map(areas.map(a => [a.id, a.name]));
  const signatureCount = new Map<string, number>();
  
  for (const sig of signatures) {
    signatureCount.set(sig.contract_id, (signatureCount.get(sig.contract_id) || 0) + 1);
  }

  return data.map((contract) => ({
    id: contract.id,
    customerName: customerMap.get(contract.customer_id) || "Unknown",
    areaName: contract.area_id ? areaMap.get(contract.area_id) || null : null,
    name: contract.name,
    invoiceType: contract.invoice_type,
    period: contract.period,
    signatureCount: signatureCount.get(contract.id) || 0,
    year: contract.year,
  }));
}

export async function importContractsFromYear(
  sourceYear: number,
  targetYear: number,
  contractIds: string[]
): Promise<{ success: number; failed: number; skipped: number; errors: string[]; skippedNames: string[] }> {
  const supabase = createClient();
  if (!supabase) return { success: 0, failed: 0, skipped: 0, errors: ["Database connection failed"], skippedNames: [] };

  const result = { success: 0, failed: 0, skipped: 0, errors: [] as string[], skippedNames: [] as string[] };

  // Process in batches to avoid rate limiting
  const BATCH_SIZE = 5;
  const DELAY_BETWEEN_BATCHES = 500; // ms

  for (let i = 0; i < contractIds.length; i += BATCH_SIZE) {
    const batch = contractIds.slice(i, i + BATCH_SIZE);
    
    // Process batch concurrently
    const batchResults = await Promise.allSettled(
      batch.map(async (contractId) => {
        // Fetch the source contract with all related data
        const { data: sourceContract, error: fetchError } = await supabase
          .from("bapp_contracts")
          .select(`
            *,
            signatures(*)
          `)
          .eq("id", contractId)
          .single();

        if (fetchError || !sourceContract) {
          throw new Error(`Gagal mengambil data: ${fetchError?.message || "Not found"}`);
        }

        const contractName = sourceContract.name || contractId;

        // Check if contract already exists for target year (same customer + area + name + invoice_type)
        const { data: existingContract } = await supabase
          .from("bapp_contracts")
          .select("id")
          .eq("customer_id", sourceContract.customer_id)
          .eq("area_id", sourceContract.area_id)
          .eq("name", sourceContract.name)
          .eq("invoice_type", sourceContract.invoice_type)
          .eq("year", targetYear)
          .maybeSingle();

        if (existingContract) {
          // Return special marker for skipped contracts
          return { status: "skipped", name: contractName };
        }

        // Create new contract for target year
        const { data: newContract, error: createError } = await supabase
          .from("bapp_contracts")
          .insert({
            customer_id: sourceContract.customer_id,
            area_id: sourceContract.area_id,
            name: sourceContract.name,
            period: sourceContract.period,
            invoice_type: sourceContract.invoice_type,
            notes: sourceContract.notes,
            year: targetYear,
          })
          .select()
          .single();

        if (createError || !newContract) {
          throw new Error(`Gagal membuat kontrak "${contractName}": ${createError?.message}`);
        }

        // Copy signatures (without progress)
        const signatures = sourceContract.signatures || [];
        if (signatures.length > 0) {
          const signatureInserts = signatures.map((sig: { name: string; role: string; order: number }) => ({
            contract_id: newContract.id,
            name: sig.name,
            role: sig.role,
            order: sig.order,
          }));

          const { error: sigError } = await supabase
            .from("signatures")
            .insert(signatureInserts);

          if (sigError) {
            // Contract created but signatures failed - log but don't fail completely
            console.warn(`Signatures failed for ${contractName}:`, sigError);
          }
        }

        return { status: "success", name: contractName };
      })
    );

    // Process batch results
    for (const batchResult of batchResults) {
      if (batchResult.status === "fulfilled") {
        const value = batchResult.value as { status: string; name: string };
        if (value.status === "skipped") {
          result.skipped++;
          result.skippedNames.push(value.name);
        } else {
          result.success++;
        }
      } else {
        result.failed++;
        result.errors.push(batchResult.reason?.message || "Unknown error");
      }
    }

    // Delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < contractIds.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }

  if (result.success > 0) {
    logger.success(
      `Import kontrak berhasil`,
      `${result.success} kontrak diimport dari ${sourceYear} ke ${targetYear}`
    );
  }
  if (result.skipped > 0) {
    logger.info(
      `Beberapa kontrak dilewati`,
      `${result.skipped} kontrak sudah ada di tahun ${targetYear}`
    );
  }
  if (result.failed > 0) {
    logger.warning(
      `Sebagian import gagal`,
      `${result.failed} kontrak gagal diimport`
    );
  }

  return result;
}

// ===================
// DELETE FUNCTIONS
// ===================

export async function deleteContract(contractId: string): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  const { error } = await supabase
    .from("bapp_contracts")
    .delete()
    .eq("id", contractId);

  if (error) {
    console.error("Error deleting contract:", error);
    logger.error("Gagal menghapus kontrak", error.message);
    throw new Error(error.message);
  }
  
  logger.success("Kontrak berhasil dihapus", `ID: ${contractId}`);
}

export async function deleteCustomer(customerId: string): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId);

  if (error) {
    console.error("Error deleting customer:", error);
    throw new Error(error.message);
  }
}

export async function deleteArea(areaId: string): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  const { error } = await supabase.from("areas").delete().eq("id", areaId);

  if (error) {
    console.error("Error deleting area:", error);
    throw new Error(error.message);
  }
}
