// Typical rooms and the equipment usually found in them, per kind of place.
// Mirrors the proposal's hierarchy, e.g. Home → Kitchen → Refrigerator / Oven / Washing machine.
// Used to seed new properties, offer one-click "add room" chips, and suggest equipment
// for each room (also for rooms the user named themselves, matched by keyword).

export type AssetTemplate = { name: string; category: string; lifeYears: number | null };

export type SpaceTemplate = {
  name: string;
  kind: string;
  /** Lower-case keywords that identify this kind of room in a user-chosen name. */
  match: string[];
  assets: AssetTemplate[];
};

const a = (name: string, category: string, lifeYears: number | null = null): AssetTemplate => ({ name, category, lifeYears });

export const HOME_SPACES: SpaceTemplate[] = [
  {
    name: "Kitchen",
    kind: "room",
    match: ["kitchen", "pantry"],
    assets: [a("Refrigerator", "appliance", 12), a("Oven", "appliance", 15), a("Washing machine", "appliance", 10), a("Dishwasher", "appliance", 10), a("Microwave", "appliance", 9)],
  },
  {
    name: "Living Room",
    kind: "room",
    match: ["living", "lounge", "family room", "sitting"],
    assets: [a("Air conditioner", "hvac", 12), a("TV", "appliance", 8), a("Smart devices", "other", 5), a("Wi-Fi router", "other", 5)],
  },
  {
    name: "Bedrooms",
    kind: "room",
    match: ["bed", "master", "guest", "nursery"],
    assets: [a("Air conditioner", "hvac", 12), a("Ceiling fan", "appliance", 15), a("Water heater", "plumbing", 10)],
  },
  {
    name: "Bathroom",
    kind: "room",
    match: ["bath", "toilet", "wc", "shower", "ensuite"],
    assets: [a("Water heater", "plumbing", 10), a("Exhaust fan", "appliance", 10), a("Shower mixer", "plumbing", 15)],
  },
  {
    name: "Laundry",
    kind: "room",
    match: ["laundry", "utility"],
    assets: [a("Washing machine", "appliance", 10), a("Clothes dryer", "appliance", 12)],
  },
  {
    name: "Exterior",
    kind: "exterior",
    match: ["exterior", "garden", "yard", "outside", "roof", "garage", "driveway"],
    assets: [a("Solar system", "solar", 25), a("Water tank", "water", 20), a("Water pump", "water", 10), a("Garden irrigation", "outdoor", 10), a("Gate motor", "security", 10)],
  },
];

export const APARTMENT_SPACES: SpaceTemplate[] = [
  {
    name: "Kitchen",
    kind: "room",
    match: ["kitchen", "kitchenette"],
    assets: [a("Refrigerator", "appliance", 12), a("Cooktop", "appliance", 15), a("Microwave", "appliance", 9), a("Washing machine", "appliance", 10), a("Extractor fan", "appliance", 10)],
  },
  {
    name: "Living Room",
    kind: "room",
    match: ["living", "lounge", "studio"],
    assets: [a("Air conditioner", "hvac", 12), a("TV", "appliance", 8), a("Smart devices", "other", 5), a("Intercom", "security", 15)],
  },
  {
    name: "Bedroom",
    kind: "room",
    match: ["bed", "master", "guest"],
    assets: [a("Air conditioner", "hvac", 12), a("Ceiling fan", "appliance", 15)],
  },
  {
    name: "Bathroom",
    kind: "room",
    match: ["bath", "toilet", "wc", "shower"],
    assets: [a("Water heater", "plumbing", 10), a("Exhaust fan", "appliance", 10)],
  },
  {
    name: "Balcony",
    kind: "area",
    match: ["balcony", "terrace", "patio"],
    assets: [a("AC outdoor unit", "hvac", 12), a("Clothes dryer", "appliance", 12)],
  },
];

