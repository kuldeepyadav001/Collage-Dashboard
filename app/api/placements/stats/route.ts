import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: Request) {
    const { error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const yearLabel = searchParams.get("year");
    const collegeId = searchParams.get("collegeId");

    // Build filter for students in scope
    const studentWhere: any = {};
    if (collegeId) studentWhere.collegeId = collegeId;
    if (yearLabel) {
        studentWhere.section = { course: { year: { label: yearLabel } } };
    }

    // Total students in scope
    const totalStudents = await prisma.student.count({ where: studentWhere });

    // All placements for students in scope
    const placements = await prisma.placement.findMany({
        where: { student: studentWhere },
        include: {
            student: {
                include: {
                    eliteMemberships: true,
                },
            },
        },
    });

    // Status counts
    const statusCounts = {
        PLACED: placements.filter((p) => p.status === "PLACED").length,
        INTERNSHIP: placements.filter((p) => p.status === "INTERNSHIP").length,
        HIGHER_STUDIES: placements.filter((p) => p.status === "HIGHER_STUDIES").length,
        NOT_PLACED: placements.filter((p) => p.status === "NOT_PLACED").length,
        OPTED_OUT: placements.filter((p) => p.status === "OPTED_OUT").length,
        NO_RECORD: totalStudents - placements.length,
    };

    // Packages: PLACED only (interns tracked separately via statusCounts)
    const placed = placements.filter((p) => p.status === "PLACED");
    const packages = placed.map((p) => p.packageLpa).filter((v): v is number => v !== null);

    const avgPackage = packages.length
        ? packages.reduce((a, b) => a + b, 0) / packages.length
        : null;
    const highestPackage = packages.length ? Math.max(...packages) : null;
    const lowestPackage = packages.length ? Math.min(...packages) : null;

    // Top companies (count grouped)
    const companyCounts = new Map<string, number>();
    placed.forEach((p) => {
        if (p.company) {
            companyCounts.set(p.company, (companyCounts.get(p.company) || 0) + 1);
        }
    });
    const topCompanies = Array.from(companyCounts.entries())
        .map(([company, count]) => ({ company, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // Elite vs regular
    const eliteStudentIds = new Set(
        placements.flatMap((p) => p.student.eliteMemberships.map((m) => m.studentId))
    );
    const elitePlaced = placed.filter((p) => eliteStudentIds.has(p.studentId)).length;
    const regularPlaced = placed.length - elitePlaced;

    const eliteTotal = await prisma.student.count({
        where: {
            ...studentWhere,
            eliteMemberships: { some: {} },
        },
    });
    const regularTotal = totalStudents - eliteTotal;

    return NextResponse.json({
        totalStudents,
        statusCounts,
        placementRate: totalStudents
            ? ((statusCounts.PLACED / totalStudents) * 100)
            : 0,
        packages: {
            avg: avgPackage,
            highest: highestPackage,
            lowest: lowestPackage,
            count: packages.length,
        },
        topCompanies,
        eliteVsRegular: {
            eliteTotal,
            elitePlaced,
            eliteRate: eliteTotal ? (elitePlaced / eliteTotal) * 100 : 0,
            regularTotal,
            regularPlaced,
            regularRate: regularTotal ? (regularPlaced / regularTotal) * 100 : 0,
        },
    });
}