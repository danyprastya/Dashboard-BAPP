import { createClient } from "@/lib/supabase/client";
import type {
  Customer,
  Area,
  BAPPContract,
  CustomerWithAreas,
  ContractWithProgress,
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
