import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: {
      email: "test@example.com",
    },
    update: {},
    create: {
      name: "Test User",
      email: "test@example.com",
      passwordHash: "TEMPORARY_HASH_NOT_FOR_LOGIN",
      role: "USER",
    },
  });

  console.log("Test user ready:", user.id, user.email);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
