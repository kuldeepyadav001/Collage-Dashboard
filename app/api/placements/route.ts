import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const yearLabel = searchParams.get("year");
  const collegeId = searchParams.get("collegeId");
  const status = searchParams.get("status");
  const search = searchParams.get("q");

  // Build student where clause (year + college filter)
  const studentWhere: any = {};
  if (collegeId) studentWhere.collegeId = collegeId;
  if (yearLabel) {
    studentWhere.section = { course: { year: { label: yearLabel } } };
  }
  if (search) {
    studentWhere.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { rollNumber: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  // Get all students matching filters with their placement (if any)
  const students = await prisma.student.findMany({
    where: studentWhere,
    include: {
      college: true,
      section: { include: { course: { include: { year: true } } } },
      placement: true,
    },
    orderBy: [{ name: "asc" }],
  });

  // Filter by placement status if requested
  const filtered = status
    ? students.filter((s) => {
        if (status === "NO_RECORD") return !s.placement;
        return s.placement?.status === status;
      })
    : students;

  return NextResponse.json(filtered);
}

// POST — upsert placement (create or update per student)
export async function POST(req: Request) {
  const { error } = await requireAuth("WRITE_ADMIN");
  if (error) return error;

  try {
    const body = await req.json();
    const {
      studentId,
      status,
      company,
      role,
      packageLpa,
      placementDate,
      type,
      notes,
    } = body;

  if ((status === "PLACED" || status === "INTERNSHIP") && !company?.trim()) {
  return NextResponse.json(
    { error: "Company is required for PLACED/INTERNSHIP status" },
    { status: 400 }
  );
}

    // Validate: PLACED requires company
    if (status === "PLACED" && !company?.trim()) {
      return NextResponse.json(
        { error: "Company is required for PLACED status" },
        { status: 400 }
      );
    }

    // For non-PLACED, clear company/package/etc.
    const showCompanyFields = status === "PLACED" || status === "INTERNSHIP";

const data = {
  status,
  company: showCompanyFields ? company.trim() : null,
  role: showCompanyFields ? role?.trim() || null : null,
  packageLpa: showCompanyFields && packageLpa ? parseFloat(packageLpa) : null,
  placementDate:
    showCompanyFields && placementDate ? new Date(placementDate) : null,
  type: showCompanyFields ? type || null : null,
  notes: notes?.trim() || null,
};

    const placement = await prisma.placement.upsert({
      where: { studentId },
      create: { studentId, ...data },
      update: data,
    });

    return NextResponse.json(placement, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2003") {
      return NextResponse.json({ error: "Invalid student" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save placement" }, { status: 500 });
  }
}