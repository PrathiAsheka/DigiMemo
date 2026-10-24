import Image, { type StaticImageData } from "next/image";
import type { Illustration } from "@/lib/profiles";
import { Scene } from "./illustrations";
import apartmentBuilding from "@/assets/photos/apartment-building.jpg";
import apartmentInterior from "@/assets/photos/apartment-interior.jpg";
import homeCozyLiving from "@/assets/photos/home-cozy-living.jpg";
import homeSmartLiving from "@/assets/photos/home-smart-living.jpg";
import officeCorridor from "@/assets/photos/office-corridor.jpg";
import officeOpenPlan from "@/assets/photos/office-open-plan.jpg";
// "Other place" photo: Yunfan Li on Unsplash (Unsplash License).
import otherBuilding from "@/assets/photos/other-building.jpg";

// Photography per kind of place. "card" is the recognisable exterior/overview shot used
// for choices and property cards; "hero" is a moodier interior for wide banners (currently
// unused since the dashboard banner was removed, kept for future pages)
// text. Kinds without a photo fall back to the SVG illustration.

type Variant = "card" | "hero";

// `focus` is the object-position that keeps each photo's subject in frame when it is
// cropped to a wide banner (all source photos are portrait or square).
type Photo = { src: StaticImageData; alt: string; focus: string };

const PHOTOS: Partial<Record<Illustration, Record<Variant, Photo>>> = {
  house: {
    card: { src: homeCozyLiving, alt: "Cozy living room with smart home devices", focus: "center 38%" },
    hero: { src: homeSmartLiving, alt: "Modern smart home living room with warm lighting", focus: "center 60%" },
  },
  apartment: {
    card: { src: apartmentBuilding, alt: "Apartment building at dusk", focus: "center 40%" },
    hero: { src: apartmentInterior, alt: "Modern studio apartment interior", focus: "center 42%" },
  },
  office: {
    card: { src: officeOpenPlan, alt: "Bright open-plan office", focus: "center 55%" },
    hero: { src: officeCorridor, alt: "Office corridor with glass meeting rooms", focus: "center 45%" },
  },
  place: {
    card: { src: otherBuilding, alt: "White building with large windows behind green plants", focus: "center 55%" },
    hero: { src: otherBuilding, alt: "White building with large windows behind green plants", focus: "center 55%" },
  },
};

export const LOGIN_PHOTO = homeSmartLiving;
export const LOGIN_THUMBS = [
  { src: homeCozyLiving, label: "Homes" }, // login background is the smart-living shot
  { src: apartmentBuilding, label: "Apartments" },
  { src: officeOpenPlan, label: "Offices" },
];

export function PlacePhoto({
  kind,
  variant = "card",
  className = "",
  sizes = "(min-width: 1024px) 33vw, 100vw",
  eager = false,
  position,
}: {
  kind: Illustration;
  variant?: Variant;
  className?: string;
  sizes?: string;
  eager?: boolean;
  /** Overrides the photo's own focus point. */
  position?: string;
}) {
  const photo = PHOTOS[kind]?.[variant];
  if (!photo) return <Scene kind={kind} className={className} />;
  // `fill` needs a positioned parent; keep the caller's `absolute` if they passed one.
  const positioned = /\b(absolute|fixed)\b/.test(className) ? "" : "relative";
  return (
    <div className={`${positioned} overflow-hidden ${className}`}>
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes={sizes}
        placeholder="blur"
        loading={eager ? "eager" : "lazy"}
        className="object-cover"
        style={{ objectPosition: position ?? photo.focus }}
      />
    </div>
  );
}
