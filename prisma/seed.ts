// Demo data for local development: `npm run db:seed`.
// Sign in with DEMO_EMAIL / DEMO_PASSWORD below (local test account only).
//
// Fills every section with realistic test data: three properties (a house, an
// apartment and an office), rooms, equipment, warranties, maintenance, work orders in
// every state, costs, providers and real document files, including one receipt waiting
// on the AI review screen so that flow can be tried without an API key.
import bcrypt from "bcryptjs";
import { PrismaClient, type Prisma } from "@prisma/client";
import { labelPhoto, productPhoto, type ProductKind } from "./demo-images";
import { deleteStoredFile, saveFile } from "../src/lib/file-store";

const DEMO_EMAIL = "demo@hometwin.test";
const DEMO_PASSWORD = "demo-twin-2026";
// Second demo account set up as a business (café + warehouse), same password.
const BUSINESS_EMAIL = "business@hometwin.test";

const db = new PrismaClient();
const DAY = 86_400_000;
const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
const ago = (days: number) => new Date(today.getTime() - days * DAY);
const ahead = (days: number) => new Date(today.getTime() + days * DAY);
const iso = (d: Date) => d.toISOString().slice(0, 10);

// ── Tiny file generators for demo documents ─────────────────────────────────

/** A minimal one-page PDF with plain text lines (enough for viewers and AI). */
function makePdf(lines: string[]) {
  const esc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  const text = lines.map((l, i) => `BT /F1 ${i === 0 ? 18 : 11} Tf 56 ${770 - i * 22} Td (${esc(l)}) Tj ET`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(out));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((n) => `${String(n).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out);
}

const MIME: Record<string, string> = { ".pdf": "application/pdf", ".txt": "text/plain", ".jpg": "image/jpeg" };

// Local uploads folder, or the Vercel Blob store when BLOB_READ_WRITE_TOKEN is set.
const storeFile = (propertyId: string, ext: string, data: Buffer) => saveFile(propertyId, `file${ext}`, data, MIME[ext]);

async function addDocument(opts: {
  propertyId: string;
  assetId?: string;
  workOrderId?: string;
  memberId?: string;
  filename: string;
  kind: string;
  lines: string[];
  createdAt: Date;
  extractionStatus?: string;
  extraction?: unknown;
}) {
  const isPdf = opts.filename.endsWith(".pdf");
  const data = isPdf ? makePdf(opts.lines) : Buffer.from(opts.lines.join("\n") + "\n");
  return db.document.create({
    data: {
      propertyId: opts.propertyId,
      assetId: opts.assetId,
      workOrderId: opts.workOrderId,
      memberId: opts.memberId,
      filename: opts.filename,
      mimeType: isPdf ? "application/pdf" : "text/plain",
      sizeBytes: data.length,
      storageKey: await storeFile(opts.propertyId, isPdf ? ".pdf" : ".txt", data),
      kind: opts.kind,
      extractionStatus: opts.extractionStatus ?? "none",
      extraction: opts.extraction ? JSON.stringify(opts.extraction) : null,
      createdAt: opts.createdAt,
    },
  });
}

type In<T> = Omit<T, "propertyId">;

const addMember = (propertyId: string, data: In<Prisma.MemberUncheckedCreateInput>) =>
  db.member.create({ data: { ...data, propertyId } });

const yearsAgo = (years: number) => ago(Math.round(years * 365.25));

/** Attaches a product shot (and optionally a rating-label close-up) to an equipment item. */
async function addPhotos(
  propertyId: string,
  asset: { id: string; name: string; manufacturer?: string | null; model?: string | null; serialNumber?: string | null },
  kind: ProductKind,
  opts: { where: string; takenDaysAgo: number; label?: [string, string][] },
) {
  const title = [asset.manufacturer, asset.model].filter(Boolean).join(" ") || asset.name;
  const shots: { data: Buffer; caption: string; name: string }[] = [
    { data: await productPhoto(kind, title, `${asset.name} · ${opts.where}`), caption: "Front view", name: "front.jpg" },
  ];
  if (opts.label) {
    shots.push({ data: await labelPhoto(asset.manufacturer ?? asset.name, opts.label), caption: "Model / serial label", name: "label.jpg" });
  }
  for (const [i, shot] of shots.entries()) {
    await db.document.create({
      data: {
        propertyId,
        assetId: asset.id,
        filename: `${asset.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${shot.name}`,
        mimeType: "image/jpeg",
        sizeBytes: shot.data.length,
        storageKey: await storeFile(propertyId, ".jpg", shot.data),
        kind: "photo",
        caption: shot.caption,
        // The front view is the newest, so it becomes the cover photo.
        createdAt: new Date(ago(opts.takenDaysAgo).getTime() + (shots.length - i) * 60_000),
      },
    });
  }
}

const labelOf = (a: { model?: string | null; serialNumber?: string | null }, extra: [string, string][] = []): [string, string][] => [
  ...(a.model ? ([["MODEL", a.model]] as [string, string][]) : []),
  ...(a.serialNumber ? ([["SERIAL NO.", a.serialNumber]] as [string, string][]) : []),
  ...extra,
];

async function main() {
  // Remove the previous demo account and its uploaded files.
  for (const email of [DEMO_EMAIL, BUSINESS_EMAIL]) {
    const old = await db.user.findUnique({
      where: { email },
      include: { properties: { include: { documents: { select: { storageKey: true } } } } },
    });
    if (!old) continue;
    for (const p of old.properties) for (const d of p.documents) await deleteStoredFile(d.storageKey);
    await db.user.delete({ where: { id: old.id } });
  }

  const user = await db.user.create({
    data: { email: DEMO_EMAIL, name: "Demo Owner", passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12), useCase: "home" },
  });

  // ── Providers ─────────────────────────────────────────────────────────────
  const provider = (name: string, category: string, phone: string, email: string, notes?: string) =>
    db.serviceProvider.create({ data: { ownerId: user.id, name, category, phone, email, notes } });
  const coolAir = await provider("CoolAir Services", "HVAC", "555-0142", "bookings@coolair.example", "Annual AC contract, 10% off parts");
  const rapid = await provider("Rapid Plumbing", "Plumbing", "555-0199", "jobs@rapidplumbing.example", "24/7 emergency line");
  const sunTech = await provider("SunTech Solar", "Solar", "555-0170", "care@suntech.example");
  const brightSpark = await provider("BrightSpark Electrical", "Electrical (licensed)", "555-0123", "office@brightspark.example", "Licence #EL-48213");
  const fixIt = await provider("FixIt Appliances", "Appliance repair", "555-0188", "hello@fixit.example");
  const guardFire = await provider("GuardFire Safety", "Fire safety & compliance", "555-0111", "service@guardfire.example", "Quarterly extinguisher checks");

  // Helpers bound to one property.
  function forProperty(propertyId: string) {
    return {
      space: async (name: string, kind = "room") => (await db.space.create({ data: { propertyId, name, kind } })).id,
      asset: (data: In<Prisma.AssetUncheckedCreateInput>) => db.asset.create({ data: { ...data, propertyId } }),
      task: (data: In<Prisma.MaintenanceTaskUncheckedCreateInput>) =>
        db.maintenanceTask.create({ data: { ...data, propertyId } }),
      order: (data: In<Prisma.WorkOrderUncheckedCreateInput>) =>
        db.workOrder.create({ data: { ...data, propertyId } }),
      cost: (data: In<Prisma.CostRecordUncheckedCreateInput>) =>
        db.costRecord.create({ data: { ...data, propertyId } }),
    };
  }

  // ═══ 1. Family home ═══════════════════════════════════════════════════════
  const home = await db.property.create({
    data: {
      ownerId: user.id, name: "Family home", type: "house", address: "12 Lake Road", yearBuilt: 2009,
      notes: "Main water shut-off is under the kitchen sink. Electrical panel in the garage.",
    },
  });
  const H = forProperty(home.id);
  const kitchen = await H.space("Kitchen");
  const living = await H.space("Living Room");
  const bedroom = await H.space("Main Bedroom");
  const bathroom = await H.space("Bathroom");
  const laundry = await H.space("Laundry");
  const exterior = await H.space("Exterior", "exterior");
  const garage = await H.space("Garage", "area");

  const fridge = await H.asset({ spaceId: kitchen, name: "Refrigerator", category: "appliance", manufacturer: "Samsung", model: "RT38K5032S8", serialNumber: "0A8Z4BCK300121", purchaseDate: ago(400), purchasePrice: 899, expectedLifeYears: 12 });
  await H.asset({ spaceId: kitchen, name: "Oven", category: "appliance", manufacturer: "Bosch", model: "HBF113BR0A", purchaseDate: ago(2100), purchasePrice: 620, expectedLifeYears: 15 });
  const dishwasher = await H.asset({ spaceId: kitchen, name: "Dishwasher", category: "appliance", manufacturer: "Bosch", model: "SMS24AW01", purchaseDate: ago(1300), purchasePrice: 540, expectedLifeYears: 10 });
  const washer = await H.asset({ spaceId: laundry, name: "Washing machine", category: "appliance", manufacturer: "LG", model: "F4V5VYP0W", purchaseDate: ago(3300), purchasePrice: 640, expectedLifeYears: 10, notes: "Drum bearing noisy on spin" });
  const dryer = await H.asset({ spaceId: laundry, name: "Clothes dryer", category: "appliance", manufacturer: "Electrolux", purchaseDate: ago(1900), expectedLifeYears: 12 });
  const ac = await H.asset({ spaceId: living, name: "Living room AC", category: "hvac", manufacturer: "Daikin", model: "FTKM35", serialNumber: "DK35-7781204", installDate: ago(1500), purchasePrice: 1450, expectedLifeYears: 15 });
  const tv = await H.asset({ spaceId: living, name: "TV", category: "appliance", manufacturer: "Sony", model: "Bravia XR-55A80L", purchaseDate: ago(250), purchasePrice: 1599, expectedLifeYears: 8 });
  await H.asset({ spaceId: living, name: "Wi-Fi router", category: "other", manufacturer: "TP-Link", model: "Deco X55", purchaseDate: ago(700), expectedLifeYears: 5 });
  const bedAc = await H.asset({ spaceId: bedroom, name: "Bedroom AC", category: "hvac", manufacturer: "Daikin", model: "FTKM25", installDate: ago(1500), expectedLifeYears: 15 });
  await H.asset({ spaceId: bedroom, name: "Ceiling fan", category: "appliance", manufacturer: "Hunter", installDate: ago(2400), expectedLifeYears: 15 });
  const heater = await H.asset({ spaceId: bathroom, name: "Water heater", category: "plumbing", manufacturer: "Rheem", model: "Stellar 315L", purchaseDate: ago(3400), expectedLifeYears: 10, status: "needs_attention", notes: "Corrosion seen at the tank base during last service" });
  const solar = await H.asset({ spaceId: exterior, name: "Solar PV system", category: "solar", manufacturer: "SunPower", model: "Maxeon 6.6 kW", installDate: ago(900), purchasePrice: 9800, expectedLifeYears: 25 });
  const tank = await H.asset({ spaceId: exterior, name: "Water tank", category: "water", manufacturer: "Bushmans", model: "5,000 L poly", installDate: ago(2600), expectedLifeYears: 20 });
  const pump = await H.asset({ spaceId: exterior, name: "Water pump", category: "water", manufacturer: "Grundfos", model: "Scala2", installDate: ago(2000), expectedLifeYears: 10 });
  const gate = await H.asset({ spaceId: garage, name: "Garage door opener", category: "Garage door", manufacturer: "Merlin", installDate: ago(3000), expectedLifeYears: 12 }); // custom "Other" category

  await db.warranty.createMany({
    data: [
      { assetId: fridge.id, provider: "Samsung", startDate: ago(400), endDate: ahead(40), terms: "2 years parts & labour" },
      { assetId: fridge.id, provider: "Samsung", startDate: ago(400), endDate: ahead(3250), terms: "10 years compressor" },
      { assetId: ac.id, provider: "Daikin", startDate: ago(1500), endDate: ahead(325), terms: "5 years compressor" },
      { assetId: tv.id, provider: "Sony", startDate: ago(250), endDate: ahead(115), terms: "1 year manufacturer" },
      { assetId: dishwasher.id, provider: "Bosch", startDate: ago(1300), endDate: ahead(20), terms: "Extended warranty (Harvey's)" },
      { assetId: solar.id, provider: "SunPower", startDate: ago(900), endDate: ahead(8200), terms: "25 years panel performance" },
      { assetId: solar.id, provider: "SunTech Solar", startDate: ago(900), endDate: ahead(925), terms: "5 years installation workmanship" },
      { assetId: washer.id, provider: "LG", startDate: ago(3300), endDate: ago(2570) },
    ],
  });

  await addPhotos(home.id, fridge, "fridge", { where: "Kitchen", takenDaysAgo: 400, label: labelOf(fridge, [["MFG DATE", "2025-06"], ["RATED", "220-240V 1.2A"]]) });
  await addPhotos(home.id, dishwasher, "dishwasher", { where: "Kitchen", takenDaysAgo: 1300 });
  await addPhotos(home.id, washer, "washer", { where: "Laundry", takenDaysAgo: 300, label: labelOf(washer, [["CAPACITY", "9 kg"], ["MFG DATE", "2017-08"]]) });
  await addPhotos(home.id, ac, "ac", { where: "Living Room", takenDaysAgo: 1500, label: labelOf(ac, [["REFRIGERANT", "R32 0.75 kg"], ["COOLING", "3.5 kW"]]) });
  await addPhotos(home.id, bedAc, "ac", { where: "Main Bedroom", takenDaysAgo: 1500 });
  await addPhotos(home.id, tv, "tv", { where: "Living Room", takenDaysAgo: 250 });
  await addPhotos(home.id, heater, "heater", { where: "Bathroom", takenDaysAgo: 60, label: labelOf(heater, [["CAPACITY", "315 L"], ["MAX PRESSURE", "850 kPa"]]) });
  await addPhotos(home.id, solar, "solar", { where: "Roof", takenDaysAgo: 900, label: [["SYSTEM", "6.6 kW"], ["INVERTER", "SMA SB5.0"], ["PANELS", "18 x 370 W"]] });
  await addPhotos(home.id, tank, "tank", { where: "Exterior", takenDaysAgo: 2600 });
  await addPhotos(home.id, pump, "pump", { where: "Exterior", takenDaysAgo: 40, label: labelOf(pump, [["MODEL", "Scala2 3-45"], ["POWER", "0.55 kW"]]) });

  await H.task({ assetId: ac.id, title: "Clean AC filters", intervalDays: 90, nextDueDate: ago(5), lastCompletedAt: ago(95) });
  await H.task({ assetId: bedAc.id, title: "Clean AC filters", intervalDays: 90, nextDueDate: ahead(12), lastCompletedAt: ago(78) });
  await H.task({ assetId: ac.id, title: "Professional AC service", intervalDays: 365, nextDueDate: ahead(60), lastCompletedAt: ago(305) });
  await H.task({ assetId: heater.id, title: "Flush water heater tank", intervalDays: 365, nextDueDate: ago(20) });
  await H.task({ assetId: fridge.id, title: "Clean fridge condenser coils", intervalDays: 180, nextDueDate: ahead(25) });
  await H.task({ assetId: dishwasher.id, title: "Clean dishwasher filter", intervalDays: 30, nextDueDate: ahead(6), lastCompletedAt: ago(24) });
  await H.task({ assetId: solar.id, title: "Clean solar panels", intervalDays: 180, nextDueDate: ahead(70) });
  await H.task({ assetId: tank.id, title: "Clean water tank", intervalDays: 730, nextDueDate: ahead(140) });
  await H.task({ assetId: dryer.id, title: "Clear dryer vent duct", intervalDays: 180, nextDueDate: ahead(18) });
  await H.task({ assetId: gate.id, title: "Lubricate garage door tracks", intervalDays: 120, nextDueDate: ahead(45) });
  await H.task({ title: "Clear gutters", intervalDays: 180, nextDueDate: ahead(9) });
  await H.task({ title: "Test smoke alarms", intervalDays: 30, nextDueDate: ahead(3) });
  await H.task({ title: "Replace smoke alarm batteries", intervalDays: 365, nextDueDate: ahead(95) });
  await H.task({ title: "Repaint front fence", nextDueDate: ago(120), lastCompletedAt: ago(110), active: false });

  const acService = await H.order({ assetId: ac.id, providerId: coolAir.id, title: "Annual AC service", status: "completed", completedAt: ago(305), resolution: "Cleaned coils and drain, checked refrigerant pressure" });
  const heaterFix = await H.order({ assetId: heater.id, providerId: rapid.id, title: "Replace water heater thermostat", status: "completed", completedAt: ago(60), priority: "high", resolution: "Thermostat replaced; tank shows corrosion, plan replacement" });
  const washerFix = await H.order({ assetId: washer.id, providerId: fixIt.id, title: "Washing machine not draining", status: "completed", completedAt: ago(150), resolution: "Drain pump unclogged (sock)" });
  const solarCheck = await H.order({ assetId: solar.id, providerId: sunTech.id, title: "Solar inverter fault light", status: "completed", completedAt: ago(20), resolution: "Firmware update, cleared isolation fault" });
  await H.order({ assetId: pump.id, title: "Pump making rattling noise", status: "open", priority: "high", description: "Loud rattle when the pump starts, mostly mornings" });
  await H.order({ assetId: heater.id, providerId: rapid.id, title: "Quote: replace water heater", status: "scheduled", scheduledFor: ahead(8), description: "Get quotes for a 315 L heat-pump unit" });
  await H.order({ assetId: washer.id, providerId: fixIt.id, title: "Noisy drum bearing", status: "Waiting for parts", description: "Bearing kit ordered, ETA 2 weeks" }); // custom "Other" status
  await H.order({ providerId: brightSpark.id, title: "Install outdoor power point", status: "in_progress", priority: "normal", scheduledFor: ahead(2), description: "Weatherproof double GPO by the BBQ area" });
  await H.order({ assetId: tv.id, title: "Wall-mount the TV", status: "cancelled", resolution: "Decided to keep it on the stand" });

  await H.cost({ assetId: fridge.id, amount: 899, date: ago(400), category: "purchase", description: "Purchase from Harvey's" });
  await H.cost({ assetId: tv.id, amount: 1599, date: ago(250), category: "purchase", description: "Purchase from JB Hi-Fi" });
  await H.cost({ assetId: solar.id, amount: 9800, date: ago(900), category: "purchase", description: "6.6 kW system installed" });
  await H.cost({ assetId: ac.id, workOrderId: acService.id, amount: 120, date: ago(305), category: "service", description: "Annual AC service" });
  await H.cost({ assetId: heater.id, workOrderId: heaterFix.id, amount: 185, date: ago(60), category: "repair", description: "Thermostat replacement" });
  await H.cost({ assetId: washer.id, workOrderId: washerFix.id, amount: 95, date: ago(150), category: "repair", description: "Drain pump unclogged" });
  await H.cost({ assetId: solar.id, workOrderId: solarCheck.id, amount: 0, date: ago(20), category: "service", description: "Inverter callout (under warranty)" });
  await H.cost({ amount: 240, date: ago(75), category: "service", description: "Gutter cleaning" });
  await H.cost({ assetId: gate.id, amount: 65, date: ago(30), category: "Spare parts", description: "Remote replacement" }); // custom "Other" category

  await addDocument({
    propertyId: home.id, assetId: fridge.id, filename: "harveys-fridge-receipt.pdf", kind: "receipt", createdAt: ago(400),
    extractionStatus: "confirmed",
    lines: ["HARVEY'S APPLIANCES - TAX INVOICE", `Date: ${iso(ago(400))}    Invoice #HN-220931`, "Samsung RT38K5032S8 384L Top Mount Fridge", "Serial: 0A8Z4BCK300121", "Price: $899.00", "Manufacturer warranty: 2 years parts and labour, 10 years compressor"],
  });
  await addDocument({
    propertyId: home.id, assetId: ac.id, workOrderId: acService.id, filename: "coolair-service-report.txt", kind: "invoice", createdAt: ago(305),
    lines: ["CoolAir Services - Service report", `Date: ${iso(ago(305))}`, "Unit: Daikin FTKM35 (living room)", "Work: cleaned coils and drain line, checked refrigerant", "Next service due in 12 months", "Total: $120.00"],
  });
  await addDocument({
    propertyId: home.id, assetId: solar.id, filename: "sunpower-warranty-certificate.pdf", kind: "warranty", createdAt: ago(890),
    lines: ["SUNPOWER WARRANTY CERTIFICATE", "System: Maxeon 6.6 kW", `Installed: ${iso(ago(900))}`, "Panel performance warranty: 25 years", "Installer workmanship (SunTech Solar): 5 years"],
  });
  await addDocument({
    propertyId: home.id, assetId: heater.id, filename: "rheem-water-heater-manual.txt", kind: "manual", createdAt: ago(3390),
    lines: ["Rheem Stellar 315L - Owner's manual (summary)", "Flush the tank every 12 months to remove sediment.", "Check the pressure relief valve every 6 months.", "Anode inspection by a licensed plumber every 5 years."],
  });

  const dad = await addMember(home.id, { name: "Nimal Perera", role: "self", birthDate: yearsAgo(44), phone: "555-0150", email: "nimal@example.com" });
  const mum = await addMember(home.id, { name: "Shanika Perera", role: "spouse", birthDate: yearsAgo(41), phone: "555-0151", notes: "Blood group O+" });
  const son = await addMember(home.id, { name: "Kavindu Perera", role: "child", birthDate: yearsAgo(15), notes: "Grade 10, Royal College. Allergic to penicillin." });
  const grandma = await addMember(home.id, { name: "Kusuma Perera", role: "grandparent", birthDate: yearsAgo(72), notes: "Clinic every 3rd Monday" });
  await addDocument({
    propertyId: home.id, memberId: son.id, filename: "kavindu-birth-certificate.pdf", kind: "certificate", createdAt: ago(800),
    lines: ["CERTIFICATE OF BIRTH (copy)", "Name: Kavindu Perera", `Date of birth: ${iso(yearsAgo(15))}`, "Registered: Colombo"],
  });
  await addDocument({
    propertyId: home.id, memberId: son.id, filename: "kavindu-swimming-certificate.pdf", kind: "certificate", createdAt: ago(60),
    lines: ["NATIONAL SWIMMING ASSOCIATION", "Certificate of achievement: Level 4", "Awarded to Kavindu Perera", `Date: ${iso(ago(60))}`],
  });
  await addDocument({
    propertyId: home.id, memberId: dad.id, filename: "nimal-driving-licence-copy.pdf", kind: "certificate", createdAt: ago(500),
    lines: ["DRIVING LICENCE (copy)", "Holder: Nimal Perera", "Classes: A1, B1, B", `Valid until: ${iso(ago(-1900))}`],
  });
  await addDocument({
    propertyId: home.id, memberId: mum.id, filename: "shanika-degree-certificate.pdf", kind: "certificate", createdAt: ago(1200),
    lines: ["UNIVERSITY OF COLOMBO", "Bachelor of Science (Hons)", "Awarded to Shanika Perera"],
  });
  await addDocument({
    propertyId: home.id, memberId: grandma.id, filename: "kusuma-medical-record.txt", kind: "other", createdAt: ago(25),
    lines: ["Clinic summary - Kusuma Perera", `Visit: ${iso(ago(25))}`, "Blood pressure medication: continue", "Next appointment in 4 weeks"],
  });

  // ═══ 2. City apartment ════════════════════════════════════════════════════
  const apt = await db.property.create({
    data: { ownerId: user.id, name: "City apartment", type: "apartment", address: "Unit 804, 21 Harbour St", yearBuilt: 2018, notes: "Building manager: Sam (555-0101). Strata covers lifts, roof and common plumbing." },
  });
  const A = forProperty(apt.id);
  const aKitchen = await A.space("Kitchen");
  const aLiving = await A.space("Living Room");
  const aBed = await A.space("Bedroom");
  const aBath = await A.space("Bathroom");
  const aBalcony = await A.space("Balcony", "area");

  const aFridge = await A.asset({ spaceId: aKitchen, name: "Refrigerator", category: "appliance", manufacturer: "Fisher & Paykel", model: "RF402BRPX6", purchaseDate: ago(1100), purchasePrice: 1290, expectedLifeYears: 12 });
  const cooktop = await A.asset({ spaceId: aKitchen, name: "Cooktop", category: "appliance", manufacturer: "Westinghouse", model: "WHI643BC", installDate: ago(2000), expectedLifeYears: 15 });
  const fanHood = await A.asset({ spaceId: aKitchen, name: "Extractor fan", category: "appliance", manufacturer: "Westinghouse", installDate: ago(2000), expectedLifeYears: 10 });
  const aAc = await A.asset({ spaceId: aLiving, name: "Air conditioner", category: "hvac", manufacturer: "Mitsubishi", model: "MSZ-AP50", installDate: ago(2000), expectedLifeYears: 12 });
  await A.asset({ spaceId: aLiving, name: "Intercom", category: "security", manufacturer: "Aiphone", installDate: ago(2000) });
  await A.asset({ spaceId: aBed, name: "Ceiling fan", category: "appliance", installDate: ago(2000), expectedLifeYears: 15 });
  const aHeater = await A.asset({ spaceId: aBath, name: "Water heater", category: "plumbing", manufacturer: "Rinnai", model: "Infinity 26", installDate: ago(2000), expectedLifeYears: 12 });
  await A.asset({ spaceId: aBalcony, name: "AC outdoor unit", category: "hvac", manufacturer: "Mitsubishi", installDate: ago(2000) });

  await db.warranty.create({ data: { assetId: aFridge.id, provider: "Fisher & Paykel", startDate: ago(1100), endDate: ahead(725), terms: "5 years parts & labour" } });
  await addPhotos(apt.id, aFridge, "fridge", { where: "Kitchen", takenDaysAgo: 1100, label: labelOf(aFridge, [["CAPACITY", "402 L"]]) });
  await addPhotos(apt.id, cooktop, "oven", { where: "Kitchen", takenDaysAgo: 200 });
  await addPhotos(apt.id, aAc, "ac", { where: "Living Room", takenDaysAgo: 400, label: labelOf(aAc, [["COOLING", "5.0 kW"]]) });
  await addPhotos(apt.id, aHeater, "heater", { where: "Bathroom", takenDaysAgo: 45 });
  await A.task({ assetId: aAc.id, title: "Clean AC filters", intervalDays: 90, nextDueDate: ahead(4), lastCompletedAt: ago(86) });
  await A.task({ assetId: fanHood.id, title: "Clean extractor fan filter", intervalDays: 90, nextDueDate: ago(9) });
  await A.task({ title: "Check sink and shower drains", intervalDays: 180, nextDueDate: ahead(33) });
  await A.task({ title: "Test smoke alarm", intervalDays: 30, nextDueDate: ahead(15) });
  await A.task({ assetId: aHeater.id, title: "Descale water heater", intervalDays: 730, nextDueDate: ahead(200) });

  const leak = await A.order({ assetId: aHeater.id, title: "Leak under bathroom vanity", status: "completed", completedAt: ago(45), providerId: rapid.id, resolution: "Replaced flexi hose" });
  await A.order({ assetId: cooktop.id, title: "Front-left burner won't ignite", status: "open", priority: "normal", description: "Clicks but no flame" });
  await A.order({ title: "Report balcony door seal to building manager", status: "open", priority: "low", description: "Rain gets in during storms (strata responsibility)" });
  await A.cost({ workOrderId: leak.id, assetId: aHeater.id, amount: 140, date: ago(45), category: "repair", description: "Flexi hose replacement" });
  await A.cost({ amount: 1150, date: ago(60), category: "Strata levy", description: "Quarterly strata levy" }); // custom "Other" category

  // A receipt waiting on the AI review screen (pre-filled, so no API key is needed to try it).
  await addDocument({
    propertyId: apt.id, filename: "appliance-world-washer-receipt.pdf", kind: "receipt", createdAt: ago(1), extractionStatus: "ready",
    lines: ["APPLIANCE WORLD - RECEIPT", `Date: ${iso(ago(12))}    Receipt #AW-77812`, "Haier HWF75AW3 7.5kg Front Load Washer", "Serial: HW75-2Q0193", "Price: $649.00", "Warranty: 2 years manufacturer", "Delivered and installed"],
    extraction: {
      documentKind: "receipt",
      summary: "Receipt from Appliance World for a Haier 7.5 kg front-load washing machine, delivered and installed.",
      vendor: { value: "Appliance World", confidence: "high" },
      asset: {
        name: { value: "Washing machine", confidence: "high" },
        category: { value: "appliance", confidence: "high" },
        manufacturer: { value: "Haier", confidence: "high" },
        model: { value: "HWF75AW3", confidence: "high" },
        serialNumber: { value: "HW75-2Q0193", confidence: "medium" },
      },
      purchaseDate: { value: iso(ago(12)), confidence: "high" },
      purchasePrice: { value: 649, confidence: "high" },
      currency: "USD",
      warranty: {
        endDate: { value: iso(new Date(ago(12).getTime() + 730 * DAY)), confidence: "medium" },
        durationMonths: { value: 24, confidence: "high" },
        provider: { value: "Haier", confidence: "medium" },
        terms: { value: "2 years manufacturer warranty", confidence: "high" },
      },
      service: { isServiceRecord: false, date: { value: null, confidence: "low" }, description: { value: null, confidence: "low" }, cost: { value: null, confidence: "low" } },
      suggestedMaintenance: [
        { title: "Clean washing machine filter", intervalDays: 30, source: "general_guidance" },
        { title: "Run drum clean cycle", intervalDays: 30, source: "document" },
      ],
      warnings: ["Serial number was partly smudged on the receipt; check it against the label inside the door."],
    },
  });
  await addDocument({
    propertyId: apt.id, filename: "strata-bylaws-summary.txt", kind: "contract", createdAt: ago(300),
    lines: ["Harbour St Strata - By-laws summary", "Owners maintain appliances, fixtures and internal plumbing.", "Strata maintains lifts, roof, facade, balcony membranes and common pipes.", "Report common-property issues to the building manager."],
  });

  const tenant = await addMember(apt.id, { name: "Dilan Fernando", role: "tenant", phone: "555-0160", email: "dilan.f@example.com", notes: "Lease runs to next June" });
  await addDocument({
    propertyId: apt.id, memberId: tenant.id, filename: "dilan-lease-agreement.pdf", kind: "contract", createdAt: ago(140),
    lines: ["RESIDENTIAL LEASE AGREEMENT", "Unit 804, 21 Harbour St", "Tenant: Dilan Fernando", `Start: ${iso(ago(140))}    Term: 12 months`],
  });

  // ═══ 3. Head office ═══════════════════════════════════════════════════════
  const office = await db.property.create({
    data: { ownerId: user.id, name: "Head office", type: "commercial", address: "Level 3, 88 King St", yearBuilt: 2004, notes: "After-hours access via loading dock. Fire panel in plant room." },
  });
  const O = forProperty(office.id);
  const reception = await O.space("Reception", "area");
  const floor = await O.space("Office floor", "floor");
  const meeting = await O.space("Meeting room");
  const serverRoom = await O.space("Server / IT room");
  const plant = await O.space("Plant room");
  const parking = await O.space("Parking & exterior", "exterior");

  const hvac = await O.asset({ spaceId: floor, name: "HVAC unit", category: "hvac", manufacturer: "Carrier", model: "40VMC 14 kW", installDate: ago(3800), expectedLifeYears: 15 });
  const gen = await O.asset({ spaceId: plant, name: "Generator", category: "electrical", manufacturer: "Cummins", model: "C22D5", installDate: ago(3000), expectedLifeYears: 20 });
  const firePanel = await O.asset({ spaceId: plant, name: "Fire alarm panel", category: "security", manufacturer: "Ampac", model: "FireFinder", installDate: ago(3000), expectedLifeYears: 15 });
  const ups = await O.asset({ spaceId: serverRoom, name: "UPS", category: "electrical", manufacturer: "APC", model: "Smart-UPS 3000", installDate: ago(1600), expectedLifeYears: 8, status: "out_of_service", notes: "Battery failed self-test" });
  await O.asset({ spaceId: serverRoom, name: "Server rack", category: "electrical", installDate: ago(1600), expectedLifeYears: 10 });
  const ext = await O.asset({ spaceId: reception, name: "Fire extinguisher", category: "security", manufacturer: "Chubb", installDate: ago(500), expectedLifeYears: 10 });
  await O.asset({ spaceId: reception, name: "Access control", category: "security", manufacturer: "Gallagher", installDate: ago(1200) });
  await O.asset({ spaceId: meeting, name: "Display / projector", category: "appliance", manufacturer: "Samsung", model: "QM75C", purchaseDate: ago(600), purchasePrice: 3200, expectedLifeYears: 6 });
  await O.asset({ spaceId: floor, name: "Printer", category: "appliance", manufacturer: "Canon", model: "imageRUNNER C3826i", purchaseDate: ago(900), expectedLifeYears: 5 });
  await O.asset({ spaceId: parking, name: "Gate / barrier motor", category: "security", manufacturer: "BFT", installDate: ago(2400), expectedLifeYears: 10 });

  await db.warranty.createMany({
    data: [
      { assetId: gen.id, provider: "Cummins service contract", startDate: ago(200), endDate: ahead(165), terms: "Annual service contract incl. load test" },
      { assetId: ups.id, provider: "APC", startDate: ago(1600), endDate: ago(500), terms: "3 years" },
    ],
  });
  await addPhotos(office.id, gen, "generator", { where: "Plant room", takenDaysAgo: 200, label: labelOf(gen, [["OUTPUT", "22 kVA"], ["FUEL", "Diesel"]]) });
  await addPhotos(office.id, ups, "ups", { where: "Server / IT room", takenDaysAgo: 3, label: [["MODEL", "SMT3000I"], ["BATTERY", "RBC43 (replace)"]] });
  await addPhotos(office.id, hvac, "ac", { where: "Office floor", takenDaysAgo: 95 });
  await addPhotos(office.id, ext, "extinguisher", { where: "Reception", takenDaysAgo: 30, label: [["TYPE", "ABE dry powder 4.5 kg"], ["TESTED", iso(ago(30))]] });
  await O.task({ assetId: ext.id, title: "Inspect fire extinguishers", intervalDays: 30, nextDueDate: ago(2) });
  await O.task({ assetId: gen.id, title: "Test generator", intervalDays: 30, nextDueDate: ahead(10), lastCompletedAt: ago(20) });
  await O.task({ assetId: hvac.id, title: "Service HVAC", intervalDays: 90, nextDueDate: ahead(21) });
  await O.task({ title: "Test emergency lighting", intervalDays: 180, nextDueDate: ahead(50) });
  await O.task({ assetId: firePanel.id, title: "Fire alarm system inspection", intervalDays: 180, nextDueDate: ahead(28) });

  const upsJob = await O.order({ assetId: ups.id, title: "Replace UPS battery", status: "open", priority: "urgent", description: "Server room on mains only until fixed" });
  const genService = await O.order({ assetId: gen.id, title: "Generator annual service", status: "completed", completedAt: ago(200), resolution: "Oil, filters, 2-hour load test passed" });
  const fireCheck = await O.order({ assetId: firePanel.id, providerId: guardFire.id, title: "Six-monthly fire system test", status: "completed", completedAt: ago(155), resolution: "All detectors passed; 1 sounder replaced" });
  await O.order({ assetId: hvac.id, providerId: coolAir.id, title: "Meeting room too warm", status: "scheduled", scheduledFor: ahead(3), priority: "normal" });
  await O.cost({ workOrderId: genService.id, assetId: gen.id, amount: 890, date: ago(200), category: "service", description: "Generator annual service" });
  await O.cost({ workOrderId: fireCheck.id, assetId: firePanel.id, amount: 460, date: ago(155), category: "service", description: "Fire system test" });
  await O.cost({ assetId: hvac.id, amount: 1320, date: ago(95), category: "repair", description: "HVAC compressor contactor replaced" });
  await addDocument({
    propertyId: office.id, assetId: gen.id, workOrderId: genService.id, filename: "generator-service-report.pdf", kind: "certificate", createdAt: ago(200),
    lines: ["POWERGEN SERVICES - Generator service report", `Date: ${iso(ago(200))}`, "Unit: Cummins C22D5", "Oil and filters changed, coolant checked", "2-hour load test: PASSED", "Next service due in 12 months"],
  });
  await addDocument({
    propertyId: office.id, assetId: ups.id, workOrderId: upsJob.id, filename: "ups-self-test-log.txt", kind: "other", createdAt: ago(3),
    lines: ["APC Smart-UPS 3000 - self-test log", `${iso(ago(3))} 02:00  Self-test FAILED: replace battery`, `${iso(ago(4))} 02:00  Runtime calibration aborted`],
  });

  const officeManager = await addMember(office.id, { name: "Ruwan Silva", role: "manager", phone: "555-0171", email: "ruwan@example.com" });
  const warden = await addMember(office.id, { name: "Anjali Rao", role: "employee", phone: "555-0172", notes: "Floor fire warden, level 3" });
  await addDocument({
    propertyId: office.id, memberId: warden.id, filename: "anjali-fire-warden-certificate.pdf", kind: "certificate", createdAt: ago(240),
    lines: ["FIRE WARDEN TRAINING - Certificate", "Participant: Anjali Rao", `Completed: ${iso(ago(240))}`, "Valid for 2 years"],
  });
  await addDocument({
    propertyId: office.id, memberId: officeManager.id, filename: "ruwan-first-aid-certificate.pdf", kind: "certificate", createdAt: ago(410),
    lines: ["FIRST AID AT WORK - Certificate", "Participant: Ruwan Silva", `Completed: ${iso(ago(410))}`, "Valid for 3 years"],
  });

  await seedBeachHouse(user.id, { coolAir: coolAir.id, rapid: rapid.id });

  const business = await db.user.create({
    data: { email: BUSINESS_EMAIL, name: "Priya Shah", passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12), useCase: "company" },
  });
  await seedBusiness(business.id);

  const counts = await Promise.all([
    db.asset.count({ where: { property: { ownerId: user.id } } }),
    db.workOrder.count({ where: { property: { ownerId: user.id } } }),
    db.document.count({ where: { property: { ownerId: user.id } } }),
  ]);
  console.log(`Seeded ${DEMO_EMAIL}: 4 properties, ${counts[0]} assets, ${counts[1]} work orders, ${counts[2]} documents, 6 providers. Also seeded ${BUSINESS_EMAIL} (café + warehouse).`);
}

