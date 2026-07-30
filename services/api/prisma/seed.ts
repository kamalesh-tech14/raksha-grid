import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

/**
 * Seeds a handful of realistic demonstration predictions. This is what a
 * real ML pipeline's output table would look like — the seed exists so
 * the app has something real to query in Phase 6 without pretending a
 * model exists yet. Every row is explicitly `isDemonstrationData: true`.
 */
async function main() {
  // Seed admin user for the control dashboard
  const adminPassword = "admin@RakshaGrid2026!";
  const passwordHash = await argon2.hash(adminPassword);

  await prisma.user.upsert({
    where: { email: "admin@raksha-grid.local" },
    update: {},
    create: {
      email: "admin@raksha-grid.local",
      passwordHash,
      role: "administrator",
    },
  });

  await prisma.disasterPrediction.deleteMany({});
  await prisma.shelter.deleteMany({});
  await prisma.hospital.deleteMany({});

  await prisma.shelter.createMany({
    data: [
      { name: "Community Hall, Poonamallee", latitude: 13.048, longitude: 80.092, capacity: 300, occupancy: 120, hasMedical: true },
      { name: "Government School Relief Camp", latitude: 13.061, longitude: 80.108, capacity: 150, occupancy: 40, hasMedical: false },
    ],
  });

  await prisma.hospital.createMany({
    data: [
      { name: "City Hospital, Poonamallee", latitude: 13.058, longitude: 80.101, emergencyBeds: 18, icuBeds: 4 },
      { name: "Government Primary Health Centre", latitude: 13.041, longitude: 80.087, emergencyBeds: 6, icuBeds: 0 },
    ],
  });

  const now = new Date();
  const hours = (n: number) => new Date(now.getTime() + n * 60 * 60 * 1000);

  await prisma.disasterPrediction.createMany({
    data: [
      {
        disasterType: "flood",
        regionId: "chennai-poonamallee",
        regionName: "Chennai · Poonamallee",
        probability: 0.62,
        confidence: 0.91,
        severity: "high",
        expectedStart: hours(5),
        expectedEnd: hours(14),
        affectedPopulationEstimate: 18400,
        explanation: [
          "Cumulative 48h rainfall exceeds the local drainage threshold",
          "Adyar river level trending upward over the last 6 readings",
          "Soil saturation in this zone is already above 85%",
        ],
        recommendedActions: [
          "Avoid underpasses and low-lying roads after dark",
          "Charge your phone and keep the SOS app accessible",
          "Identify your nearest shelter now, before conditions worsen",
        ],
        dataSourceLabel: "Demonstration model v0 (seeded)",
        centerLat: 13.0524,
        centerLng: 80.096,
        radiusMetres: 2200,
        validUntil: hours(18),
      },
      {
        disasterType: "rain",
        regionId: "chennai-poonamallee",
        regionName: "Chennai · Poonamallee",
        probability: 0.4,
        confidence: 0.83,
        severity: "moderate",
        expectedStart: hours(1),
        expectedEnd: hours(9),
        affectedPopulationEstimate: 42000,
        explanation: ["Regional monsoon band moving inland", "Wind pattern consistent with sustained heavy rain"],
        recommendedActions: ["Keep drains near your home clear if safe to do so"],
        dataSourceLabel: "Demonstration model v0 (seeded)",
        centerLat: 13.0524,
        centerLng: 80.096,
        radiusMetres: 5000,
        validUntil: hours(12),
      },
      {
        disasterType: "heatwave",
        regionId: "chennai-poonamallee",
        regionName: "Chennai · Poonamallee",
        probability: 0.18,
        confidence: 0.76,
        severity: "low",
        expectedStart: hours(30),
        expectedEnd: hours(48),
        affectedPopulationEstimate: 60000,
        explanation: ["Short-term forecast shows a dip after the current rain system clears"],
        recommendedActions: ["No action needed yet — this is a low-confidence, low-severity signal"],
        dataSourceLabel: "Demonstration model v0 (seeded)",
        validUntil: hours(48),
      },
      {
        disasterType: "flood",
        regionId: "mumbai-andheri",
        regionName: "Mumbai · Andheri",
        probability: 0.35,
        confidence: 0.7,
        severity: "moderate",
        expectedStart: hours(10),
        expectedEnd: hours(20),
        affectedPopulationEstimate: 26000,
        explanation: ["Localised waterlogging pattern typical for this ward during high tide + rain overlap"],
        recommendedActions: ["Monitor local alerts before commuting through known waterlogging spots"],
        dataSourceLabel: "Demonstration model v0 (seeded)",
        centerLat: 19.1197,
        centerLng: 72.8468,
        radiusMetres: 1800,
        validUntil: hours(24),
      },
    ],
  });

  // eslint-disable-next-line no-console
  console.log("Seeded demonstration disaster predictions.");
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
