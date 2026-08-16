import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { generateExcel, excelFilename } from "@/lib/excel";

export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const yearLabel = searchParams.get("year");
  const collegeId = searchParams.get("collegeId");
  const status = searchParams.get("status");

  const studentWhere: any = {};
  if (collegeId) studentWhere.collegeId = collegeId;
  if (yearLabel) {
    studentWhere.section = { course: { year: { label: yearLabel } } };
  }

  const students = await prisma.student.findMany({
    where: studentWhere,
    include: {
      college: true,
      section: { include: { course: { include: { year: true } } } },
      placement: true,
    },
    orderBy: { name: "asc" },
  });

  const filtered = status
    ? students.filter((s) => {
        if (status === "NO_RECORD") return !s.placement;
        return s.placement?.status === status;
      })
    : students;

  const rows = filtered.map((s, i) => ({
    sr: i + 1,
    rollNumber: s.rollNumber,
    name: s.name,
    email: s.email,
    college: s.college.name,
    course: s.section.course.name,
    section: s.section.name,
    year: s.section.course.year.label,
    status: s.placement?.status || "NO_RECORD",
    company: s.placement?.company || "",
    role: s.placement?.role || "",
    package: s.placement?.packageLpa ?? "",
    type: s.placement?.type || "",
    date: s.placement?.placementDate
      ? new Date(s.placement.placementDate).toLocaleDateString("en-IN")
      : "",
    notes: s.placement?.notes || "",
  }));

  const buffer = generateExcel(
    "Placements",
    [
      { header: "S.No", key: "sr", width: 6 },
      { header: "Roll Number", key: "rollNumber", width: 18 },
      { header: "Name", key: "name", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "College", key: "college", width: 10 },
      { header: "Course", key: "course", width: 12 },
      { header: "Section", key: "section", width: 10 },
      { header: "Year", key: "year", width: 8 },
      { header: "Status", key: "status", width: 14 },
      { header: "Company", key: "company", width: 20 },
      { header: "Role", key: "role", width: 18 },
      { header: "Package (LPA)", key: "package", width: 14 },
      { header: "Type", key: "type", width: 14 },
      { header: "Date", key: "date", width: 12 },
      { header: "Notes", key: "notes", width: 30 },
    ],
    rows
  );

  const filename = excelFilename(
    `placements${yearLabel ? "_" + yearLabel : ""}${status ? "_" + status : ""}`
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