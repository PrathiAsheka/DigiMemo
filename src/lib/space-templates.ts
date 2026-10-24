// Typical rooms and the equipment usually found in them, per kind of place.
// Mirrors the proposal's hierarchy, e.g. Home → Kitchen → Refrigerator / Oven / Washing machine.
// Used to seed new properties, offer one-click "add room" chips, and suggest equipment
// for each room (also for rooms the user named themselves, matched by keyword).
// Every room and item has an English and a Sinhala name; records are created in the
// user's language, and matching understands both.

import type { Locale } from "@/i18n/config";

export type AssetTemplate = { en: string; si: string; category: string; lifeYears: number | null };

export type SpaceTemplate = {
  en: string;
  si: string;
  kind: string;
  /** Lower-case keywords (English and Sinhala) that identify this room in a user-chosen name. */
  match: string[];
  assets: AssetTemplate[];
};

/** The template's name in the given language. */
export const tn = (t: { en: string; si: string }, locale: Locale) => (locale === "si" ? t.si : t.en);

const a = (en: string, si: string, category: string, lifeYears: number | null = null): AssetTemplate => ({ en, si, category, lifeYears });

export const HOME_SPACES: SpaceTemplate[] = [
  {
    en: "Kitchen",
    si: "මුළුතැන්ගෙය",
    kind: "room",
    match: ["kitchen", "pantry", "මුළුතැන්", "කුස්සිය"],
    assets: [
      a("Refrigerator", "ශීතකරණය", "appliance", 12),
      a("Oven", "උඳුන", "appliance", 15),
      a("Washing machine", "රෙදි සෝදන යන්ත්‍රය", "appliance", 10),
      a("Dishwasher", "පිඟන් සෝදන යන්ත්‍රය", "appliance", 10),
      a("Microwave", "මයික්‍රෝවේව් උඳුන", "appliance", 9),
    ],
  },
  {
    en: "Living Room",
    si: "විසිත්ත කාමරය",
    kind: "room",
    match: ["living", "lounge", "family room", "sitting", "විසිත්ත", "සාලය"],
    assets: [
      a("Air conditioner", "වායු සමීකරණය", "hvac", 12),
      a("TV", "රූපවාහිනිය", "appliance", 8),
      a("Smart devices", "ස්මාර්ට් උපාංග", "other", 5),
      a("Wi-Fi router", "Wi-Fi රවුටරය", "other", 5),
    ],
  },
  {
    en: "Bedrooms",
    si: "නිදන කාමර",
    kind: "room",
    match: ["bed", "master", "guest", "nursery", "නිදන"],
    assets: [
      a("Air conditioner", "වායු සමීකරණය", "hvac", 12),
      a("Ceiling fan", "සිවිලිම් විදුලි පංකාව", "appliance", 15),
      a("Water heater", "ජල තාපකය", "plumbing", 10),
    ],
  },
  {
    en: "Bathroom",
    si: "නාන කාමරය",
    kind: "room",
    match: ["bath", "toilet", "wc", "shower", "ensuite", "නාන", "වැසිකිළිය"],
    assets: [
      a("Water heater", "ජල තාපකය", "plumbing", 10),
      a("Exhaust fan", "වාතය පිටකරන පංකාව", "appliance", 10),
      a("Shower mixer", "ෂවර් මික්සරය", "plumbing", 15),
    ],
  },
  {
    en: "Laundry",
    si: "රෙදි සෝදන කාමරය",
    kind: "room",
    match: ["laundry", "utility", "රෙදි"],
    assets: [a("Washing machine", "රෙදි සෝදන යන්ත්‍රය", "appliance", 10), a("Clothes dryer", "රෙදි වියළන යන්ත්‍රය", "appliance", 12)],
  },
  {
    en: "Exterior",
    si: "පිටත",
    kind: "exterior",
    match: ["exterior", "garden", "yard", "outside", "roof", "garage", "driveway", "පිටත", "වත්ත", "මිදුල", "වහළය", "ගරාජය"],
    assets: [
      a("Solar system", "සූර්ය බලශක්ති පද්ධතිය", "solar", 25),
      a("Water tank", "ජල ටැංකිය", "water", 20),
      a("Water pump", "ජල පොම්පය", "water", 10),
      a("Garden irrigation", "උද්‍යාන ජල සම්පාදනය", "outdoor", 10),
      a("Gate motor", "ගේට්ටු මෝටරය", "security", 10),
    ],
  },
];

