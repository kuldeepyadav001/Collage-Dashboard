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

  const elite = await prisma.eliteSection.findUnique({
    where: { id },
    include: {
      year: true,
      members: {
        include: {
          student: {
            include: {
              college: true,
              section: { include: { course: true } },
            },
          },
        },
        orderBy: { student: { name: "asc" } },
      },
    },
  });

  if (!elite) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = elite.members.map((m, i) => ({
    sr: i + 1,
    rollNumber: m.student.rollNumber,
    name: m.student.name,
    email: m.student.email,
    phone: m.student.phone || "",
    college: m.student.college.name,
    course: m.student.section.course.name,
    section: m.student.section.name,
    joinedAt: new Date(m.joinedAt).toLocaleDateString("en-IN"),
  }));

  const buffer = generateExcel(
    elite.name.substring(0, 31),
    [
      { header: "S.No", key: "sr", width: 6 },
      { header: "Roll Number", key: "rollNumber", width: 18 },
      { header: "Name", key: "name", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "College", key: "college", width: 10 },
      { header: "Course", key: "course", width: 15 },
      { header: "Section", key: "section", width: 10 },
      { header: "Joined", key: "joinedAt", width: 12 },
    ],
    rows
  );

  const filename = excelFilename(`${elite.name}_${elite.year.label}_members`);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}