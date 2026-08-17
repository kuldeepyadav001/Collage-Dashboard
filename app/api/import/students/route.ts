import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { parseExcelBuffer, pickField } from "@/lib/excel-parser";
import {
  ensureUnassignedCollege,
  ensureUnassignedSection,
} from "@/lib/unassigned";

interface StudentRow {
  rowNumber: number;
  name: string | null;
  rollNumber: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  collegeName: string | null;
  courseName: string | null;
  sectionName: string | null;
  yearLabel: string | null;
}

export async function POST(req: Request) {
  const { error } = await requireAuth("WRITE_ADMIN");
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as string) || "preview";
    const defaultYearId = formData.get("defaultYearId") as string | null;
    const defaultCollegeId = formData.get("defaultCollegeId") as string | null;
    const defaultCourseId = formData.get("defaultCourseId") as string | null;
    const defaultSectionId = formData.get("defaultSectionId") as string | null;
    const addUnmatched = formData.get("addUnmatched") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const { rows } = parseExcelBuffer(buffer);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Excel file is empty" }, { status: 400 });
    }

    const studentRows: StudentRow[] = rows.map((r) => ({
      rowNumber: r.rowNumber,
      name: safeString(pickField(r.data, ["name", "fullname", "studentname"])),
      rollNumber: safeString(
        pickField(r.data, ["rollnumber", "rollno", "roll", "rn"])
      ),
      email: safeString(
        pickField(r.data, ["email", "emailid", "mail", "emailaddress"])
      ),
      phone: safeString(pickField(r.data, ["phone", "mobile", "contact", "phoneno"])),
      address: safeString(pickField(r.data, ["address", "addr"])),
      collegeName: safeString(pickField(r.data, ["college", "collegename"])),
      courseName: safeString(pickField(r.data, ["course", "coursename", "branch"])),
      sectionName: safeString(pickField(r.data, ["section", "sectionname", "sec"])),
      yearLabel: safeString(
        pickField(r.data, ["year", "batch", "yearlabel", "admissionyear", "passingyear"])
      ),
    }));

    const [allStudents, colleges, years, courses, sections] = await Promise.all([
      prisma.student.findMany({
        include: {
          college: true,
          section: { include: { course: { include: { year: true } } } },
        },
      }),
      prisma.college.findMany(),
      prisma.year.findMany(),
      prisma.course.findMany({ include: { year: true } }),
      prisma.section.findMany({ include: { course: { include: { year: true } } } }),
    ]);

    // Whitespace-safe lookups
    const studentsByRoll = new Map(
      allStudents.map((s) => [s.rollNumber.toLowerCase().trim(), s])
    );
    const studentsByEmail = new Map(
      allStudents.map((s) => [s.email.toLowerCase().trim(), s])
    );

    interface MatchedItem {
      row: StudentRow;
      student: any;
      willUpdate: {
        section?: { from: string; to: string };
        college?: { from: string; to: string };
        phone?: boolean;
        address?: boolean;
      };
    }

    interface UnmatchedItem {
      row: StudentRow;
      willBeCreatedIn: {
        section: string;
        college: string;
      };
    }

    const matched: MatchedItem[] = [];
    const unmatched: UnmatchedItem[] = [];
    const errors: { row: StudentRow; error: string }[] = [];

    for (const row of studentRows) {
      if (!row.name && !row.rollNumber && !row.email) continue;

      if (!row.rollNumber && !row.email) {
        errors.push({ row, error: "Missing both roll number and email" });
        continue;
      }

      // Match with whitespace tolerance
      let existing = null;
      if (row.rollNumber) {
        existing = studentsByRoll.get(row.rollNumber.toLowerCase().trim());
      }
      if (!existing && row.email) {
        existing = studentsByEmail.get(row.email.toLowerCase().trim());
      }

      if (existing) {
        // Compute what will change (for preview)
        const willUpdate: any = {};

        // Section change check
        if (row.sectionName && row.courseName && row.yearLabel) {
          const targetSection = sections.find(
            (s) =>
              s.name.toLowerCase() === row.sectionName!.toLowerCase() &&
              s.course.name.toLowerCase() === row.courseName!.toLowerCase() &&
              s.course.year.label === row.yearLabel
          );
          if (targetSection && targetSection.id !== existing.sectionId) {
            willUpdate.section = {
              from: `${existing.section.course.name} · ${existing.section.name}`,
              to: `${targetSection.course.name} · ${targetSection.name}`,
            };
          }
        }

        // College change check
        if (row.collegeName) {
          const targetCollege = colleges.find(
            (c) => c.name.toLowerCase() === row.collegeName!.toLowerCase()
          );
          if (targetCollege && targetCollege.id !== existing.collegeId) {
            willUpdate.college = {
              from: existing.college.name,
              to: targetCollege.name,
            };
          }
        }

        if (row.phone && row.phone !== existing.phone) willUpdate.phone = true;
        if (row.address && row.address !== existing.address) willUpdate.address = true;

        matched.push({ row, student: existing, willUpdate });
      } else {
        if (!row.name || !row.rollNumber || !row.email) {
          errors.push({
            row,
            error: "Missing name, roll number, or email for new student",
          });
          continue;
        }

        // Determine where new student will go
        const resolved = resolveTargetIds(
          row,
          { colleges, years, courses, sections },
          { defaultYearId, defaultCollegeId, defaultCourseId, defaultSectionId }
        );

        const collegeLabel = resolved.collegeId
          ? colleges.find((c) => c.id === resolved.collegeId)?.name || "Unassigned"
          : "Unassigned";
        const sectionLabel = resolved.sectionId
          ? (() => {
              const s = sections.find((s) => s.id === resolved.sectionId);
              return s ? `${s.course.name} · ${s.name}` : "Unassigned";
            })()
          : "Unassigned";

        unmatched.push({
          row,
          willBeCreatedIn: {
            section: sectionLabel,
            college: collegeLabel,
          },
        });
      }
    }

    if (mode === "preview") {
      return NextResponse.json({
        preview: true,
        totalRows: studentRows.length,
        matched: matched.length,
        matchedWillChange: matched.filter(
          (m) => Object.keys(m.willUpdate).length > 0
        ).length,
        unmatched: unmatched.length,
        errors: errors.length,
        details: {
          matched: matched.slice(0, 20).map((m) => ({
            rowNumber: m.row.rowNumber,
            name: m.student.name,
            rollNumber: m.student.rollNumber,
            willUpdate: m.willUpdate,
          })),
          unmatched: unmatched.slice(0, 30).map((u) => ({
            rowNumber: u.row.rowNumber,
            name: u.row.name,
            rollNumber: u.row.rollNumber,
            email: u.row.email,
            section: u.willBeCreatedIn.section,
            college: u.willBeCreatedIn.college,
          })),
          errors: errors.slice(0, 10),
        },
      });
    }

    // COMMIT mode
    let updated = 0;
    let created = 0;
    let skipped = 0;
    const failures: any[] = [];

    // Update matched — INCLUDING section/college if provided
    for (const m of matched) {
      try {
        const updateData: any = {};
        if (m.row.name) updateData.name = m.row.name;
        if (m.row.email) updateData.email = m.row.email.toLowerCase().trim();
        if (m.row.phone) updateData.phone = m.row.phone;
        if (m.row.address) updateData.address = m.row.address;

        // Update section if Excel provides valid one
        if (m.row.sectionName && m.row.courseName && m.row.yearLabel) {
          const targetSection = sections.find(
            (s) =>
              s.name.toLowerCase() === m.row.sectionName!.toLowerCase() &&
              s.course.name.toLowerCase() === m.row.courseName!.toLowerCase() &&
              s.course.year.label === m.row.yearLabel
          );
          if (targetSection) updateData.sectionId = targetSection.id;
        }

        // Update college if Excel provides valid one
        if (m.row.collegeName) {
          const targetCollege = colleges.find(
            (c) => c.name.toLowerCase() === m.row.collegeName!.toLowerCase()
          );
          if (targetCollege) updateData.collegeId = targetCollege.id;
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.student.update({
            where: { id: m.student.id },
            data: updateData,
          });
          updated++;
        }
      } catch (err: any) {
        failures.push({ row: m.row.rowNumber, reason: err.message });
      }
    }

    if (addUnmatched) {
      const unassignedCollegeId = await ensureUnassignedCollege();

      let fallbackYearId = defaultYearId;
      if (!fallbackYearId) {
        const firstYear = await prisma.year.findFirst({
          orderBy: { label: "desc" },
        });
        if (firstYear) fallbackYearId = firstYear.id;
      }

      for (const u of unmatched) {
        try {
          const resolved = resolveTargetIds(
            u.row,
            { colleges, years, courses, sections },
            { defaultYearId, defaultCollegeId, defaultCourseId, defaultSectionId }
          );

          let studentYearId = resolved.yearId;
          if (!studentYearId) studentYearId = fallbackYearId;

          if (!studentYearId) {
            failures.push({
              row: u.row.rowNumber,
              reason: "No year in system — add a year in Manage first",
            });
            continue;
          }

          let finalSectionId = resolved.sectionId;
          if (!finalSectionId) {
            finalSectionId = await ensureUnassignedSection(studentYearId);
          }

          const finalCollegeId = resolved.collegeId || unassignedCollegeId;

          await prisma.student.create({
            data: {
              name: u.row.name!,
              rollNumber: u.row.rollNumber!.trim(),
              email: u.row.email!.toLowerCase().trim(),
              phone: u.row.phone,
              address: u.row.address,
              sectionId: finalSectionId,
              collegeId: finalCollegeId,
            },
          });
          created++;
        } catch (err: any) {
          failures.push({
            row: u.row.rowNumber,
            reason: err.code === "P2002" ? "Duplicate roll/email" : err.message,
          });
        }
      }
    } else {
      skipped = unmatched.length;
    }

    return NextResponse.json({
      preview: false,
      updated,
      created,
      skipped,
      errors: errors.length,
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

function resolveTargetIds(
  row: StudentRow,
  lookups: {
    colleges: any[];
    years: any[];
    courses: any[];
    sections: any[];
  },
  defaults: {
    defaultYearId: string | null;
    defaultCollegeId: string | null;
    defaultCourseId: string | null;
    defaultSectionId: string | null;
  }
): { collegeId: string | null; sectionId: string | null; yearId: string | null } {
  let collegeId: string | null = null;
  if (row.collegeName) {
    const match = lookups.colleges.find(
      (c) => c.name.toLowerCase() === row.collegeName!.toLowerCase()
    );
    if (match) collegeId = match.id;
  }
  if (!collegeId) collegeId = defaults.defaultCollegeId;

  let sectionId: string | null = null;
  let yearId: string | null = null;

  if (row.sectionName && row.courseName && row.yearLabel) {
    const match = lookups.sections.find(
      (s) =>
        s.name.toLowerCase() === row.sectionName!.toLowerCase() &&
        s.course.name.toLowerCase() === row.courseName!.toLowerCase() &&
        s.course.year.label === row.yearLabel
    );
    if (match) {
      sectionId = match.id;
      yearId = match.course.yearId;
    }
  }
  if (!sectionId) sectionId = defaults.defaultSectionId;

  if (!yearId && defaults.defaultSectionId) {
    const s = lookups.sections.find((s) => s.id === defaults.defaultSectionId);
    if (s) yearId = s.course.yearId;
  }

  if (!yearId && row.yearLabel) {
    const y = lookups.years.find((y) => y.label === row.yearLabel);
    if (y) yearId = y.id;
  }

  if (!yearId) yearId = defaults.defaultYearId;

  return { collegeId, sectionId, yearId };
}