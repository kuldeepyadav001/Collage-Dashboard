import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { parseExcelBuffer, pickField } from "@/lib/excel-parser";

// Standard columns that are NOT test columns
const RESERVED_COLUMNS = new Set([
  "rollnumber",
  "rollno",
  "roll",
  "rn",
  "email",
  "emailid",
  "mail",
  "emailaddress",
  "name",
  "fullname",
  "studentname",
  "phone",
  "mobile",
  "contact",
  "phoneno",
  "college",
  "collegename",
  "course",
  "coursename",
  "branch",
  "section",
  "sectionname",
  "sec",
  "year",
  "batch",
  "yearlabel",
  "admissionyear",
]);

export async function POST(req: Request) {
  const { error } = await requireAuth("WRITE_ADMIN");
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as string) || "preview";
    const yearId = formData.get("yearId") as string | null;
    const testsConfigJson = formData.get("testsConfig") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (mode === "commit" && !yearId) {
      return NextResponse.json({ error: "Year required" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const { rawHeaders, rows } = parseExcelBuffer(buffer);

    // Identify test columns (everything except reserved)
    const testColumns: { header: string; key: string }[] = [];
    rawHeaders.forEach((h) => {
      const key = h.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (h && !RESERVED_COLUMNS.has(key)) {
        testColumns.push({ header: h, key });
      }
    });

    if (testColumns.length === 0) {
      return NextResponse.json(
        {
          error:
            "No test columns detected. Expected columns like 'Test 1', 'HackerRank Assessment', etc.",
        },
        { status: 400 }
      );
    }

    // Preview mode — report what we found
    if (mode === "preview") {
      // Match student stats
      const allStudents = await prisma.student.findMany({
        select: { id: true, rollNumber: true, email: true, name: true },
      });
      const byRoll = new Map(
        allStudents.map((s) => [s.rollNumber.toLowerCase(), s])
      );
      const byEmail = new Map(
        allStudents.map((s) => [s.email.toLowerCase(), s])
      );

      let matched = 0;
      let unmatched = 0;
      const unmatchedSample: any[] = [];

      for (const row of rows) {
        const roll = safeString(
          pickField(row.data, ["rollnumber", "rollno", "roll", "rn"])
        );
        const email = safeString(
          pickField(row.data, ["email", "emailid", "mail", "emailaddress"])
        );

        if (!roll && !email) continue;

        let found = null;
        if (roll) found = byRoll.get(roll.toLowerCase());
        if (!found && email) found = byEmail.get(email.toLowerCase());

        if (found) matched++;
        else {
          unmatched++;
          if (unmatchedSample.length < 10) {
            unmatchedSample.push({
              rowNumber: row.rowNumber,
              rollNumber: roll,
              email,
              name: safeString(
                pickField(row.data, ["name", "fullname", "studentname"])
              ),
            });
          }
        }
      }

      return NextResponse.json({
        preview: true,
        totalRows: rows.length,
        testColumns: testColumns.map((t) => t.header),
        matched,
        unmatched,
        unmatchedSample,
      });
    }

    // Commit mode — parse tests config
    if (!testsConfigJson) {
      return NextResponse.json(
        { error: "Test configuration required" },
        { status: 400 }
      );
    }

    const testsConfig: {
      header: string;
      date: string;
      maxMarks: number;
    }[] = JSON.parse(testsConfigJson);

    // Create test rows first
    const createdTests: {
      column: { header: string; key: string };
      test: any;
    }[] = [];

    for (const cfg of testsConfig) {
      const col = testColumns.find((c) => c.header === cfg.header);
      if (!col) continue;

      const test = await prisma.test.create({
        data: {
          name: cfg.header,
          date: new Date(cfg.date),
          maxMarks: cfg.maxMarks,
          yearId,
        },
      });
      createdTests.push({ column: col, test });
    }

    // Now process marks
    const allStudents = await prisma.student.findMany({
      select: { id: true, rollNumber: true, email: true },
    });
    const byRoll = new Map(
      allStudents.map((s) => [s.rollNumber.toLowerCase(), s])
    );
    const byEmail = new Map(
      allStudents.map((s) => [s.email.toLowerCase(), s])
    );

    let marksCreated = 0;
    let rowsSkipped = 0;
    const failures: any[] = [];

    for (const row of rows) {
      const roll = safeString(
        pickField(row.data, ["rollnumber", "rollno", "roll", "rn"])
      );
      const email = safeString(
        pickField(row.data, ["email", "emailid", "mail", "emailaddress"])
      );

      let student = null;
      if (roll) student = byRoll.get(roll.toLowerCase());
      if (!student && email) student = byEmail.get(email.toLowerCase());

      if (!student) {
        rowsSkipped++;
        continue;
      }

      // For each test column with a value, create a mark
      for (const { column, test } of createdTests) {
        const value = row.data[column.key];
        if (value === null || value === undefined || value === "") continue;

        const marks = parseFloat(String(value));
        if (isNaN(marks)) {
          failures.push({
            row: row.rowNumber,
            test: column.header,
            reason: `Invalid marks value: ${value}`,
          });
          continue;
        }
        if (marks < 0 || marks > test.maxMarks) {
          failures.push({
            row: row.rowNumber,
            test: column.header,
            reason: `Marks ${marks} out of range (0-${test.maxMarks})`,
          });
          continue;
        }

        try {
          await prisma.testMark.create({
            data: {
              testId: test.id,
              studentId: student.id,
              marks,
            },
          });
          marksCreated++;
        } catch (err: any) {
          failures.push({
            row: row.rowNumber,
            test: column.header,
            reason: err.message,
          });
        }
      }
    }

    return NextResponse.json({
      preview: false,
      testsCreated: createdTests.length,
      marksCreated,
      rowsSkipped,
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