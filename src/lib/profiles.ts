// What the user manages. Everything that should read differently for a family home
// versus an office lives here, so pages stay generic. Text is provided per language.

import type { Locale } from "@/i18n/config";
import { APARTMENT_SPACES, COMPANY_SPACES, HOME_SPACES, OTHER_SPACES, type SpaceTemplate } from "./space-templates";

export const USE_CASES = ["home", "apartment", "company", "other"] as const;
export type UseCase = (typeof USE_CASES)[number];

export type Illustration = "house" | "apartment" | "office" | "place";

type ProfileText = {
  choiceTitle: string;
  choiceDescription: string;
  /** Singular/plural noun for a property in this context. */
  noun: string;
  nounPlural: string;
  /** Title-case plural for headings ("Homes"). */
  pluralTitle: string;
  /** Indefinite form ("a home", "an apartment", "නිවසක්"). */
  aNoun: string;
  navLabel: string;
  namePlaceholder: string;
  heroTagline: string;
  propertiesDescription: string;
  assetSuggestions: string[];
  taskSuggestions: { title: string; intervalDays: number | null }[];
};

type ProfileBase = {
  id: UseCase;
  illustration: Illustration;
  propertyType: string;
  /** Typical rooms with their typical equipment (src/lib/space-templates.ts). */
  spaces: SpaceTemplate[];
};

export type Profile = ProfileBase & ProfileText & { locale: Locale };

const BASE: Record<UseCase, ProfileBase> = {
  home: { id: "home", illustration: "house", propertyType: "house", spaces: HOME_SPACES },
  apartment: { id: "apartment", illustration: "apartment", propertyType: "apartment", spaces: APARTMENT_SPACES },
  company: { id: "company", illustration: "office", propertyType: "commercial", spaces: COMPANY_SPACES },
  other: { id: "other", illustration: "place", propertyType: "other", spaces: OTHER_SPACES },
};

