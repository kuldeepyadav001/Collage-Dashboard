import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

// Bulk upsert marks — used by both manual entry and Excel later
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth("WRITE_ADMIN");
  if (error) return error;

  const { id: testId } = await params;

  try {
    const { marks } = await req.json();
    // marks: [{ studentId, marks }] or [{ studentId, marks: null }] to delete

    if (!Array.isArray(marks)) {
      return NextResponse.json({ error: "marks array required" }, { status: 400 });
    }

    // Get test max
    const test = await prisma.test.findUnique({
      where: { id: testId },
      select: { maxMarks: true },
    });
    if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });

    // Validate each mark
    for (const m of marks) {
      if (m.marks !== null && (typeof m.marks !== "number" || m.marks < 0 || m.marks > test.maxMarks)) {
        return NextResponse.json(
          { error: `Mark ${m.marks} invalid — must be 0 to ${test.maxMarks}` },
          { status: 400 }
        );
      }
    }

    // Split: nulls = delete, numbers = upsert
    const toDelete = marks.filter((m: any) => m.marks === null).map((m: any) => m.studentId);
    const toUpsert = marks.filter((m: any) => m.marks !== null);

    await prisma.$transaction([
      // Delete cleared marks
      ...(toDelete.length > 0
        ? [
            prisma.testMark.deleteMany({
              where: { testId, studentId: { in: toDelete } },
            }),
          ]
        : []),
      // Upsert new/updated
      ...toUpsert.map((m: any) =>
        prisma.testMark.upsert({
          where: {
            testId_studentId: { testId, studentId: m.studentId },
          },
          create: { testId, studentId: m.studentId, marks: m.marks },
          update: { marks: m.marks },
        })
      ),
    ]);

    return NextResponse.json({ updated: marks.length });
  } catch (err) {
    return NextResponse.json({ error: "Failed to save marks" }, { status: 500 });
  }
}