import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const colleges = await prisma.college.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { students: true } },
    },
  });

  return NextResponse.json(colleges);
}

export async function POST(req: Request) {
  const { error } = await requireAuth("WRITE_ADMIN");
  if (error) return error;

  try {
    const { name, fullName } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    const college = await prisma.college.create({
      data: {
        name: name.trim().toUpperCase(),
        fullName: fullName?.trim() || null,
      },
    });

    return NextResponse.json(college, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "This college already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}