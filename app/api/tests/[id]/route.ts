import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

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
      year: { select: { id: true, label: true } },
      marks: {
        include: {
          student: {
            include: {
              college: true,
              section: {
                include: { course: true },
              },
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

  // Get all students of that year (for marks entry — including those who didn't take it)
  const allYearStudents = await prisma.student.findMany({
    where: {
      section: { course: { yearId: test.year.id } },
    },
    include: {
      college: true,
      section: { include: { course: true } },
    },
    orderBy: [{ section: { name: "asc" } }, { rollNumber: "asc" }],
  });

  const marks = test.marks.map((m) => m.marks);
  const avg = marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : null;
  const highest = marks.length ? Math.max(...marks) : null;
  const lowest = marks.length ? Math.min(...marks) : null;

  return NextResponse.json({
    ...test,
    stats: {
      participants: test.marks.length,
      totalStudents: allYearStudents.length,
      avgMarks: avg,
      highestMarks: highest,
      lowestMarks: lowest,
    },
    allYearStudents,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth("WRITE_ADMIN");
  if (error) return error;

  const { id } = await params;

  try {
    const { name, date, maxMarks } = await req.json();

    const data: any = {};
    if (name !== undefined) data.name = name.trim();
    if (date !== undefined) data.date = new Date(date);
    if (maxMarks !== undefined) {
      const parsedMax = parseFloat(maxMarks);
      if (isNaN(parsedMax) || parsedMax <= 0) {
        return NextResponse.json(
          { error: "Max marks must be a positive number" },
          { status: 400 }
        );
      }
      data.maxMarks = parsedMax;
    }

    const test = await prisma.test.update({ where: { id }, data });
    return NextResponse.json(test);
  } catch (err: any) {
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    await prisma.test.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}