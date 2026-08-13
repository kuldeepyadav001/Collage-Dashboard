import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const yearLabel = searchParams.get("year");
  const collegeId = searchParams.get("collegeId");

  // Student where clause
  const studentWhere: any = {};
  if (collegeId) studentWhere.collegeId = collegeId;
  if (yearLabel) {
    studentWhere.section = { course: { year: { label: yearLabel } } };
  }

  // Section where clause
  const sectionWhere: any = {};
  if (yearLabel) sectionWhere.course = { year: { label: yearLabel } };
  // Only count sections that have students matching the college filter
  if (collegeId) {
    sectionWhere.students = { some: { collegeId } };
  }

  // Placement where clause
  const placementWhere: any = { status: "PLACED" };
  if (yearLabel || collegeId) {
    placementWhere.student = {};
    if (collegeId) placementWhere.student.collegeId = collegeId;
    if (yearLabel) {
      placementWhere.student.section = {
        course: { year: { label: yearLabel } },
      };
    }
  }

  const [studentCount, sectionCount, eliteCount, placementAgg] =
    await Promise.all([
      prisma.student.count({ where: studentWhere }),
      prisma.section.count({ where: sectionWhere }),
      prisma.eliteSection.count({
        where: yearLabel ? { year: { label: yearLabel } } : undefined,
      }),
      prisma.placement.aggregate({
        where: placementWhere,
        _count: { id: true },
        _avg: { packageLpa: true },
        _max: { packageLpa: true },
      }),
    ]);

  return NextResponse.json({
    studentCount,
    sectionCount,
    eliteCount,
    placedCount: placementAgg._count.id,
    avgPackage: placementAgg._avg.packageLpa,
    maxPackage: placementAgg._max.packageLpa,
  });
}
