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

  const section = await prisma.section.findUnique({
    where: { id },
    include: {
      course: { include: { year: true } },
      students: {
        include: { college: true },
        orderBy: { rollNumber: "asc" },
      },
    },
  });

  if (!section) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = section.students.map((s, i) => ({
    sr: i + 1,
    rollNumber: s.rollNumber,
    name: s.name,
    email: s.email,
    phone: s.phone || "",
    college: s.college.name,
    address: s.address || "",
  }));

  const buffer = generateExcel(
    `${section.course.name}-${section.name}`.substring(0, 31),
    [
      { header: "S.No", key: "sr", width: 6 },
      { header: "Roll Number", key: "rollNumber", width: 18 },
      { header: "Name", key: "name", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "College", key: "college", width: 10 },
      { header: "Address", key: "address", width: 30 },
    ],
    rows
  );

  const filename = excelFilename(
    `${section.course.year.label}_${section.course.name}_${section.name}`
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}