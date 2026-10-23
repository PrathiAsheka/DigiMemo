// Demo data for local development: `npm run db:seed`.
// Sign in with DEMO_EMAIL / DEMO_PASSWORD below (local test account only).
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const DEMO_EMAIL = "demo@hometwin.test";
const DEMO_PASSWORD = "demo-twin-2026";

const db = new PrismaClient();
const DAY = 86_400_000;
const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
const ago = (days: number) => new Date(today.getTime() - days * DAY);
const ahead = (days: number) => new Date(today.getTime() + days * DAY);

async function main() {
  await db.user.deleteMany({ where: { email: DEMO_EMAIL } });
  const user = await db.user.create({
    data: { email: DEMO_EMAIL, name: "Demo Owner", passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12) },
  });

  const home = await db.property.create({
    data: { ownerId: user.id, name: "Family home", type: "house", address: "12 Lake Road", yearBuilt: 2009 },
  });
  const space = async (name: string, kind = "room") => (await db.space.create({ data: { propertyId: home.id, name, kind } })).id;
  const kitchen = await space("Kitchen");
  const living = await space("Living Room");
  const bedroom = await space("Main Bedroom");
  const exterior = await space("Exterior", "exterior");

  const tech = await db.serviceProvider.create({
    data: { ownerId: user.id, name: "CoolAir Services", category: "HVAC", phone: "555-0142" },
  });
  const plumber = await db.serviceProvider.create({
    data: { ownerId: user.id, name: "Rapid Plumbing", category: "Plumbing", phone: "555-0199" },
  });

  const asset = (data: Parameters<typeof db.asset.create>[0]["data"]) => db.asset.create({ data });

  const fridge = await asset({
    propertyId: home.id, spaceId: kitchen, name: "Refrigerator", category: "appliance",
    manufacturer: "Samsung", model: "RT38K5032S8", serialNumber: "0A8Z4BCK300121", purchaseDate: ago(400),
    purchasePrice: 899, expectedLifeYears: 12,
  });
  const washer = await asset({
    propertyId: home.id, spaceId: kitchen, name: "Washing machine", category: "appliance",
    manufacturer: "LG", model: "F4V5VYP0W", purchaseDate: ago(3300), purchasePrice: 640, expectedLifeYears: 10,
  });
  const ac = await asset({
    propertyId: home.id, spaceId: living, name: "Living room AC", category: "hvac",
    manufacturer: "Daikin", model: "FTKM35", installDate: ago(1500), purchasePrice: 1450, expectedLifeYears: 15,
  });
  const bedAc = await asset({
    propertyId: home.id, spaceId: bedroom, name: "Bedroom AC", category: "hvac",
    manufacturer: "Daikin", model: "FTKM25", installDate: ago(1500), expectedLifeYears: 15,
  });
  const heater = await asset({
    propertyId: home.id, spaceId: bedroom, name: "Water heater", category: "plumbing",
    manufacturer: "Rheem", purchaseDate: ago(3400), expectedLifeYears: 10, status: "needs_attention",
  });
  const solar = await asset({
    propertyId: home.id, spaceId: exterior, name: "Solar PV system", category: "solar",
    manufacturer: "SunPower", installDate: ago(900), purchasePrice: 9800, expectedLifeYears: 25,
  });
  const pump = await asset({
    propertyId: home.id, spaceId: exterior, name: "Water pump", category: "water", manufacturer: "Grundfos", installDate: ago(2000),
  });

  await db.warranty.createMany({
    data: [
      { assetId: fridge.id, provider: "Samsung", startDate: ago(400), endDate: ahead(40), terms: "2 years parts & labour" },
      { assetId: fridge.id, provider: "Samsung", startDate: ago(400), endDate: ahead(3250), terms: "10 years compressor" },
      { assetId: ac.id, provider: "Daikin", startDate: ago(1500), endDate: ahead(325), terms: "5 years compressor" },
      { assetId: solar.id, provider: "SunPower", startDate: ago(900), endDate: ahead(8200), terms: "25 years panel performance" },
      { assetId: washer.id, provider: "LG", startDate: ago(3300), endDate: ago(2570) },
    ],
  });

  await db.maintenanceTask.createMany({
    data: [
      { propertyId: home.id, assetId: ac.id, title: "Clean AC filters", intervalDays: 90, nextDueDate: ago(5), lastCompletedAt: ago(95) },
      { propertyId: home.id, assetId: bedAc.id, title: "Clean AC filters", intervalDays: 90, nextDueDate: ahead(12), lastCompletedAt: ago(78) },
      { propertyId: home.id, assetId: ac.id, title: "Professional AC service", intervalDays: 365, nextDueDate: ahead(60), lastCompletedAt: ago(305) },
      { propertyId: home.id, assetId: heater.id, title: "Flush water heater tank", intervalDays: 365, nextDueDate: ago(20) },
      { propertyId: home.id, assetId: fridge.id, title: "Clean fridge condenser coils", intervalDays: 180, nextDueDate: ahead(25) },
      { propertyId: home.id, assetId: solar.id, title: "Clean solar panels", intervalDays: 180, nextDueDate: ahead(70) },
      { propertyId: home.id, title: "Clear gutters", intervalDays: 180, nextDueDate: ahead(9) },
      { propertyId: home.id, title: "Test smoke alarms", intervalDays: 30, nextDueDate: ahead(3) },
    ],
  });

  const acService = await db.workOrder.create({
    data: {
      propertyId: home.id, assetId: ac.id, providerId: tech.id, title: "Annual AC service", status: "completed",
      completedAt: ago(305), resolution: "Cleaned coils, topped up refrigerant",
    },
  });
  const heaterFix = await db.workOrder.create({
    data: {
      propertyId: home.id, assetId: heater.id, providerId: plumber.id, title: "Replace water heater thermostat",
      status: "completed", completedAt: ago(60), resolution: "Thermostat replaced; tank shows corrosion, plan replacement",
    },
  });
  await db.workOrder.create({
    data: { propertyId: home.id, assetId: pump.id, title: "Pump making rattling noise", status: "open", priority: "high" },
  });

  await db.costRecord.createMany({
    data: [
      { propertyId: home.id, assetId: fridge.id, amount: 899, date: ago(400), category: "purchase", description: "Purchase" },
      { propertyId: home.id, assetId: ac.id, workOrderId: acService.id, amount: 120, date: ago(305), category: "service", description: "Annual AC service" },
      { propertyId: home.id, assetId: heater.id, workOrderId: heaterFix.id, amount: 185, date: ago(60), category: "repair", description: "Thermostat replacement" },
      { propertyId: home.id, assetId: washer.id, amount: 95, date: ago(150), category: "repair", description: "Drain pump unclogged" },
    ],
  });

  console.log(`Seeded demo account ${DEMO_EMAIL}`);
}

main().finally(() => db.$disconnect());
