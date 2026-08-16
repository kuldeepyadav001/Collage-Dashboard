import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { parseExcelBuffer, pickField } from "@/lib/excel-parser";

const VALID_STATUSES = [
  "PLACED",
  "INTERNSHIP",
  "HIGHER_STUDIES",
  "NOT_PLACED",
  "OPTED_OUT",
];

export async function POST(req: Request) {
  const { error } = await requireAuth("WRITE_ADMIN");
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as string) || "preview";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const { rows } = parseExcelBuffer(buffer);

    const allStudents = await prisma.student.findMany({
      select: { id: true, rollNumber: true, email: true, name: true },
    });
    const byRoll = new Map(
      allStudents.map((s) => [s.rollNumber.toLowerCase(), s])
    );
    const byEmail = new Map(
      allStudents.map((s) => [s.email.toLowerCase(), s])
    );

    interface ParsedPlacement {
      rowNumber: number;
      student: any;
      status: string;
      company: string | null;
      role: string | null;
      packageLpa: number | null;
      placementDate: Date | null;
      type: string | null;
      notes: string | null;
      error?: string;
    }

    const parsed: ParsedPlacement[] = [];
    const unmatched: any[] = [];

    for (const row of rows) {
      const roll = safeString(
        pickField(row.data, ["rollnumber", "rollno", "roll", "rn"])
      );
      const email = safeString(
        pickField(row.data, ["email", "emailid", "mail", "emailaddress"])
      );

      if (!roll && !email) continue;

      let student = null;
      if (roll) student = byRoll.get(roll.toLowerCase());
      if (!student && email) student = byEmail.get(email.toLowerCase());

      if (!student) {
        unmatched.push({
          rowNumber: row.rowNumber,
          rollNumber: roll,
          email,
        });
        continue;
      }

      const rawStatus = safeString(
        pickField(row.data, ["status", "placementstatus"])
      );
      const status = rawStatus?.toUpperCase().replace(/\s+/g, "_") || "PLACED";

      if (!VALID_STATUSES.includes(status)) {
        parsed.push({
          rowNumber: row.rowNumber,
          student,
          status,
          company: null,
          role: null,
          packageLpa: null,
          placementDate: null,
          type: null,
          notes: null,
          error: `Invalid status: ${rawStatus}`,
        });
        continue;
      }

      const company = safeString(
        pickField(row.data, ["company", "companyname"])
      );
      const role = safeString(pickField(row.data, ["role", "designation", "position"]));
      const packageStr = safeString(
        pickField(row.data, ["package", "packagelpa", "salary", "ctc"])
      );
      const packageLpa = packageStr ? parseFloat(packageStr) : null;

      const dateVal = pickField(row.data, ["date", "placementdate", "offerdate"]);
      let placementDate: Date | null = null;
      if (dateVal instanceof Date) placementDate = dateVal;
      else if (dateVal) {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) placementDate = d;
      }

      const typeRaw = safeString(pickField(row.data, ["type", "placementtype"]));
      const type = typeRaw?.toUpperCase().replace(/\s+/g, "_") || null;

      const notes = safeString(pickField(row.data, ["notes", "remarks", "comment"]));

      // Validate PLACED / INTERNSHIP requires company
      if ((status === "PLACED" || status === "INTERNSHIP") && !company) {
        parsed.push({
          rowNumber: row.rowNumber,
          student,
          status,
          company,
          role,
          packageLpa,
          placementDate,
          type,
          notes,
          error: "Company required for PLACED/INTERNSHIP",
        });
        continue;
      }

      parsed.push({
        rowNumber: row.rowNumber,
        student,
        status,
        company,
        role,
        packageLpa,
        placementDate,
        type,
        notes,
      });
    }

    // Preview mode
    if (mode === "preview") {
      return NextResponse.json({
        preview: true,
        totalRows: rows.length,
        toImport: parsed.filter((p) => !p.error).length,
        errors: parsed.filter((p) => p.error).length,
        unmatched: unmatched.length,
        errorSample: parsed.filter((p) => p.error).slice(0, 10),
        unmatchedSample: unmatched.slice(0, 10),
      });
    }

    // Commit mode
    let updated = 0;
    let created = 0;
    const failures: any[] = [];

    for (const p of parsed) {
      if (p.error) {
        failures.push({ row: p.rowNumber, reason: p.error });
        continue;
      }

      try {
        const showFields = p.status === "PLACED" || p.status === "INTERNSHIP";
        const data = {
          status: p.status as any,
          company: showFields ? p.company : null,
          role: showFields ? p.role : null,
          packageLpa: showFields ? p.packageLpa : null,
          placementDate: showFields ? p.placementDate : null,
          type: showFields ? (p.type as any) : null,
          notes: p.notes,
        };

        const result = await prisma.placement.upsert({
          where: { studentId: p.student.id },
          create: { studentId: p.student.id, ...data },
          update: data,
        });

        if (result) {
          // upsert doesn't tell us which — check by createdAt vs updatedAt
          if (
            new Date(result.createdAt).getTime() ===
            new Date(result.updatedAt).getTime()
          )
            created++;
          else updated++;
        }
      } catch (err: any) {
        failures.push({ row: p.rowNumber, reason: err.message });
      }
    }

    return NextResponse.json({
      preview: false,
      created,
      updated,
      skipped: unmatched.length,
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