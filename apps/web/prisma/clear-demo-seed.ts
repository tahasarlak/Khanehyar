import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.listing.deleteMany({
    where: { id: { startsWith: "demo-listing-" } },
  });
  console.log(`Removed ${result.count} demo listings. Related images/favorites are removed by database relations.`);
}

main()
  .catch((error) => {
    console.error("Demo cleanup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