export const APARTMENT_SPACES: SpaceTemplate[] = [
  {
    en: "Kitchen",
    si: "මුළුතැන්ගෙය",
    kind: "room",
    match: ["kitchen", "kitchenette", "මුළුතැන්", "කුස්සිය"],
    assets: [
      a("Refrigerator", "ශීතකරණය", "appliance", 12),
      a("Cooktop", "ලිප් තලය", "appliance", 15),
      a("Microwave", "මයික්‍රෝවේව් උඳුන", "appliance", 9),
      a("Washing machine", "රෙදි සෝදන යන්ත්‍රය", "appliance", 10),
      a("Extractor fan", "දුම් පිටකරන පංකාව", "appliance", 10),
    ],
  },
  {
    en: "Living Room",
    si: "විසිත්ත කාමරය",
    kind: "room",
    match: ["living", "lounge", "studio", "විසිත්ත", "සාලය"],
    assets: [
      a("Air conditioner", "වායු සමීකරණය", "hvac", 12),
      a("TV", "රූපවාහිනිය", "appliance", 8),
      a("Smart devices", "ස්මාර්ට් උපාංග", "other", 5),
      a("Intercom", "ඉන්ටර්කොම්", "security", 15),
    ],
  },
  {
    en: "Bedroom",
    si: "නිදන කාමරය",
    kind: "room",
    match: ["bed", "master", "guest", "නිදන"],
    assets: [a("Air conditioner", "වායු සමීකරණය", "hvac", 12), a("Ceiling fan", "සිවිලිම් විදුලි පංකාව", "appliance", 15)],
  },
  {
    en: "Bathroom",
    si: "නාන කාමරය",
    kind: "room",
    match: ["bath", "toilet", "wc", "shower", "නාන", "වැසිකිළිය"],
    assets: [a("Water heater", "ජල තාපකය", "plumbing", 10), a("Exhaust fan", "වාතය පිටකරන පංකාව", "appliance", 10)],
  },
  {
    en: "Balcony",
    si: "බැල්කනිය",
    kind: "area",
    match: ["balcony", "terrace", "patio", "බැල්කනි", "ටෙරස්"],
    assets: [a("AC outdoor unit", "AC පිටත ඒකකය", "hvac", 12), a("Clothes dryer", "රෙදි වියළන යන්ත්‍රය", "appliance", 12)],
  },
];

export const COMPANY_SPACES: SpaceTemplate[] = [
  {
    en: "Reception",
    si: "පිළිගැනීමේ ස්ථානය",
    kind: "area",
    match: ["reception", "lobby", "entrance", "front desk", "පිළිගැනීම", "ප්‍රවේශ"],
    assets: [
      a("Access control", "ප්‍රවේශ පාලනය", "security", 10),
      a("CCTV system", "CCTV පද්ධතිය", "security", 8),
      a("Fire extinguisher", "ගිනි නිවනය", "security", 10),
      a("Elevator", "සෝපානය", "structure", 25),
    ],
  },
  {
    en: "Office floor",
    si: "කාර්යාල මහල",
    kind: "floor",
    match: ["office", "floor", "workspace", "open plan", "කාර්යාල", "මහල"],
    assets: [
      a("HVAC unit", "HVAC ඒකකය", "hvac", 15),
      a("Printer", "මුද්‍රණ යන්ත්‍රය", "appliance", 5),
      a("Emergency lighting", "හදිසි ආලෝකකරණය", "electrical", 10),
      a("Fire extinguisher", "ගිනි නිවනය", "security", 10),
    ],
  },
  {
    en: "Meeting room",
    si: "රැස්වීම් කාමරය",
    kind: "room",
    match: ["meeting", "conference", "board", "රැස්වීම්", "සම්මන්ත්‍රණ"],
    assets: [
      a("Display / projector", "තිරය / ප්‍රක්ෂේපකය", "appliance", 6),
      a("Video conferencing kit", "වීඩියෝ සම්මන්ත්‍රණ කට්ටලය", "other", 5),
      a("Air conditioner", "වායු සමීකරණය", "hvac", 12),
    ],
  },
  {
    en: "Kitchen / break room",
    si: "මුළුතැන්ගෙය / විවේක කාමරය",
    kind: "room",
    match: ["kitchen", "break", "pantry", "canteen", "cafeteria", "මුළුතැන්", "විවේක", "ආපනශාලා"],
    assets: [
      a("Refrigerator", "ශීතකරණය", "appliance", 12),
      a("Coffee machine", "කෝපි යන්ත්‍රය", "appliance", 6),
      a("Water dispenser", "ජල බෙදාහරින යන්ත්‍රය", "appliance", 8),
      a("Microwave", "මයික්‍රෝවේව් උඳුන", "appliance", 9),
    ],
  },
  {
    en: "Server / IT room",
    si: "සර්වර් / IT කාමරය",
    kind: "room",
    match: ["server", "it room", "data", "comms", "සර්වර්"],
    assets: [
      a("Server rack", "සර්වර් රාක්කය", "electrical", 8),
      a("UPS", "UPS", "electrical", 8),
      a("Network switch", "ජාල ස්විචය", "electrical", 7),
      a("Precision AC", "නිරවද්‍ය AC", "hvac", 12),
    ],
  },
  {
    en: "Plant room",
    si: "යන්ත්‍රාගාරය",
    kind: "room",
    match: ["plant", "mechanical", "electrical room", "utility", "boiler", "යන්ත්‍රාගාර"],
    assets: [
      a("Generator", "ජනකය", "electrical", 20),
      a("Fire alarm panel", "ගිනි අනතුරු ඇඟවීමේ පුවරුව", "security", 15),
      a("Water pump", "ජල පොම්පය", "water", 10),
      a("Main switchboard", "ප්‍රධාන ස්විච් පුවරුව", "electrical", 30),
    ],
  },
  {
    en: "Parking & exterior",
    si: "වාහන නැවතුම සහ පිටත",
    kind: "exterior",
    match: ["parking", "exterior", "car park", "garage", "yard", "outside", "roof", "නැවතුම", "පිටත", "වහළය"],
    assets: [
      a("Gate / barrier motor", "ගේට්ටු / බාධක මෝටරය", "security", 10),
      a("CCTV cameras", "CCTV කැමරා", "security", 8),
      a("Exterior lighting", "පිටත ආලෝකකරණය", "electrical", 15),
    ],
  },
];

