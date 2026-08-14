import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";


export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth("WRITE_ADMIN");
  if (error) return error;

  const { id } = await params;

  try {
    const { name, fullName } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    const college = await prisma.college.update({
      where: { id },
      data: {
        name: name.trim().toUpperCase(),
        fullName: fullName?.trim() || null,
      },
    });

    return NextResponse.json(college);
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "This college already exists" }, { status: 409 });
    }
    if (err.code === "P2025") {
      return NextResponse.json({ error: "College not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth("WRITE_ADMIN");
  if (error) return error;

  const { id } = await params;

  try {
    // Check if college has students
    const count = await prisma.student.count({ where: { collegeId: id } });
    if (count > 0) {
      return NextResponse.json(
        { error: `Cannot delete — ${count} students still assigned to this college` },
        { status: 400 }
      );
    }

    await prisma.college.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}