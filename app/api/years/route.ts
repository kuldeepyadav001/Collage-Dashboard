import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

// GET — any authenticated user
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const years = await prisma.year.findMany({
    orderBy: { label: "desc" },
    include: {
      _count: {
        select: { courses: true },
      },
    },
  });

  return NextResponse.json(years);
}

// POST — only WRITE_ADMIN or above
export async function POST(req: Request) {
  const { error } = await requireAuth("WRITE_ADMIN");
  if (error) return error;

  try {
    const { label } = await req.json();

    if (!label || typeof label !== "string") {
      return NextResponse.json({ error: "Label required" }, { status: 400 });
    }

    // Validate it's a 4-digit year
    const yearNum = parseInt(label);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return NextResponse.json(
        { error: "Enter a valid year (e.g., 2025)" },
        { status: 400 }
      );
    }

    const year = await prisma.year.create({
      data: { label: label.trim() },
    });

    return NextResponse.json(year, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "This year already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create year" }, { status: 500 });
  }
}