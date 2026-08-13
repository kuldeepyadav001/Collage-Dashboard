import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

// GET — single student with all relations
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      section: {
        include: {
          course: {
            include: { year: true },
          },
        },
      },
      college: true, 
      eliteMemberships: {
        include: { eliteSection: true },
      },
      placement: true,
      testMarks: {
        include: {
          test: true,
        },
        orderBy: { test: { date: "desc" } },
      },
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  return NextResponse.json(student);
}

// PATCH — update student
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth("WRITE_ADMIN");
  if (error) return error;

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, rollNumber, email, phone, address, photoUrl, sectionId , collegeId} = body;

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const student = await prisma.student.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(rollNumber && { rollNumber: rollNumber.trim() }),
        ...(email && { email: email.trim().toLowerCase() }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(photoUrl !== undefined && { photoUrl: photoUrl?.trim() || null }),
        ...(sectionId && { sectionId }),
        ...(collegeId && { collegeId }), 
      },
    });

    return NextResponse.json(student);
  } catch (err: any) {
    if (err.code === "P2002") {
      const field = err.meta?.target?.[0] || "field";
      return NextResponse.json(
        { error: `A student with this ${field} already exists` },
        { status: 409 }
      );
    }
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth("WRITE_ADMIN");
  if (error) return error;

  const { id } = await params;

  try {
    await prisma.student.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}