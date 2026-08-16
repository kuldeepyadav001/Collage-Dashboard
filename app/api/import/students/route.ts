import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { parseExcelBuffer, pickField } from "@/lib/excel-parser";

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

interface MatchResult {
  matched: {
    row: StudentRow;
    student: { id: string; name: string; rollNumber: string };
    action: "update" | "no_change";
  }[];
  unmatched: {
    row: StudentRow;
    reason: string;
  }[];
  errors: {
    row: StudentRow;
    error: string;
  }[];
}

// STEP 1: PREVIEW — parses + matches, returns summary WITHOUT writing
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

    // Parse each row into structured student data
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
        pickField(r.data, ["year", "batch", "yearlabel", "admissionyear"])
      ),
    }));

    // Load lookup data
    const [allStudents, colleges, years, courses, sections] = await Promise.all([
      prisma.student.findMany({
        select: { id: true, name: true, rollNumber: true, email: true },
      }),
      prisma.college.findMany(),
      prisma.year.findMany(),
      prisma.course.findMany({ include: { year: true } }),
      prisma.section.findMany({ include: { course: { include: { year: true } } } }),
    ]);

    const studentsByRoll = new Map(
      allStudents.map((s) => [s.rollNumber.toLowerCase(), s])
    );
    const studentsByEmail = new Map(
      allStudents.map((s) => [s.email.toLowerCase(), s])
    );

    const result: MatchResult = {
      matched: [],
      unmatched: [],
      errors: [],
    };

    // Match each row
    for (const row of studentRows) {
      // Basic validation
      if (!row.name && !row.rollNumber && !row.email) {
        continue; // skip completely empty rows
      }

      if (!row.rollNumber && !row.email) {
        result.errors.push({
          row,
          error: "Missing both roll number and email",
        });
        continue;
      }

      // Try to match
      let existing = null;
      if (row.rollNumber) {
        existing = studentsByRoll.get(row.rollNumber.toLowerCase());
      }
      if (!existing && row.email) {
        existing = studentsByEmail.get(row.email.toLowerCase());
      }

      if (existing) {
        result.matched.push({
          row,
          student: existing,
          action: "update",
        });
      } else {
        // Try to resolve where this new student would go
        const resolved = resolveTargetIds(
          row,
          { colleges, years, courses, sections },
          {
            defaultYearId,
            defaultCollegeId,
            defaultCourseId,
            defaultSectionId,
          }
        );

        if (!resolved.sectionId || !resolved.collegeId) {
          result.unmatched.push({
            row,
            reason: !resolved.sectionId
              ? "Cannot determine section (no default set and no matching Excel columns)"
              : "Cannot determine college",
          });
          continue;
        }

        // Would create if user confirms
        result.unmatched.push({
          row,
          reason: "New student — will be created if you confirm",
        });
      }
    }

    // If mode = preview, just return the report
    if (mode === "preview") {
      return NextResponse.json({
        preview: true,
        totalRows: studentRows.length,
        matched: result.matched.length,
        unmatched: result.unmatched.length,
        errors: result.errors.length,
        details: {
          matched: result.matched.slice(0, 10),
          unmatched: result.unmatched.slice(0, 20),
          errors: result.errors,
        },
      });
    }

    // Mode = commit — actually write to database
    let updated = 0;
    let created = 0;
    let skipped = 0;
    const failures: any[] = [];

    // Update matched students
    for (const m of result.matched) {
      try {
        const updateData: any = {};
        if (m.row.name) updateData.name = m.row.name;
        if (m.row.email) updateData.email = m.row.email.toLowerCase();
        if (m.row.phone) updateData.phone = m.row.phone;
        if (m.row.address) updateData.address = m.row.address;

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

    // Create unmatched if user confirmed
    if (addUnmatched) {
      for (const u of result.unmatched) {
        try {
          if (u.reason.startsWith("Cannot determine")) {
            skipped++;
            continue;
          }

          const resolved = resolveTargetIds(
            u.row,
            { colleges, years, courses, sections },
            {
              defaultYearId,
              defaultCollegeId,
              defaultCourseId,
              defaultSectionId,
            }
          );

          if (!resolved.sectionId || !resolved.collegeId) {
            skipped++;
            continue;
          }

          if (!u.row.name || !u.row.rollNumber || !u.row.email) {
            failures.push({
              row: u.row.rowNumber,
              reason: "Missing required fields (name, roll, email)",
            });
            continue;
          }

          await prisma.student.create({
            data: {
              name: u.row.name,
              rollNumber: u.row.rollNumber,
              email: u.row.email.toLowerCase(),
              phone: u.row.phone,
              address: u.row.address,
              sectionId: resolved.sectionId,
              collegeId: resolved.collegeId,
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
      skipped = result.unmatched.length;
    }

    return NextResponse.json({
      preview: false,
      updated,
      created,
      skipped,
      errors: result.errors.length,
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
): { collegeId: string | null; sectionId: string | null } {
  // College
  let collegeId: string | null = null;
  if (row.collegeName) {
    const match = lookups.colleges.find(
      (c) => c.name.toLowerCase() === row.collegeName!.toLowerCase()
    );
    if (match) collegeId = match.id;
  }
  if (!collegeId) collegeId = defaults.defaultCollegeId;

  // Section is trickier — needs year + course + section combo
  let sectionId: string | null = null;

  if (row.sectionName && row.courseName && row.yearLabel) {
    const match = lookups.sections.find(
      (s) =>
        s.name.toLowerCase() === row.sectionName!.toLowerCase() &&
        s.course.name.toLowerCase() === row.courseName!.toLowerCase() &&
        s.course.year.label === row.yearLabel
    );
    if (match) sectionId = match.id;
  }
  if (!sectionId) sectionId = defaults.defaultSectionId;

  return { collegeId, sectionId };
}