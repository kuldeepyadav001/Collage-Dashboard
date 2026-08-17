import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { parseExcelBuffer, pickField } from "@/lib/excel-parser";
import {
  ensureUnassignedCollege,
  ensureUnassignedSection,
} from "@/lib/unassigned";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth("WRITE_ADMIN");
  if (error) return error;

  const { id: eliteSectionId } = await params;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as string) || "preview";
    const addUnmatched = formData.get("addUnmatched") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const elite = await prisma.eliteSection.findUnique({
      where: { id: eliteSectionId },
      include: { year: true },
    });

    if (!elite) {
      return NextResponse.json({ error: "Elite section not found" }, { status: 404 });
    }

    const buffer = await file.arrayBuffer();
    const { rows } = parseExcelBuffer(buffer);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Excel is empty" }, { status: 400 });
    }

    const [allStudents, existingMembers, colleges, sections] = await Promise.all([
      prisma.student.findMany({
        select: {
          id: true,
          name: true,
          rollNumber: true,
          email: true,
          sectionId: true,
        },
      }),
      prisma.eliteSectionMember.findMany({
        where: { eliteSectionId },
        select: { studentId: true },
      }),
      prisma.college.findMany(),
      prisma.section.findMany({
        include: { course: { include: { year: true } } },
      }),
    ]);

    const byRoll = new Map(allStudents.map((s) => [s.rollNumber.toLowerCase(), s]));
    const byEmail = new Map(allStudents.map((s) => [s.email.toLowerCase(), s]));
    const alreadyMember = new Set(existingMembers.map((m) => m.studentId));

    // Sections limited to elite's year
    const yearSections = sections.filter(
      (s) => s.course.year.id === elite.year.id
    );

    interface Parsed {
      rowNumber: number;
      name: string | null;
      rollNumber: string | null;
      email: string | null;
      phone: string | null;
      address: string | null;
      collegeName: string | null;
      courseName: string | null;
      sectionName: string | null;
    }

    const parsed: Parsed[] = rows
      .map((r) => ({
        rowNumber: r.rowNumber,
        name: safeString(pickField(r.data, ["name", "fullname", "studentname"])),
        rollNumber: safeString(pickField(r.data, ["rollnumber", "rollno", "roll", "rn"])),
        email: safeString(pickField(r.data, ["email", "emailid", "mail"])),
        phone: safeString(pickField(r.data, ["phone", "mobile", "contact"])),
        address: safeString(pickField(r.data, ["address", "addr"])),
        collegeName: safeString(pickField(r.data, ["college", "collegename"])),
        courseName: safeString(pickField(r.data, ["course", "coursename", "branch"])),
        sectionName: safeString(pickField(r.data, ["section", "sectionname", "sec"])),
      }))
      .filter((r) => r.rollNumber || r.email);

    const matched: { row: Parsed; student: any; alreadyMember: boolean }[] = [];
    const unmatched: { row: Parsed; reason: string }[] = [];
    const wrongYear: { row: Parsed; student: any }[] = [];

    for (const row of parsed) {
      let student = null;
      if (row.rollNumber) student = byRoll.get(row.rollNumber.toLowerCase());
      if (!student && row.email) student = byEmail.get(row.email.toLowerCase());

      if (student) {
        const isCorrectYear = yearSections.some((s) => s.id === student.sectionId);
        if (!isCorrectYear) {
          wrongYear.push({ row, student });
        } else {
          matched.push({
            row,
            student,
            alreadyMember: alreadyMember.has(student.id),
          });
        }
      } else {
        if (!row.name || !row.rollNumber || !row.email) {
          unmatched.push({
            row,
            reason: "Missing name, roll number, or email",
          });
          continue;
        }

        unmatched.push({
          row,
          reason: "New student — will be created and added if you confirm",
        });
      }
    }

    if (mode === "preview") {
      const willBeAdded = matched.filter((m) => !m.alreadyMember).length;
      const alreadyIn = matched.filter((m) => m.alreadyMember).length;

      return NextResponse.json({
        preview: true,
        eliteName: elite.name,
        eliteYear: elite.year.label,
        totalRows: parsed.length,
        matched: matched.length,
        willBeAdded,
        alreadyMembers: alreadyIn,
        unmatched: unmatched.length,
        wrongYear: wrongYear.length,
        wrongYearSample: wrongYear.slice(0, 5).map((w) => ({
          rowNumber: w.row.rowNumber,
          name: w.row.name || w.row.rollNumber,
        })),
        unmatchedSample: unmatched.slice(0, 10).map((u) => ({
          rowNumber: u.row.rowNumber,
          identity: u.row.name || u.row.rollNumber || u.row.email,
          reason: u.reason,
        })),
      });
    }

    // COMMIT mode
    let added = 0;
    let created = 0;
    let skipped = 0;
    const failures: any[] = [];

    // Add matched (not already members)
    for (const m of matched) {
      if (m.alreadyMember) {
        skipped++;
        continue;
      }
      try {
        await prisma.eliteSectionMember.create({
          data: { eliteSectionId, studentId: m.student.id },
        });
        added++;
      } catch (err: any) {
        failures.push({
          row: m.row.rowNumber,
          reason: err.code === "P2002" ? "Already a member" : err.message,
        });
      }
    }

    // Wrong year — always skip
    skipped += wrongYear.length;

    // Create unmatched if user confirmed
    if (addUnmatched) {
      const unassignedCollegeId = await ensureUnassignedCollege();
      const unassignedSectionId = await ensureUnassignedSection(elite.year.id);

      for (const u of unmatched) {
        try {
          if (u.reason.startsWith("Missing")) {
            skipped++;
            continue;
          }

          // Try Excel section/college first
          let sectionId: string | null = null;
          let collegeId: string | null = null;

          if (u.row.sectionName && u.row.courseName) {
            const m = yearSections.find(
              (s) =>
                s.name.toLowerCase() === u.row.sectionName!.toLowerCase() &&
                s.course.name.toLowerCase() === u.row.courseName!.toLowerCase()
            );
            if (m) sectionId = m.id;
          }
          if (u.row.collegeName) {
            const m = colleges.find(
              (c) => c.name.toLowerCase() === u.row.collegeName!.toLowerCase()
            );
            if (m) collegeId = m.id;
          }

          // Fallback to Unassigned
          if (!sectionId) sectionId = unassignedSectionId;
          if (!collegeId) collegeId = unassignedCollegeId;

          const newStudent = await prisma.student.create({
            data: {
              name: u.row.name!,
              rollNumber: u.row.rollNumber!,
              email: u.row.email!.toLowerCase(),
              phone: u.row.phone,
              address: u.row.address,
              sectionId,
              collegeId,
            },
          });

          await prisma.eliteSectionMember.create({
            data: { eliteSectionId, studentId: newStudent.id },
          });

          created++;
          added++;
        } catch (err: any) {
          failures.push({
            row: u.row.rowNumber,
            reason: err.code === "P2002" ? "Duplicate roll/email" : err.message,
          });
        }
      }
    } else {
      skipped += unmatched.length;
    }

    return NextResponse.json({
      preview: false,
      added,
      created,
      skipped,
      failures,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Import failed" },
      { status: 500 }
    );
  }
}

function safeString(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}