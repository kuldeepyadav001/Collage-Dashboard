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

  const elite = await prisma.eliteSection.findUnique({
    where: { id },
    include: {
    year: { select: { id: true, label: true } }, 
      members: {
        include: {
          student: {
            include: {
              college: true,
              section: {
                include: {
                  course: { include: { year: true } },
                },
              },
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      },
      _count: { select: { members: true } },
    },
  });

  if (!elite) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(elite);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth("WRITE_ADMIN");
  if (error) return error;

  const { id } = await params;

  try {
    const { name, description } = await req.json();

    const elite = await prisma.eliteSection.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
      },
    });

    return NextResponse.json(elite);
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "This name is already used" },
        { status: 409 }
      );
    }
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
    await prisma.eliteSection.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}