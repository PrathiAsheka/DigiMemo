// What the user manages. Everything that should read differently for a family home
// versus an office lives here, so pages stay generic.

import { APARTMENT_SPACES, COMPANY_SPACES, HOME_SPACES, OTHER_SPACES, type SpaceTemplate } from "./space-templates";

export const USE_CASES =["home", "apartment", "company", "other"] as const;
export type UseCase = (typeof USE_CASES)[number];

export type Illustration = "house" | "apartment" | "office" | "place";

export type Profile = {
  id: UseCase;
  choiceTitle: string;
  choiceDescription: string;
  illustration: Illustration;
  /** Singular/plural noun for a property in this context. */
  noun: string;
  nounPlural: string;
  navLabel: string;
  propertyType: string;
  namePlaceholder: string;
  heroTagline: string;
  propertiesDescription: string;
  /** Typical rooms with their typical equipment (src/lib/space-templates.ts). */
  spaces: SpaceTemplate[];
  assetSuggestions: string[];
  taskSuggestions: { title: string; intervalDays: number | null }[];
};

const PROFILES: Record<UseCase, Profile> = {
  home: {
    id: "home",
    choiceTitle: "Personal home",
    choiceDescription: "A house you own or rent: appliances, garden, solar, the boiler and everything in between.",
    illustration: "house",
    noun: "home",
    nounPlural: "homes",
    navLabel: "My home",
    propertyType: "house",
    namePlaceholder: "e.g. Family home",
    heroTagline: "Your home at a glance",
    propertiesDescription: "Each home keeps its own rooms, appliances, documents and maintenance history.",
    spaces: HOME_SPACES,
    assetSuggestions: ["Refrigerator", "Washing machine", "Dishwasher", "Oven", "Air conditioner", "Water heater", "Solar system", "Water pump", "Smoke alarm", "Lawn mower"],
    taskSuggestions: [
      { title: "Test smoke alarms", intervalDays: 30 },
      { title: "Clean AC filters", intervalDays: 90 },
      { title: "Clear gutters", intervalDays: 180 },
      { title: "Flush water heater", intervalDays: 365 },
      { title: "Service the boiler / heating", intervalDays: 365 },
    ],
  },
  apartment: {
    id: "apartment",
    choiceTitle: "Apartment",
    choiceDescription: "A flat or condo: your appliances and fittings, plus what to report to building management.",
    illustration: "apartment",
    noun: "apartment",
    nounPlural: "apartments",
    navLabel: "My apartment",
    propertyType: "apartment",
    namePlaceholder: "e.g. City apartment",
    heroTagline: "Your apartment at a glance",
    propertiesDescription: "Track the appliances and fittings you're responsible for in each apartment.",
    spaces: APARTMENT_SPACES,
    assetSuggestions: ["Refrigerator", "Washing machine", "Microwave", "Air conditioner", "Water heater", "Extractor fan", "Intercom", "Smoke alarm", "Water filter"],
    taskSuggestions: [
      { title: "Test smoke alarm", intervalDays: 30 },
      { title: "Clean AC filters", intervalDays: 90 },
      { title: "Clean extractor fan filter", intervalDays: 90 },
      { title: "Check sink and shower drains", intervalDays: 180 },
      { title: "Replace water filter", intervalDays: 180 },
    ],
  },
  company: {
    id: "company",
    choiceTitle: "Company or business",
    choiceDescription: "Offices, shops, restaurants or facilities: equipment, contractors, work orders and budgets.",
    illustration: "office",
    noun: "site",
    nounPlural: "sites",
    navLabel: "Sites",
    propertyType: "commercial",
    namePlaceholder: "e.g. Head office",
    heroTagline: "Your facilities at a glance",
    propertiesDescription: "Each site keeps its own floors, equipment, contracts, work orders and maintenance budget.",
    spaces: COMPANY_SPACES,
    assetSuggestions: ["HVAC unit", "Generator", "Fire extinguisher", "Fire alarm panel", "Elevator", "UPS", "Server rack", "CCTV system", "Access control", "Water dispenser", "Printer"],
    taskSuggestions: [
      { title: "Inspect fire extinguishers", intervalDays: 30 },
      { title: "Test generator", intervalDays: 30 },
      { title: "Service HVAC", intervalDays: 90 },
      { title: "Test emergency lighting", intervalDays: 90 },
      { title: "Fire alarm system inspection", intervalDays: 180 },
      { title: "Elevator inspection", intervalDays: 365 },
    ],
  },
  other: {
    id: "other",
    choiceTitle: "Other place",
    choiceDescription: "A holiday home, school, clinic, warehouse, farm or anything else you need to look after.",
    illustration: "place",
    noun: "place",
    nounPlural: "places",
    navLabel: "Places",
    propertyType: "other",
    namePlaceholder: "e.g. Lake cabin",
    heroTagline: "Your places at a glance",
    propertiesDescription: "Each place keeps its own areas, equipment, documents and maintenance history.",
    spaces: OTHER_SPACES,
    assetSuggestions: ["Air conditioner", "Water pump", "Generator", "Water tank", "Solar system", "Security system", "Fire extinguisher"],
    taskSuggestions: [
      { title: "General inspection", intervalDays: 90 },
      { title: "Check fire extinguisher", intervalDays: 180 },
      { title: "Clean water tank", intervalDays: 180 },
      { title: "Service water pump", intervalDays: 365 },
    ],
  },
};

export function getProfile(useCase: string | null | undefined): Profile {
  return PROFILES[(useCase as UseCase) ?? "home"] ?? PROFILES.home;
}

export function allProfiles() {
  return USE_CASES.map((u) => PROFILES[u]);
}

/** "a home", "an apartment". */
export function withArticle(noun: string) {
  return `${/^[aeiou]/i.test(noun) ? "an" : "a"} ${noun}`;
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Profile whose defaults fit a property of this type (a company user can still add a house). */
export function profileForPropertyType(type: string, fallback: Profile): Profile {
  switch (type) {
    case "house":
    case "townhouse":
      return PROFILES.home;
    case "apartment":
    case "condo":
      return PROFILES.apartment;
    case "commercial":
      return PROFILES.company;
    default:
      return fallback;
  }
}

/** The picture for a specific property, falling back to the user's profile. */
export function illustrationForPropertyType(type: string, fallback: Illustration): Illustration {
  switch (type) {
    case "house":
    case "townhouse":
      return "house";
    case "apartment":
    case "condo":
      return "apartment";
    case "commercial":
      return "office";
    default:
      return fallback;
  }
}
