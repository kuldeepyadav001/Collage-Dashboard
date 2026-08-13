import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth("WRITE_ADMIN");
  if (error) return error;

  const { id: eliteSectionId } = await params;

  try {
    const { studentIds } = await req.json();

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: "studentIds array required" },
        { status: 400 }
      );
    }

    // Get elite section's year
    const elite = await prisma.eliteSection.findUnique({
      where: { id: eliteSectionId },
      select: { yearId: true },
    });

    if (!elite) {
      return NextResponse.json({ error: "Elite section not found" }, { status: 404 });
    }

    // Verify all students belong to that year
    const validStudents = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        section: { course: { yearId: elite.yearId } },
      },
      select: { id: true },
    });

    const validIds = new Set(validStudents.map((s) => s.id));
    const invalidCount = studentIds.length - validIds.size;

    if (validIds.size === 0) {
      return NextResponse.json(
        { error: "No selected students belong to this elite section's year" },
        { status: 400 }
      );
    }

    const result = await prisma.eliteSectionMember.createMany({
      data: Array.from(validIds).map((studentId) => ({
        eliteSectionId,
        studentId,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json(
      {
        added: result.count,
        skipped: invalidCount,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to add members" }, { status: 500 });
  }
}