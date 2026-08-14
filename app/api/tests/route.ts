import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const yearLabel = searchParams.get("year");

  const tests = await prisma.test.findMany({
    where: yearLabel ? { year: { label: yearLabel } } : undefined,
    orderBy: { date: "desc" },
    include: {
      year: { select: { label: true } },
      _count: { select: { marks: true } },
    },
  });

  // Compute average per test in single pass
  const testIds = tests.map((t) => t.id);
  const avgData = await prisma.testMark.groupBy({
    by: ["testId"],
    where: { testId: { in: testIds } },
    _avg: { marks: true },
    _max: { marks: true },
  });

  const avgMap = new Map(
    avgData.map((a) => [a.testId, { avg: a._avg.marks, max: a._max.marks }])
  );

  const enriched = tests.map((t) => ({
    ...t,
    avgMarks: avgMap.get(t.id)?.avg ?? null,
    highestMarks: avgMap.get(t.id)?.max ?? null,
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const { error } = await requireAuth("WRITE_ADMIN");
  if (error) return error;

  try {
    const { name, date, maxMarks, yearId } = await req.json();

    if (!name?.trim() || !date || !maxMarks || !yearId) {
      return NextResponse.json(
        { error: "Name, date, max marks, and year required" },
        { status: 400 }
      );
    }

    const parsedMax = parseFloat(maxMarks);
    if (isNaN(parsedMax) || parsedMax <= 0) {
      return NextResponse.json(
        { error: "Max marks must be a positive number" },
        { status: 400 }
      );
    }

    const test = await prisma.test.create({
      data: {
        name: name.trim(),
        date: new Date(date),
        maxMarks: parsedMax,
        yearId,
      },
      include: {
        year: { select: { label: true } },
      },
    });

    return NextResponse.json(test, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2003") {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}