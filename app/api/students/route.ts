import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

// GET — list students with optional filters
export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const yearLabel = searchParams.get("year");
  const collegeId = searchParams.get("collegeId");
  const courseId = searchParams.get("courseId");
  const sectionId = searchParams.get("sectionId");
  const search = searchParams.get("q");

  const students = await prisma.student.findMany({
    where: {
      AND: [
        sectionId ? { sectionId } : {},
        collegeId ? { collegeId } : {},
        courseId ? { section: { courseId } } : {},
        yearLabel ? { section: { course: { year: { label: yearLabel } } } } : {},
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { rollNumber: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    include: {
      section: {
        include: {
          course: {
            include: { year: true },
          },
        },
      },
      college: true,                                    // ← MUST BE HERE
    },
    orderBy: [{ section: { name: "asc" } }, { rollNumber: "asc" }],
  });

  return NextResponse.json(students);
}


// POST — create new student
export async function POST(req: Request) {
  const { error } = await requireAuth("WRITE_ADMIN");
  if (error) return error;

  try {
    const body = await req.json();
    const { name, rollNumber, email, phone, address, photoUrl, sectionId, collegeId } = body;

    if (!name?.trim() || !rollNumber?.trim() || !email?.trim() || !sectionId || !collegeId) {
      return NextResponse.json(
        { error: "Name, roll number, email, section, and college are required" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const student = await prisma.student.create({
      data: {
        name: name.trim(),
        rollNumber: rollNumber.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        photoUrl: photoUrl?.trim() || null,
        sectionId,
        collegeId,                                      // NEW
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      const field = err.meta?.target?.[0] || "field";
      return NextResponse.json(
        { error: `A student with this ${field} already exists` },
        { status: 409 }
      );
    }
    if (err.code === "P2003") {
      return NextResponse.json({ error: "Invalid section or college" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
  }
}