// Property-scoped create helpers for the extra demo properties below.
function P(propertyId: string) {
  return {
    space: async (name: string, kind = "room") => (await db.space.create({ data: { propertyId, name, kind } })).id,
    asset: (data: In<Prisma.AssetUncheckedCreateInput>) => db.asset.create({ data: { ...data, propertyId } }),
    task: (data: In<Prisma.MaintenanceTaskUncheckedCreateInput>) => db.maintenanceTask.create({ data: { ...data, propertyId } }),
    order: (data: In<Prisma.WorkOrderUncheckedCreateInput>) => db.workOrder.create({ data: { ...data, propertyId } }),
    cost: (data: In<Prisma.CostRecordUncheckedCreateInput>) => db.costRecord.create({ data: { ...data, propertyId } }),
    warranty: (assetId: string, data: Omit<Prisma.WarrantyUncheckedCreateInput, "assetId">) =>
      db.warranty.create({ data: { ...data, assetId } }),
  };
}

// ═══ 4. Beach house (second home, mostly unattended) ═══════════════════════
async function seedBeachHouse(ownerId: string, providers: { coolAir: string; rapid: string }) {
  const beach = await db.property.create({
    data: {
      ownerId, name: "Beach house", type: "house", address: "7 Dune Crescent, Seabrook", yearBuilt: 1998,
      notes: "Holiday home, empty most weeks. Neighbour (Ana, 555-0177) has a spare key. Salt air: check metal fittings.",
    },
  });
  const B = P(beach.id);
  const kitchen = await B.space("Kitchen");
  const living = await B.space("Living Room");
  await B.space("Bedrooms");
  const ext = await B.space("Exterior", "exterior");

  const fridge = await B.asset({ spaceId: kitchen, name: "Refrigerator", category: "appliance", manufacturer: "LG", model: "GT-442", serialNumber: "LG442-88310", purchaseDate: ago(3900), expectedLifeYears: 12 });
  const ac = await B.asset({ spaceId: living, name: "Air conditioner", category: "hvac", manufacturer: "Fujitsu", model: "ASTG24", installDate: ago(4300), expectedLifeYears: 12, status: "needs_attention", notes: "Outdoor unit fins corroding (salt air)" });
  const tank = await B.asset({ spaceId: ext, name: "Rainwater tank", category: "water", manufacturer: "Bluescope", installDate: ago(5000), expectedLifeYears: 20 });
  const pump = await B.asset({ spaceId: ext, name: "Pool pump", category: "Pool equipment", manufacturer: "Astral", model: "CTX 280", installDate: ago(1200), expectedLifeYears: 8 });
  await B.asset({ spaceId: ext, name: "Outdoor shower mixer", category: "plumbing", installDate: ago(2000) });
  await B.asset({ spaceId: living, name: "Wi-Fi router", category: "other", manufacturer: "Netgear", model: "Nighthawk M6", purchaseDate: ago(500), expectedLifeYears: 5 });

  await B.warranty(pump.id, { provider: "Astral", startDate: ago(1200), endDate: ahead(5), terms: "3 years motor" });
  await addPhotos(beach.id, fridge, "fridge", { where: "Kitchen", takenDaysAgo: 120, label: labelOf(fridge) });
  await addPhotos(beach.id, ac, "ac", { where: "Living Room", takenDaysAgo: 30, label: labelOf(ac, [["COOLING", "7.1 kW"]]) });
  await addPhotos(beach.id, pump, "pump", { where: "Pool", takenDaysAgo: 90, label: labelOf(pump, [["POWER", "1.1 kW"]]) });
  await addPhotos(beach.id, tank, "tank", { where: "Exterior", takenDaysAgo: 400 });

  await B.task({ title: "Pre-season check: run all taps, test smoke alarms", intervalDays: 180, nextDueDate: ahead(1) });
  await B.task({ assetId: pump.id, title: "Clean pool pump basket", intervalDays: 14, nextDueDate: ago(3) });
  await B.task({ assetId: ac.id, title: "Rinse AC outdoor unit (salt build-up)", intervalDays: 60, nextDueDate: ahead(6) });
  await B.task({ assetId: tank.id, title: "Clean gutter guards and tank inlet", intervalDays: 180, nextDueDate: ahead(40) });
  await B.task({ title: "Termite inspection", intervalDays: 365, nextDueDate: ahead(75) });

  const pumpFix = await B.order({ assetId: pump.id, providerId: providers.rapid, title: "Pool pump tripping the safety switch", status: "completed", completedAt: ago(70), resolution: "Replaced capacitor" });
  await B.order({ assetId: ac.id, providerId: providers.coolAir, title: "Quote: replace corroded AC outdoor unit", status: "scheduled", scheduledFor: ahead(1), priority: "high" });
  await B.cost({ workOrderId: pumpFix.id, assetId: pump.id, amount: 210, date: ago(70), category: "repair", description: "Pool pump capacitor" });
  await B.cost({ amount: 1890, date: ago(120), category: "Insurance", description: "Annual home and contents insurance" });
}