const TEXT: Record<Locale, Record<UseCase, ProfileText>> = {
  en: {
    home: {
      choiceTitle: "Personal home",
      choiceDescription: "A house you own or rent: appliances, garden, solar, the boiler and everything in between.",
      noun: "home",
      nounPlural: "homes",
      pluralTitle: "Homes",
      aNoun: "a home",
      navLabel: "My home",
      namePlaceholder: "e.g. Family home",
      heroTagline: "Your home at a glance",
      propertiesDescription: "Each home keeps its own rooms, appliances, documents and maintenance history.",
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
      choiceTitle: "Apartment",
      choiceDescription: "A flat or condo: your appliances and fittings, plus what to report to building management.",
      noun: "apartment",
      nounPlural: "apartments",
      pluralTitle: "Apartments",
      aNoun: "an apartment",
      navLabel: "My apartment",
      namePlaceholder: "e.g. City apartment",
      heroTagline: "Your apartment at a glance",
      propertiesDescription: "Track the appliances and fittings you're responsible for in each apartment.",
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
      choiceTitle: "Company or business",
      choiceDescription: "Offices, shops, restaurants or facilities: equipment, contractors, work orders and budgets.",
      noun: "site",
      nounPlural: "sites",
      pluralTitle: "Sites",
      aNoun: "a site",
      navLabel: "Sites",
      namePlaceholder: "e.g. Head office",
      heroTagline: "Your facilities at a glance",
      propertiesDescription: "Each site keeps its own floors, equipment, contracts, work orders and maintenance budget.",
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
      choiceTitle: "Other place",
      choiceDescription: "A holiday home, school, clinic, warehouse, farm or anything else you need to look after.",
      noun: "place",
      nounPlural: "places",
      pluralTitle: "Places",
      aNoun: "a place",
      navLabel: "Places",
      namePlaceholder: "e.g. Lake cabin",
      heroTagline: "Your places at a glance",
      propertiesDescription: "Each place keeps its own areas, equipment, documents and maintenance history.",
      assetSuggestions: ["Air conditioner", "Water pump", "Generator", "Water tank", "Solar system", "Security system", "Fire extinguisher"],
      taskSuggestions: [
        { title: "General inspection", intervalDays: 90 },
        { title: "Check fire extinguisher", intervalDays: 180 },
        { title: "Clean water tank", intervalDays: 180 },
        { title: "Service water pump", intervalDays: 365 },
      ],
    },
  },
  si: {
    home: {
      choiceTitle: "පෞද්ගලික නිවස",
      choiceDescription: "ඔබ හිමි හෝ කුලියට ගත් නිවසක්: ගෘහ උපකරණ, වත්ත, සූර්ය පැනල, ජල තාපකය සහ අනෙක් සියල්ල.",
      noun: "නිවස",
      nounPlural: "නිවාස",
      pluralTitle: "නිවාස",
      aNoun: "නිවසක්",
      navLabel: "මගේ නිවස",
      namePlaceholder: "උදා: පවුලේ නිවස",
      heroTagline: "ඔබේ නිවස එක බැල්මකින්",
      propertiesDescription: "සෑම නිවසකටම තමන්ගේම කාමර, ගෘහ උපකරණ, ලේඛන සහ නඩත්තු ඉතිහාසයක් ඇත.",
      assetSuggestions: ["ශීතකරණය", "රෙදි සෝදන යන්ත්‍රය", "පිඟන් සෝදන යන්ත්‍රය", "උඳුන", "වායු සමීකරණය", "ජල තාපකය", "සූර්ය බලශක්ති පද්ධතිය", "ජල පොම්පය", "දුම් අනතුරු ඇඟවීම", "තණකොළ කපන යන්ත්‍රය"],
      taskSuggestions: [
        { title: "දුම් අනතුරු ඇඟවීම් පරීක්ෂා කරන්න", intervalDays: 30 },
        { title: "AC පෙරහන් පිරිසිදු කරන්න", intervalDays: 90 },
        { title: "වැසි පීලි පිරිසිදු කරන්න", intervalDays: 180 },
        { title: "ජල තාපකය සෝදා හරින්න", intervalDays: 365 },
        { title: "බොයිලරය / තාපන පද්ධතිය සේවා කරන්න", intervalDays: 365 },
      ],
    },
    apartment: {
      choiceTitle: "මහල් නිවාසය",
      choiceDescription: "මහල් නිවාසයක් හෝ කොන්ඩෝ: ඔබේ ගෘහ උපකරණ සහ සවිකිරීම්, සහ ගොඩනැගිලි කළමනාකරණයට දැනුම් දිය යුතු දේ.",
      noun: "මහල් නිවාසය",
      nounPlural: "මහල් නිවාස",
      pluralTitle: "මහල් නිවාස",
      aNoun: "මහල් නිවාසයක්",
      navLabel: "මගේ මහල් නිවාසය",
      namePlaceholder: "උදා: නගරයේ මහල් නිවාසය",
      heroTagline: "ඔබේ මහල් නිවාසය එක බැල්මකින්",
      propertiesDescription: "සෑම මහල් නිවාසයකම ඔබ වගකිව යුතු ගෘහ උපකරණ සහ සවිකිරීම් පිළිබඳව සොයා බලන්න.",
      assetSuggestions: ["ශීතකරණය", "රෙදි සෝදන යන්ත්‍රය", "මයික්‍රෝවේව් උඳුන", "වායු සමීකරණය", "ජල තාපකය", "දුම් පිටකරන පංකාව", "ඉන්ටර්කොම්", "දුම් අනතුරු ඇඟවීම", "ජල පෙරහන"],
      taskSuggestions: [
        { title: "දුම් අනතුරු ඇඟවීම පරීක්ෂා කරන්න", intervalDays: 30 },
        { title: "AC පෙරහන් පිරිසිදු කරන්න", intervalDays: 90 },
        { title: "දුම් පිටකරන පංකාවේ පෙරහන පිරිසිදු කරන්න", intervalDays: 90 },
        { title: "සින්ක් සහ ෂවර් කාණු පරීක්ෂා කරන්න", intervalDays: 180 },
        { title: "ජල පෙරහන මාරු කරන්න", intervalDays: 180 },
      ],
    },
    company: {
      choiceTitle: "සමාගම හෝ ව්‍යාපාරය",
      choiceDescription: "කාර්යාල, සාප්පු, අවන්හල් හෝ පහසුකම්: උපකරණ, කොන්ත්‍රාත්කරුවන්, වැඩ ඇණවුම් සහ අයවැය.",
      noun: "ස්ථානය",
      nounPlural: "ස්ථාන",
      pluralTitle: "ස්ථාන",
      aNoun: "ස්ථානයක්",
      navLabel: "ස්ථාන",
      namePlaceholder: "උදා: ප්‍රධාන කාර්යාලය",
      heroTagline: "ඔබේ පහසුකම් එක බැල්මකින්",
      propertiesDescription: "සෑම ස්ථානයකටම තමන්ගේම මහල්, උපකරණ, ගිවිසුම්, වැඩ ඇණවුම් සහ නඩත්තු අයවැයක් ඇත.",
      assetSuggestions: ["HVAC ඒකකය", "ජනකය", "ගිනි නිවනය", "ගිනි අනතුරු ඇඟවීමේ පුවරුව", "සෝපානය", "UPS", "සර්වර් රාක්කය", "CCTV පද්ධතිය", "ප්‍රවේශ පාලනය", "ජල බෙදාහරින යන්ත්‍රය", "මුද්‍රණ යන්ත්‍රය"],
      taskSuggestions: [
        { title: "ගිනි නිවන උපකරණ පරීක්ෂා කරන්න", intervalDays: 30 },
        { title: "ජනකය පරීක්ෂා කරන්න", intervalDays: 30 },
        { title: "HVAC සේවා කරන්න", intervalDays: 90 },
        { title: "හදිසි ආලෝකකරණය පරීක්ෂා කරන්න", intervalDays: 90 },
        { title: "ගිනි අනතුරු ඇඟවීම් පද්ධති පරීක්ෂාව", intervalDays: 180 },
        { title: "සෝපාන පරීක්ෂාව", intervalDays: 365 },
      ],
    },
    other: {
      choiceTitle: "වෙනත් ස්ථානයක්",
      choiceDescription: "නිවාඩු නිවසක්, පාසලක්, සායනයක්, ගබඩාවක්, ගොවිපළක් හෝ ඔබ බලාකියා ගත යුතු වෙනත් ඕනෑම දෙයක්.",
      noun: "ස්ථානය",
      nounPlural: "ස්ථාන",
      pluralTitle: "ස්ථාන",
      aNoun: "ස්ථානයක්",
      navLabel: "ස්ථාන",
      namePlaceholder: "උදා: වැව අසල කුටිය",
      heroTagline: "ඔබේ ස්ථාන එක බැල්මකින්",
      propertiesDescription: "සෑම ස්ථානයකටම තමන්ගේම ප්‍රදේශ, උපකරණ, ලේඛන සහ නඩත්තු ඉතිහාසයක් ඇත.",
      assetSuggestions: ["වායු සමීකරණය", "ජල පොම්පය", "ජනකය", "ජල ටැංකිය", "සූර්ය බලශක්ති පද්ධතිය", "ආරක්ෂක පද්ධතිය", "ගිනි නිවනය"],
      taskSuggestions: [
        { title: "සාමාන්‍ය පරීක්ෂාව", intervalDays: 90 },
        { title: "ගිනි නිවනය පරීක්ෂා කරන්න", intervalDays: 180 },
        { title: "ජල ටැංකිය පිරිසිදු කරන්න", intervalDays: 180 },
        { title: "ජල පොම්පය සේවා කරන්න", intervalDays: 365 },
      ],
    },
  },
};

const build = (id: UseCase, locale: Locale): Profile => ({ ...BASE[id], ...TEXT[locale][id], locale });

export function getProfile(useCase: string | null | undefined, locale: Locale = "en"): Profile {
  const id = (USE_CASES as readonly string[]).includes(useCase ?? "") ? (useCase as UseCase) : "home";
  return build(id, locale);
}

export function allProfiles(locale: Locale = "en") {
  return USE_CASES.map((u) => build(u, locale));
}

/** Profile whose defaults fit a property of this type (a company user can still add a house). */
export function profileForPropertyType(type: string, fallback: Profile): Profile {
  switch (type) {
    case "house":
    case "townhouse":
      return build("home", fallback.locale);
    case "apartment":
    case "condo":
      return build("apartment", fallback.locale);
    case "commercial":
      return build("company", fallback.locale);
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
