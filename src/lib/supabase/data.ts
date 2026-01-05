import { createClient } from "@/lib/supabase/client";
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

  // Fetch all customers
  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("*")
    .order("name");

  if (customersError) {
    console.error("Error fetching customers:", customersError);
    return [];
  }

  // Fetch all areas
  const { data: areas, error: areasError } = await supabase
    .from("areas")
    .select("*")
    .order("code");

  if (areasError) {
    console.error("Error fetching areas:", areasError);
    return [];
  }

  // Fetch all contracts for the year
  const { data: contracts, error: contractsError } = await supabase
    .from("bapp_contracts")
    .select("*")
    .eq("year", year)
    .order("name");

  if (contractsError) {
    console.error("Error fetching contracts:", contractsError);
    return [];
  }

  // Fetch all signatures
  const contractIds = contracts?.map((c) => c.id) || [];
  const { data: signatures, error: signaturesError } = await supabase
    .from("signatures")
    .select("*")
    .in("contract_id", contractIds.length > 0 ? contractIds : [""])
    .order("order");

  if (signaturesError) {
    console.error("Error fetching signatures:", signaturesError);
  }

  // Fetch all monthly progress
  const { data: monthlyProgress, error: progressError } = await supabase
    .from("monthly_progress")
    .select("*")
    .in("contract_id", contractIds.length > 0 ? contractIds : [""])
    .eq("year", year);

  if (progressError) {
    console.error("Error fetching monthly progress:", progressError);
  }

  // Fetch all signature progress
  const progressIds = monthlyProgress?.map((p) => p.id) || [];
  const { data: signatureProgress, error: sigProgressError } = await supabase
    .from("signature_progress")
    .select("*")
    .in("monthly_progress_id", progressIds.length > 0 ? progressIds : [""]);

  if (sigProgressError) {
    console.error("Error fetching signature progress:", sigProgressError);
  }

  // Build the hierarchical data structure
  const result: CustomerWithAreas[] = (customers || []).map((customer) => {
    const customerAreas = (areas || []).filter(
      (area) => area.customer_id === customer.id
    );

    const areasWithContracts = customerAreas.map((area) => {
      const areaContracts = (contracts || []).filter(
        (contract) =>
          contract.customer_id === customer.id && contract.area_id === area.id
      );

      const contractsWithProgress: ContractWithProgress[] = areaContracts.map(
        (contract) => {
          const contractSignatures = (signatures || []).filter(
            (sig) => sig.contract_id === contract.id
          );

          // Build monthly progress for all 12 months
          const monthlyProgressData: MonthlyProgressDetail[] = Array.from(
            { length: 12 },
            (_, i) => {
              const month = i + 1;
              const progress = (monthlyProgress || []).find(
                (p) => p.contract_id === contract.id && p.month === month
              );

              const signaturesWithStatus: SignatureDetail[] =
                contractSignatures.map((sig) => {
                  const sigProgress = progress
                    ? (signatureProgress || []).find(
                        (sp) =>
                          sp.monthly_progress_id === progress.id &&
                          sp.signature_id === sig.id
                      )
                    : null;

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

              return {
                id: progress?.id || null,
                month,
                year,
                signatures: signaturesWithStatus,
                is_upload_completed: isUploadCompleted,
                upload_link: progress?.upload_link || null,
                notes: progress?.notes || null,
                notes_updated_at: progress?.notes_updated_at || null,
                updated_at: progress?.updated_at || null,
                percentage,
                total_items: totalItems,
                completed_items: completedItems,
              };
            }
          );

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
      // Rollback contract creation
      await supabase.from("bapp_contracts").delete().eq("id", contract.id);
      throw new Error(sigError.message);
    }
  }

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
  signatures: { name: string; role: string }[]
): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  // Delete existing signatures
  const { error: deleteError } = await supabase
    .from("signatures")
    .delete()
    .eq("contract_id", contractId);

  if (deleteError) {
    console.error("Error deleting signatures:", deleteError);
    throw new Error(deleteError.message);
  }

  // Create new signatures
  if (signatures.length > 0) {
    const signaturesData = signatures.map((sig, index) => ({
      contract_id: contractId,
      name: sig.name,
      role: sig.role,
      order: index + 1,
    }));

    const { error: insertError } = await supabase
      .from("signatures")
      .insert(signaturesData);

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
  signatureStatuses: { signatureId: string; isCompleted: boolean }[]
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
    .single();

  if (!progress) {
    // Create new monthly progress
    const { data: newProgress, error: createError } = await supabase
      .from("monthly_progress")
      .insert({
        contract_id: contractId,
        month,
        year,
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

  // Update signature statuses
  for (const sigStatus of signatureStatuses) {
    // Check if signature progress exists
    const { data: existingSigProgress } = await supabase
      .from("signature_progress")
      .select("id")
      .eq("monthly_progress_id", progress.id)
      .eq("signature_id", sigStatus.signatureId)
      .single();

    if (existingSigProgress) {
      // Update
      await supabase
        .from("signature_progress")
        .update({
          is_completed: sigStatus.isCompleted,
          completed_at: sigStatus.isCompleted ? new Date().toISOString() : null,
        })
        .eq("id", existingSigProgress.id);
    } else {
      // Insert
      await supabase.from("signature_progress").insert({
        monthly_progress_id: progress.id,
        signature_id: sigStatus.signatureId,
        is_completed: sigStatus.isCompleted,
        completed_at: sigStatus.isCompleted ? new Date().toISOString() : null,
      });
    }
  }
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
}

export async function migrateContractPeriod(
  config: PeriodMigrationConfig
): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;

  const { contractId, year, newPeriod, mergeConfig, splitConfig } = config;

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

          // Copy from source
          for (const sigProgress of sourceProgress.signature_progress) {
            await supabase.from("signature_progress").insert({
              monthly_progress_id: targetProgress.id,
              signature_id: sigProgress.signature_id,
              is_completed: sigProgress.is_completed,
              completed_at: sigProgress.completed_at,
            });
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

            for (let i = 0; i < signatures.length; i++) {
              const sig = signatures[i];
              await supabase.from("signature_progress").insert({
                monthly_progress_id: targetProgress.id,
                signature_id: sig.id,
                is_completed: i < completedSigs,
                completed_at: i < completedSigs ? new Date().toISOString() : null,
              });
            }
          }
        }
      }
    }
  }

  // Calculate which months should be ACTIVE in the new period
  const activeMonths = new Set<number>();
  
  if (newPeriod === 1) {
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

  // Update contract period
  await supabase
    .from("bapp_contracts")
    .update({
      period: `Per ${newPeriod} Bulan`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contractId);
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

  // Fetch customers and areas separately to avoid relationship issues
  const customerIds = [...new Set(data.map(c => c.customer_id).filter(Boolean))];
  const areaIds = [...new Set(data.map(c => c.area_id).filter(Boolean))];

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name")
    .in("id", customerIds);

  const { data: areas } = await supabase
    .from("areas")
    .select("id, name")
    .in("id", areaIds.length > 0 ? areaIds : ['none']);

  // Count signatures per contract
  const contractIds = data.map(c => c.id);
  const { data: signatures } = await supabase
    .from("signatures")
    .select("id, contract_id")
    .in("contract_id", contractIds);

  const customerMap = new Map((customers || []).map(c => [c.id, c.name]));
  const areaMap = new Map((areas || []).map(a => [a.id, a.name]));
  const signatureCount = new Map<string, number>();
  
  (signatures || []).forEach(sig => {
    const count = signatureCount.get(sig.contract_id) || 0;
    signatureCount.set(sig.contract_id, count + 1);
  });

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
): Promise<{ success: number; failed: number; errors: string[] }> {
  const supabase = createClient();
  if (!supabase) return { success: 0, failed: 0, errors: ["Database connection failed"] };

  const result = { success: 0, failed: 0, errors: [] as string[] };

  for (const contractId of contractIds) {
    try {
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
        result.failed++;
        result.errors.push(`Contract ${contractId}: ${fetchError?.message || "Not found"}`);
        continue;
      }

      // Check if contract already exists for target year (same customer + name + invoice_type)
      const { data: existingContract } = await supabase
        .from("bapp_contracts")
        .select("id")
        .eq("customer_id", sourceContract.customer_id)
        .eq("name", sourceContract.name)
        .eq("invoice_type", sourceContract.invoice_type)
        .eq("year", targetYear)
        .single();

      if (existingContract) {
        result.failed++;
        result.errors.push(`Contract already exists for ${targetYear}`);
        continue;
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
        result.failed++;
        result.errors.push(`Failed to create contract: ${createError?.message}`);
        continue;
      }

      // Copy signatures (without progress)
      const signatures = sourceContract.signatures || [];
      for (const sig of signatures) {
        await supabase.from("signatures").insert({
          contract_id: newContract.id,
          name: sig.name,
          role: sig.role,
          order: sig.order,
        });
      }

      result.success++;
    } catch (err) {
      result.failed++;
      result.errors.push(`Contract ${contractId}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
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
    throw new Error(error.message);
  }
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