// ═══ Business demo account: café + warehouse ═══════════════════════════════
async function seedBusiness(ownerId: string) {
  const provider = (name: string, category: string, phone: string, email: string, notes?: string) =>
    db.serviceProvider.create({ data: { ownerId, name, category, phone, email, notes } });
  const bean = await provider("Bean Machine Repairs", "Coffee equipment", "555-0301", "fix@beanmachine.example", "Service contract: 2 visits per year");
  const chill = await provider("ChillPro Refrigeration", "Commercial refrigeration", "555-0302", "callout@chillpro.example", "24/7 callout, $180 after-hours fee");
  const guard = await provider("GuardFire Safety", "Fire safety and compliance", "555-0111", "service@guardfire.example");
  const lift = await provider("LiftRight Forklift Services", "Forklifts", "555-0304", "service@liftright.example");
  const pest = await provider("PestAway", "Pest control", "555-0305", "bookings@pestaway.example", "Monthly commercial plan");
  await provider("DoorMasters", "Roller doors", "555-0306", "jobs@doormasters.example");

  // ── Café ──
  const cafe = await db.property.create({
    data: {
      ownerId, name: "Green Leaf Café", type: "commercial", address: "45 Market Lane", yearBuilt: 1988,
      notes: "Trading 6:30am to 4pm, 7 days. Food safety audit every April. Gas shut-off behind the counter.",
    },
  });
  const C = P(cafe.id);
  const front = await C.space("Front of house", "area");
  const kitchen = await C.space("Kitchen / back of house");
  const coolroom = await C.space("Cool room");
  const outside = await C.space("Courtyard and exterior", "exterior");

  const espresso = await C.asset({ spaceId: front, name: "Espresso machine", category: "appliance", manufacturer: "La Marzocco", model: "Linea PB 3AV", serialNumber: "LM-PB-23-0917", purchaseDate: ago(700), purchasePrice: 18500, expectedLifeYears: 12 });
  const grinder = await C.asset({ spaceId: front, name: "Coffee grinder", category: "appliance", manufacturer: "Mazzer", model: "Major V", purchaseDate: ago(700), expectedLifeYears: 8 });
  const display = await C.asset({ spaceId: front, name: "Display fridge", category: "appliance", manufacturer: "Bromic", model: "FS0540", purchaseDate: ago(1500), expectedLifeYears: 10 });
  const pos = await C.asset({ spaceId: front, name: "POS terminals", category: "electrical", manufacturer: "Square", model: "Register", purchaseDate: ago(600), expectedLifeYears: 5 });
  const room = await C.asset({ spaceId: coolroom, name: "Cool room compressor", category: "hvac", manufacturer: "Copeland", model: "ZB26KCE", installDate: ago(4000), expectedLifeYears: 12, status: "out_of_service", notes: "High-temperature alarm since 6am; stock moved to display fridges" });
  const dish = await C.asset({ spaceId: kitchen, name: "Commercial dishwasher", category: "appliance", manufacturer: "Hobart", model: "AM15", purchaseDate: ago(2200), expectedLifeYears: 10 });
  const hood = await C.asset({ spaceId: kitchen, name: "Exhaust hood and filters", category: "hvac", installDate: ago(6000), expectedLifeYears: 20 });
  const suppression = await C.asset({ spaceId: kitchen, name: "Fire suppression system", category: "security", manufacturer: "Ansul", model: "R-102", installDate: ago(3000), expectedLifeYears: 15 });
  const ext = await C.asset({ spaceId: kitchen, name: "Fire extinguisher", category: "security", manufacturer: "Chubb", installDate: ago(400) });
  const grease = await C.asset({ spaceId: outside, name: "Grease trap", category: "plumbing", installDate: ago(6000) });

  await C.warranty(espresso.id, { provider: "Bean Machine Repairs service contract", startDate: ago(353), endDate: ahead(12), terms: "Parts and labour service contract, renews yearly" });
  await C.warranty(pos.id, { provider: "Square hardware warranty", startDate: ago(600), endDate: ahead(130) });
  await C.warranty(grinder.id, { provider: "Mazzer", startDate: ago(700), endDate: ahead(30), terms: "2 years" });

  await addPhotos(cafe.id, espresso, "coffee", { where: "Front of house", takenDaysAgo: 700, label: labelOf(espresso, [["GROUPS", "3"], ["POWER", "6.5 kW 3-phase"]]) });
  await addPhotos(cafe.id, display, "fridge", { where: "Front of house", takenDaysAgo: 1500 });
  await addPhotos(cafe.id, room, "box", { where: "Cool room", takenDaysAgo: 1, label: labelOf(room, [["REFRIGERANT", "R404A"], ["SERVICE", "ChillPro 555-0302"]]) });
  await addPhotos(cafe.id, dish, "dishwasher", { where: "Kitchen", takenDaysAgo: 2200, label: labelOf(dish) });
  await addPhotos(cafe.id, hood, "hood", { where: "Kitchen", takenDaysAgo: 100 });
  await addPhotos(cafe.id, ext, "extinguisher", { where: "Kitchen", takenDaysAgo: 30, label: [["TYPE", "Wet chemical 7 L"], ["TESTED", iso(ago(170))]] });
  await addPhotos(cafe.id, pos, "router", { where: "Counter", takenDaysAgo: 600 });

  await C.task({ assetId: espresso.id, title: "Backflush and clean group heads", intervalDays: 7, nextDueDate: ahead(2), lastCompletedAt: ago(5) });
  await C.task({ assetId: espresso.id, title: "Replace water filter cartridge", intervalDays: 180, nextDueDate: ago(4) });
  await C.task({ assetId: hood.id, title: "Degrease exhaust hood filters", intervalDays: 30, nextDueDate: ago(6) });
  await C.task({ assetId: grease.id, title: "Grease trap pump-out", intervalDays: 90, nextDueDate: ahead(11) });
  await C.task({ assetId: suppression.id, title: "Fire suppression inspection", intervalDays: 180, nextDueDate: ahead(19) });
  await C.task({ assetId: ext.id, title: "Six-monthly extinguisher test", intervalDays: 180, nextDueDate: ago(1) });
  await C.task({ title: "Pest control visit", intervalDays: 30, nextDueDate: ahead(5), lastCompletedAt: ago(25) });
  await C.task({ title: "Food safety self-audit", intervalDays: 90, nextDueDate: ahead(27) });
  await C.task({ assetId: display.id, title: "Clean display fridge condenser", intervalDays: 90, nextDueDate: ahead(44) });

  await C.order({ assetId: room.id, providerId: chill.id, title: "Cool room above 8°C: compressor not starting", status: "in_progress", priority: "urgent", scheduledFor: today, description: "Technician on the way; stock moved" });
  await C.order({ assetId: espresso.id, title: "Steam wand dripping", status: "open", priority: "high", description: "Group 2 steam valve leaks when closed" });
  const svc = await C.order({ assetId: espresso.id, providerId: bean.id, title: "Six-monthly espresso machine service", status: "completed", completedAt: ago(170), resolution: "Gaskets, screens and pressurestat replaced" });
  const pestVisit = await C.order({ providerId: pest.id, title: "Monthly pest control", status: "completed", completedAt: ago(25), resolution: "No activity; bait stations refreshed" });
  const fireTest = await C.order({ assetId: suppression.id, providerId: guard.id, title: "Fire suppression six-monthly test", status: "completed", completedAt: ago(161), resolution: "Passed; nozzle caps replaced" });
  await C.order({ assetId: dish.id, title: "Dishwasher rinse arm replacement", status: "Waiting for parts", providerId: chill.id });

  await C.cost({ assetId: espresso.id, amount: 18500, date: ago(700), category: "purchase", description: "La Marzocco Linea PB" });
  await C.cost({ workOrderId: svc.id, assetId: espresso.id, amount: 640, date: ago(170), category: "service", description: "Espresso machine service" });
  await C.cost({ workOrderId: pestVisit.id, amount: 95, date: ago(25), category: "service", description: "Pest control" });
  await C.cost({ workOrderId: fireTest.id, assetId: suppression.id, amount: 380, date: ago(161), category: "service", description: "Fire suppression test" });
  await C.cost({ assetId: grease.id, amount: 420, date: ago(79), category: "service", description: "Grease trap pump-out" });
  await C.cost({ assetId: room.id, amount: 1450, date: ago(220), category: "repair", description: "Cool room fan motor" });

  await addDocument({
    propertyId: cafe.id, assetId: suppression.id, workOrderId: fireTest.id, filename: "fire-suppression-certificate.pdf", kind: "certificate", createdAt: ago(161),
    lines: ["GUARDFIRE SAFETY - Certificate of inspection", "System: Ansul R-102 wet chemical", `Date: ${iso(ago(161))}`, "Result: PASS", "Next inspection due within 6 months"],
  });

  const chef = await addMember(cafe.id, { name: "Tom Becker", role: "employee", phone: "555-0310", notes: "Head chef" });
  const supervisor = await addMember(cafe.id, { name: "Mei Lin", role: "manager", phone: "555-0311", notes: "Food safety supervisor" });
  await addDocument({
    propertyId: cafe.id, memberId: supervisor.id, filename: "mei-food-safety-supervisor-certificate.pdf", kind: "certificate", createdAt: ago(320),
    lines: ["FOOD SAFETY SUPERVISOR - Statement of attainment", "Name: Mei Lin", `Issued: ${iso(ago(320))}`, "Renew every 5 years"],
  });
  await addDocument({
    propertyId: cafe.id, memberId: chef.id, filename: "tom-food-handler-certificate.pdf", kind: "certificate", createdAt: ago(90),
    lines: ["FOOD HANDLER TRAINING - Certificate", "Name: Tom Becker", `Completed: ${iso(ago(90))}`],
  });

  // ── Warehouse ──
  const wh = await db.property.create({
    data: { ownerId, name: "Northside Warehouse", type: "commercial", address: "Unit 3, 12 Freight Road", yearBuilt: 2011, notes: "Storage and dispatch for the café group. Loading dock faces east." },
  });
  const W = P(wh.id);
  const floor = await W.space("Warehouse floor", "floor");
  const dock = await W.space("Loading dock", "area");
  const officeArea = await W.space("Site office");

  const forklift = await W.asset({ spaceId: floor, name: "Forklift", category: "Vehicles", manufacturer: "Toyota", model: "8FGU25", serialNumber: "TY8F-605513", purchaseDate: ago(2600), expectedLifeYears: 10 });
  const racking = await W.asset({ spaceId: floor, name: "Pallet racking", category: "structure", manufacturer: "Dexion", installDate: ago(4000), expectedLifeYears: 25 });
  const lights = await W.asset({ spaceId: floor, name: "LED high-bay lighting", category: "electrical", installDate: ago(1100), expectedLifeYears: 12 });
  const door1 = await W.asset({ spaceId: dock, name: "Roller door 1", category: "Doors", manufacturer: "B&D", installDate: ago(4000), expectedLifeYears: 15 });
  const door2 = await W.asset({ spaceId: dock, name: "Roller door 2", category: "Doors", manufacturer: "B&D", installDate: ago(4000), expectedLifeYears: 15, status: "needs_attention", notes: "Jams half-way; using door 1 only" });
  const sprinklers = await W.asset({ spaceId: floor, name: "Fire sprinkler system", category: "security", installDate: ago(4000), expectedLifeYears: 30 });
  await W.asset({ spaceId: officeArea, name: "Split AC", category: "hvac", manufacturer: "Daikin", model: "FTXM50", installDate: ago(1400), expectedLifeYears: 15 });
  const cctv = await W.asset({ spaceId: dock, name: "CCTV system", category: "security", manufacturer: "Hikvision", installDate: ago(1800), expectedLifeYears: 7 });

  await W.warranty(lights.id, { provider: "Lumex", startDate: ago(1100), endDate: ahead(725), terms: "5 years LED drivers" });
  await W.warranty(forklift.id, { provider: "LiftRight service contract", startDate: ago(340), endDate: ahead(25), terms: "Quarterly service contract" });

  await addPhotos(wh.id, forklift, "forklift", { where: "Warehouse floor", takenDaysAgo: 80, label: labelOf(forklift, [["CAPACITY", "2,500 kg"], ["FUEL", "LPG"]]) });
  await addPhotos(wh.id, door2, "door", { where: "Loading dock", takenDaysAgo: 2 });
  await addPhotos(wh.id, door1, "door", { where: "Loading dock", takenDaysAgo: 400 });
  await addPhotos(wh.id, sprinklers, "box", { where: "Riser room", takenDaysAgo: 300, label: [["VALVE SET", "Wet pipe, 150 mm"], ["LAST TEST", iso(ago(300))]] });
  await addPhotos(wh.id, cctv, "router", { where: "Site office", takenDaysAgo: 600 });

  await W.task({ assetId: forklift.id, title: "Forklift quarterly service", intervalDays: 90, nextDueDate: ahead(3) });
  await W.task({ assetId: forklift.id, title: "Review daily pre-start check log", intervalDays: 7, nextDueDate: ahead(1) });
  await W.task({ assetId: racking.id, title: "Annual racking safety inspection", intervalDays: 365, nextDueDate: ago(14) });
  await W.task({ assetId: sprinklers.id, title: "Sprinkler valve test", intervalDays: 30, nextDueDate: ahead(8) });
  await W.task({ assetId: cctv.id, title: "Check CCTV recordings and cameras", intervalDays: 30, nextDueDate: ahead(16) });
  await W.task({ title: "Emergency evacuation drill", intervalDays: 180, nextDueDate: ahead(60) });

  await W.order({ assetId: door2.id, title: "Roller door 2 jams half-way", status: "scheduled", scheduledFor: ahead(1), priority: "high", description: "DoorMasters booked for tomorrow 8am" });
  const fkService = await W.order({ assetId: forklift.id, providerId: lift.id, title: "Forklift quarterly service", status: "completed", completedAt: ago(87), resolution: "Oil, filters, mast chains adjusted; brakes OK" });
  await W.order({ assetId: lights.id, title: "Replace 2 flickering high-bay lights", status: "open", priority: "normal" });
  await W.cost({ workOrderId: fkService.id, assetId: forklift.id, amount: 560, date: ago(87), category: "service", description: "Forklift service" });
  await W.cost({ assetId: lights.id, amount: 14200, date: ago(1100), category: "purchase", description: "LED lighting upgrade" });
  await W.cost({ amount: 2400, date: ago(40), category: "Insurance", description: "Business insurance (warehouse share)" });
  await addDocument({
    propertyId: wh.id, assetId: racking.id, filename: "racking-inspection-last-year.pdf", kind: "certificate", createdAt: ago(379),
    lines: ["RACK SAFE AUDITS - Annual racking inspection", `Date: ${iso(ago(379))}`, "Bays inspected: 48", "Green: 45  Amber: 3  Red: 0", "Amber items: replace 3 damaged uprights within 4 weeks", "Next inspection due in 12 months"],
  });
}

main().finally(() => db.$disconnect());
