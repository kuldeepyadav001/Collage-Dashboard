import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

export async function requireAuth(minRole: Role = "READER") {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
    };
  }

  const userRole = session.user.role as Role;
  const roleHierarchy: Record<Role, number> = {
    READER: 1,
    WRITE_ADMIN: 2,
    SUPER_ADMIN: 3,
  };

  if (roleHierarchy[userRole] < roleHierarchy[minRole]) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      session: null,
    };
  }

  return { error: null, session };
}