import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const yearLabel = searchParams.get("year");

  const eliteSections = await prisma.eliteSection.findMany({
    where: yearLabel ? { year: { label: yearLabel } } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      year: { select: { label: true } },
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json(eliteSections);
}

export async function POST(req: Request) {
  const { error } = await requireAuth("WRITE_ADMIN");
  if (error) return error;

  try {
    const { name, description, yearId } = await req.json();

    if (!name?.trim() || !yearId) {
      return NextResponse.json(
        { error: "Name and year required" },
        { status: 400 }
      );
    }

    const elite = await prisma.eliteSection.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        yearId,
      },
      include: {
        year: { select: { label: true } },
      },
    });

    return NextResponse.json(elite, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "An elite section with this name already exists for that year" },
        { status: 409 }
      );
    }
    if (err.code === "P2003") {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}