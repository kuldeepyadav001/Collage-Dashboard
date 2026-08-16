import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { generateExcel, excelFilename } from "@/lib/excel";

export async function POST(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const { testIds } = await req.json();

    if (!Array.isArray(testIds) || testIds.length < 2) {
      return NextResponse.json({ error: "Select 2+ tests" }, { status: 400 });
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
      { student: any; marks: Map<string, { marks: number; percentage: number }> }
    >();

    for (const test of tests) {
      for (const mark of test.marks) {
        const pct = (mark.marks / test.maxMarks) * 100;
        const existing = studentMap.get(mark.studentId);
        if (existing) {
          existing.marks.set(test.id, { marks: mark.marks, percentage: pct });
        } else {
          studentMap.set(mark.studentId, {
            student: mark.student,
            marks: new Map([[test.id, { marks: mark.marks, percentage: pct }]]),
          });
        }
      }
    }

    // Compute rows
    const rows = Array.from(studentMap.values())
      .map(({ student, marks }) => {
        const percentages = Array.from(marks.values()).map((v) => v.percentage);
        const sumTaken = percentages.reduce((a, b) => a + b, 0);
        const avgTaken = sumTaken / percentages.length;
        const avgAll = sumTaken / tests.length;

        const row: Record<string, any> = {
          rollNumber: student.rollNumber,
          name: student.name,
          college: student.college.name,
          course: student.section.course.name,
          section: student.section.name,
        };

        tests.forEach((t) => {
          const m = marks.get(t.id);
          row[`test_${t.id}`] = m ? m.marks : "";
          row[`test_${t.id}_pct`] = m ? `${m.percentage.toFixed(1)}%` : "";
        });

        row.avgTaken = `${avgTaken.toFixed(1)}%`;
        row.avgAll = `${avgAll.toFixed(1)}%`;
        row.testsAttempted = `${marks.size}/${tests.length}`;

        return row;
      })
      .sort((a: any, b: any) => {
        const aVal = parseFloat(a.avgTaken);
        const bVal = parseFloat(b.avgTaken);
        return bVal - aVal;
      })
      .map((r, i) => ({ rank: i + 1, ...r }));

    // Build columns dynamically
    const columns: any[] = [
      { header: "Rank", key: "rank", width: 6 },
      { header: "Roll Number", key: "rollNumber", width: 18 },
      { header: "Name", key: "name", width: 25 },
      { header: "College", key: "college", width: 10 },
      { header: "Course", key: "course", width: 12 },
      { header: "Section", key: "section", width: 10 },
    ];

    tests.forEach((t) => {
      const shortName = t.name.length > 20 ? t.name.slice(0, 17) + "..." : t.name;
      columns.push({
        header: `${shortName} (${t.maxMarks})`,
        key: `test_${t.id}`,
        width: 15,
      });
      columns.push({
        header: `${shortName} %`,
        key: `test_${t.id}_pct`,
        width: 12,
      });
    });

    columns.push({ header: "Tests Attempted", key: "testsAttempted", width: 15 });
    columns.push({ header: "Avg (Taken)", key: "avgTaken", width: 12 });
    columns.push({ header: "Avg (All)", key: "avgAll", width: 12 });

    const buffer = generateExcel("Test Comparison", columns, rows);
    const filename = excelFilename(`test_comparison_${tests.length}tests`);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}