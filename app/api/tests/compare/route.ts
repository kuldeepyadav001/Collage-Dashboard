import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function POST(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const { testIds } = await req.json();

    if (!Array.isArray(testIds) || testIds.length < 2) {
      return NextResponse.json(
        { error: "Select at least 2 tests" },
        { status: 400 }
      );
    }

    const tests = await prisma.test.findMany({
      where: { id: { in: testIds } },
      include: {
        marks: {
          include: {
            student: {
              include: {
                college: true,
                section: { include: { course: true } },
              },
            },
          },
        },
      },
      orderBy: { date: "asc" },
    });

    // Build student → test → marks map
    const studentMap = new Map<
      string,
      {
        student: any;
        marksPerTest: Map<string, { marks: number; percentage: number }>;
      }
    >();

    for (const test of tests) {
      for (const mark of test.marks) {
        const pct = (mark.marks / test.maxMarks) * 100;
        const existing = studentMap.get(mark.studentId);
        if (existing) {
          existing.marksPerTest.set(test.id, { marks: mark.marks, percentage: pct });
        } else {
          studentMap.set(mark.studentId, {
            student: mark.student,
            marksPerTest: new Map([[test.id, { marks: mark.marks, percentage: pct }]]),
          });
        }
      }
    }

    // Compute combined stats per student
    const combined = Array.from(studentMap.values())
      .map(({ student, marksPerTest }) => {
        const percentages = Array.from(marksPerTest.values()).map((v) => v.percentage);
        const avgPercentage = percentages.reduce((a, b) => a + b, 0) / percentages.length;
        return {
          student,
          testsAttempted: marksPerTest.size,
          totalTests: tests.length,
          avgPercentage,
          marksPerTest: Object.fromEntries(marksPerTest),
        };
      })
      .sort((a, b) => b.avgPercentage - a.avgPercentage);

    return NextResponse.json({
      tests: tests.map((t) => ({
        id: t.id,
        name: t.name,
        date: t.date,
        maxMarks: t.maxMarks,
      })),
      students: combined,
    });
  } catch {
    return NextResponse.json({ error: "Failed to compare" }, { status: 500 });
  }
}