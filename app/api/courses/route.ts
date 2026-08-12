import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

// GET — filter by yearId if provided
export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const yearId = searchParams.get("yearId");

  const courses = await prisma.course.findMany({
    where: yearId ? { yearId } : undefined,
    orderBy: { name: "asc" },
    include: {
      year: { select: { label: true } },
      _count: { select: { sections: true } },
    },
  });

  return NextResponse.json(courses);
}

// POST
export async function POST(req: Request) {
  const { error } = await requireAuth("WRITE_ADMIN");
  if (error) return error;

  try {
    const { name, yearId } = await req.json();

    if (!name?.trim() || !yearId) {
      return NextResponse.json(
        { error: "Name and year required" },
        { status: 400 }
      );
    }

    const course = await prisma.course.create({
      data: { name: name.trim(), yearId },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "This course already exists for that year" },
        { status: 409 }
      );
    }
    if (err.code === "P2003") {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
  }
}