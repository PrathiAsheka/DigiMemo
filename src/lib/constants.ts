export const PROPERTY_TYPES = ["house", "apartment", "condo", "townhouse", "commercial", "other"] as const;
export const SPACE_KINDS = ["building", "floor", "room", "area", "exterior"] as const;
export const ASSET_CATEGORIES = [
  "appliance",
  "hvac",
  "plumbing",
  "electrical",
  "solar",
  "water",
  "security",
  "structure",
  "outdoor",
  "other",
] as const;
export const ASSET_STATUSES = ["active", "needs_attention", "out_of_service", "retired"] as const;
export const DOCUMENT_KINDS = [
  "receipt",
  "invoice",
  "warranty",
  "manual",
  "contract",
  "certificate",
  "photo",
  "other",
] as const;
export const WORK_ORDER_STATUSES = ["open", "scheduled", "in_progress", "completed", "cancelled"] as const;
export const WORK_ORDER_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const COST_CATEGORIES = ["purchase", "service", "repair", "replacement", "other"] as const;

/** Categories where only a qualified professional should do the work (proposal §6). */
export const SAFETY_CRITICAL_CATEGORIES = new Set(["electrical", "structure", "hvac", "solar"]);