export const COMPANY_SPACES: SpaceTemplate[] = [
  {
    name: "Reception",
    kind: "area",
    match: ["reception", "lobby", "entrance", "front desk"],
    assets: [a("Access control", "security", 10), a("CCTV system", "security", 8), a("Fire extinguisher", "security", 10), a("Elevator", "structure", 25)],
  },
  {
    name: "Office floor",
    kind: "floor",
    match: ["office", "floor", "workspace", "open plan"],
    assets: [a("HVAC unit", "hvac", 15), a("Printer", "appliance", 5), a("Emergency lighting", "electrical", 10), a("Fire extinguisher", "security", 10)],
  },
  {
    name: "Meeting room",
    kind: "room",
    match: ["meeting", "conference", "board"],
    assets: [a("Display / projector", "appliance", 6), a("Video conferencing kit", "other", 5), a("Air conditioner", "hvac", 12)],
  },
  {
    name: "Kitchen / break room",
    kind: "room",
    match: ["kitchen", "break", "pantry", "canteen", "cafeteria"],
    assets: [a("Refrigerator", "appliance", 12), a("Coffee machine", "appliance", 6), a("Water dispenser", "appliance", 8), a("Microwave", "appliance", 9)],
  },
  {
    name: "Server / IT room",
    kind: "room",
    match: ["server", "it room", "data", "comms"],
    assets: [a("Server rack", "electrical", 8), a("UPS", "electrical", 8), a("Network switch", "electrical", 7), a("Precision AC", "hvac", 12)],
  },
  {
    name: "Plant room",
    kind: "room",
    match: ["plant", "mechanical", "electrical room", "utility", "boiler"],
    assets: [a("Generator", "electrical", 20), a("Fire alarm panel", "security", 15), a("Water pump", "water", 10), a("Main switchboard", "electrical", 30)],
  },
  {
    name: "Parking & exterior",
    kind: "exterior",
    match: ["parking", "exterior", "car park", "garage", "yard", "outside", "roof"],
    assets: [a("Gate / barrier motor", "security", 10), a("CCTV cameras", "security", 8), a("Exterior lighting", "electrical", 15)],
  },
];

export const OTHER_SPACES: SpaceTemplate[] = [
  {
    name: "Main area",
    kind: "area",
    match: ["main", "hall", "classroom", "ward", "shop", "floor"],
    assets: [a("Air conditioner", "hvac", 12), a("Fire extinguisher", "security", 10), a("Lighting", "electrical", 15)],
  },
  {
    name: "Storage",
    kind: "room",
    match: ["storage", "store", "warehouse", "shed"],
    assets: [a("Dehumidifier", "appliance", 8), a("Shelving / racking", "structure", 20)],
  },
  {
    name: "Exterior",
    kind: "exterior",
    match: ["exterior", "outside", "yard", "garden", "roof", "farm", "field"],
    assets: [a("Water tank", "water", 20), a("Water pump", "water", 10), a("Generator", "electrical", 20), a("Solar system", "solar", 25)],
  },
];

// Everyday names people use for the same equipment.
const ALIASES: Record<string, string[]> = {
  "air conditioner": ["ac", "a/c", "air con", "aircon", "air conditioning", "split"],
  "hvac unit": ["hvac", "ac", "air handler"],
  refrigerator: ["fridge", "freezer"],
  tv: ["television"],
  "water heater": ["geyser", "hot water", "boiler", "heater"],
  "washing machine": ["washer"],
  "clothes dryer": ["dryer", "tumble"],
  "wi-fi router": ["router", "wifi", "modem"],
  "solar system": ["solar", "pv"],
  "water pump": ["pump"],
  "ceiling fan": ["fan"],
  oven: ["stove", "range", "cooker"],
  cooktop: ["hob", "stove"],
};

/** True if one of the existing names already covers this template item. */
export function alreadyHas(existingNames: string[], templateName: string) {
  const key = templateName.toLowerCase();
  const terms = [key, ...(ALIASES[key] ?? [])];
  return existingNames.some((raw) => {
    const n = raw.toLowerCase();
    return terms.some((t) => new RegExp(`(^|[^a-z])${t.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}([^a-z]|$)`).test(n));
  });
}

const ALL = [...HOME_SPACES, ...APARTMENT_SPACES, ...COMPANY_SPACES, ...OTHER_SPACES];

/** Finds the template for a room by its name, preferring the given set, then any set. */
export function templateForSpace(spaceName: string, preferred: SpaceTemplate[]): SpaceTemplate | null {
  const n = spaceName.toLowerCase();
  // The room type is usually the last word ("Guest WC", "Main bedroom"), so the
  // keyword that appears furthest into the name wins.
  const find = (list: SpaceTemplate[]) => {
    const exact = list.find((t) => t.name.toLowerCase() === n);
    if (exact) return exact;
    let best: SpaceTemplate | undefined;
    let bestPos = -1;
    for (const t of list) {
      for (const m of t.match) {
        const pos = n.lastIndexOf(m);
        if (pos > bestPos) {
          best = t;
          bestPos = pos;
        }
      }
    }
    return best;
  };
  return find(preferred) ?? find(ALL) ?? null;
}
