import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          "superadmin@college.com",
          "kartik@college.com",
          "teacher@college.com",
        ],
      },
    },
  });

  const hashedPassword = await bcrypt.hash("password123", 12);

  await prisma.user.createMany({
    data: [
      {
        name: "Super Admin",
        email: "superadmin@college.com",
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
      },
      {
        name: "Kartik Sir",
        email: "kartik@college.com",
        password: hashedPassword,
        role: Role.WRITE_ADMIN,
      },
      {
        name: "Test Teacher",
        email: "teacher@college.com",
        password: hashedPassword,
        role: Role.READER,
      },
    ],
  });

  console.log("✓ Seeded 3 users");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());