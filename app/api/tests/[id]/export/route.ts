import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { generateExcel, excelFilename } from "@/lib/excel";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      year: true,
      marks: {
        include: {
          student: {
            include: {
              college: true,
              section: { include: { course: true } },
            },
          },
        },
        orderBy: { marks: "desc" },
      },
    },
  });

  if (!test) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = test.marks.map((m, i) => {
    const pct = (m.marks / test.maxMarks) * 100;
    return {
      rank: i + 1,
      rollNumber: m.student.rollNumber,
      name: m.student.name,
      email: m.student.email,
      college: m.student.college.name,
      course: m.student.section.course.name,
      section: m.student.section.name,
      marks: m.marks,
      maxMarks: test.maxMarks,
      percentage: pct.toFixed(2),
    };
  });

  const buffer = generateExcel(
    test.name.substring(0, 31),
    [
      { header: "Rank", key: "rank", width: 6 },
      { header: "Roll Number", key: "rollNumber", width: 18 },
      { header: "Name", key: "name", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "College", key: "college", width: 10 },
      { header: "Course", key: "course", width: 12 },
      { header: "Section", key: "section", width: 10 },
      { header: "Marks", key: "marks", width: 8 },
      { header: "Max", key: "maxMarks", width: 8 },
      { header: "Percentage", key: "percentage", width: 12 },
    ],
    rows
  );

  const filename = excelFilename(`${test.name}_${test.year.label}`);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}