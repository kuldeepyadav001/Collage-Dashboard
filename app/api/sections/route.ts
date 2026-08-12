import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");

  const sections = await prisma.section.findMany({
    where: courseId ? { courseId } : undefined,
    orderBy: { name: "asc" },
    include: {
      course: {
        select: {
          name: true,
          year: { select: { label: true } },
        },
      },
      _count: { select: { students: true } },
    },
  });

  return NextResponse.json(sections);
}

export async function POST(req: Request) {
  const { error } = await requireAuth("WRITE_ADMIN");
  if (error) return error;

  try {
    const { name, courseId } = await req.json();

    if (!name?.trim() || !courseId) {
      return NextResponse.json(
        { error: "Name and course required" },
        { status: 400 }
      );
    }

    const section = await prisma.section.create({
      data: { name: name.trim(), courseId },
    });

    return NextResponse.json(section, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "This section already exists for that course" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
  }
}