export const OTHER_SPACES: SpaceTemplate[] = [
  {
    en: "Main area",
    si: "ප්‍රධාන ප්‍රදේශය",
    kind: "area",
    match: ["main", "hall", "classroom", "ward", "shop", "floor", "ප්‍රධාන", "ශාලාව", "පන්ති"],
    assets: [
      a("Air conditioner", "වායු සමීකරණය", "hvac", 12),
      a("Fire extinguisher", "ගිනි නිවනය", "security", 10),
      a("Lighting", "ආලෝකකරණය", "electrical", 15),
    ],
  },
  {
    en: "Storage",
    si: "ගබඩාව",
    kind: "room",
    match: ["storage", "store", "warehouse", "shed", "ගබඩා"],
    assets: [a("Dehumidifier", "තෙතමනය ඉවත් කරන යන්ත්‍රය", "appliance", 8), a("Shelving / racking", "රාක්ක", "structure", 20)],
  },
  {
    en: "Exterior",
    si: "පිටත",
    kind: "exterior",
    match: ["exterior", "outside", "yard", "garden", "roof", "farm", "field", "පිටත", "වත්ත", "ගොවිපළ"],
    assets: [
      a("Water tank", "ජල ටැංකිය", "water", 20),
      a("Water pump", "ජල පොම්පය", "water", 10),
      a("Generator", "ජනකය", "electrical", 20),
      a("Solar system", "සූර්ය බලශක්ති පද්ධතිය", "solar", 25),
    ],
  },
];

// Everyday names people use for the same equipment (English).
const ALIASES: Record<string, string[]> = {
  "air conditioner": ["ac", "a/c", "air con", "aircon", "air conditioning", "split", "වායු සමීකරණ"],
  "hvac unit": ["hvac", "ac", "air handler"],
  refrigerator: ["fridge", "freezer", "ශීතකරණ", "ෆ්‍රිජ්"],
  tv: ["television", "රූපවාහිනි", "ටීවී"],
  "water heater": ["geyser", "hot water", "boiler", "heater", "ගීසර්", "තාපක"],
  "washing machine": ["washer", "රෙදි සෝදන"],
  "clothes dryer": ["dryer", "tumble"],
  "wi-fi router": ["router", "wifi", "modem", "රවුටර"],
  "solar system": ["solar", "pv", "සූර්ය"],
  "water pump": ["pump", "පොම්ප"],
  "ceiling fan": ["fan", "පංකාව"],
  oven: ["stove", "range", "cooker", "උඳුන"],
  cooktop: ["hob", "stove", "ලිප"],
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
// Word boundaries only make sense for Latin script; Sinhala terms match as substrings.
const contains = (haystack: string, term: string) =>
  /[a-z]/.test(term) ? new RegExp(`(^|[^a-z])${escape(term)}([^a-z]|$)`).test(haystack) : haystack.includes(term);

/** True if one of the existing names already covers this template item (either language). */
export function alreadyHas(existingNames: string[], item: AssetTemplate) {
  const key = item.en.toLowerCase();
  const terms = [key, item.si, ...(ALIASES[key] ?? [])];
  return existingNames.some((raw) => {
    const n = raw.toLowerCase();
    return terms.some((t) => contains(n, t));
  });
}

const ALL = [...HOME_SPACES, ...APARTMENT_SPACES, ...COMPANY_SPACES, ...OTHER_SPACES];

/** Finds the template for a room by its name, preferring the given set, then any set. */
export function templateForSpace(spaceName: string, preferred: SpaceTemplate[]): SpaceTemplate | null {
  const n = spaceName.toLowerCase();
  // The room type is usually the last word ("Guest WC", "Main bedroom"), so the
  // keyword that appears furthest into the name wins.
  const find = (list: SpaceTemplate[]) => {
    const exact = list.find((t) => t.en.toLowerCase() === n || t.si === spaceName.trim());
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
