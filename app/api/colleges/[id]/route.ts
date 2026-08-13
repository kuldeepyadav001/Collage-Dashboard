import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

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