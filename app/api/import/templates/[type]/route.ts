import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { generateExcel } from "@/lib/excel";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { type } = await params;

  let filename = "";
  let sheetName = "";
  let columns: { header: string; key: string; width?: number }[] = [];
  let sampleRows: any[] = [];

  if (type === "students") {
    filename = "students_template.xlsx";
    sheetName = "Students";
    columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Roll Number", key: "rollNumber", width: 18 },
      { header: "Email", key: "email", width: 30 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Address", key: "address", width: 30 },
      { header: "College", key: "college", width: 12 },
      { header: "Year", key: "year", width: 8 },
      { header: "Course", key: "course", width: 12 },
      { header: "Section", key: "section", width: 10 },
    ];
    sampleRows = [
      {
        name: "Ram Kumar",
        rollNumber: "24BT001",
        email: "ram@college.com",
        phone: "9876543210",
        address: "Kanpur, UP",
        college: "MIPS",
        year: "2024",
        course: "BTech",
        section: "CS-3A-1",
      },
      {
        name: "Sita Rani",
        rollNumber: "25BT002",
        email: "sita@college.com",
        phone: "9876543211",
        address: "",
        college: "MPEC",
        year: "2025",
        course: "BTech",
        section: "CSE-2A-2",
      },
    ];
  } else if (type === "test-marks") {
    filename = "test_marks_template.xlsx";
    sheetName = "Test Marks";
    columns = [
      { header: "Roll Number", key: "rollNumber", width: 18 },
      { header: "Email", key: "email", width: 30 },
      { header: "Name", key: "name", width: 25 },
      { header: "HackerRank Test 1", key: "test1", width: 20 },
      { header: "HackerRank Test 2", key: "test2", width: 20 },
      { header: "Coding Test 3", key: "test3", width: 20 },
    ];
    sampleRows = [
      {
        rollNumber: "24BT001",
        email: "ram@college.com",
        name: "Ram Kumar",
        test1: 45,
        test2: 50,
        test3: 38,
      },
      {
        rollNumber: "24BT002",
        email: "sita@college.com",
        name: "Sita Rani",
        test1: 42,
        test2: "",
        test3: 40,
      },
    ];
  } else if (type === "placements") {
    filename = "placements_template.xlsx";
    sheetName = "Placements";
    columns = [
      { header: "Roll Number", key: "rollNumber", width: 18 },
      { header: "Email", key: "email", width: 30 },
      { header: "Status", key: "status", width: 15 },
      { header: "Company", key: "company", width: 20 },
      { header: "Role", key: "role", width: 20 },
      { header: "Package", key: "package", width: 10 },
      { header: "Date", key: "date", width: 12 },
      { header: "Type", key: "type", width: 15 },
      { header: "Notes", key: "notes", width: 30 },
    ];
    sampleRows = [
      {
        rollNumber: "24BT001",
        email: "ram@college.com",
        status: "PLACED",
        company: "Google",
        role: "SDE",
        package: 25,
        date: "2025-08-15",
        type: "ON_CAMPUS",
        notes: "",
      },
      {
        rollNumber: "24BT002",
        email: "sita@college.com",
        status: "INTERNSHIP",
        company: "Razorpay",
        role: "SDE Intern",
        package: 3,
        date: "2025-06-01",
        type: "OFF_CAMPUS",
        notes: "6-month internship",
      },
      {
        rollNumber: "24BT003",
        email: "",
        status: "HIGHER_STUDIES",
        company: "",
        role: "",
        package: "",
        date: "",
        type: "",
        notes: "MS at IIT Bombay",
      },
    ];
  } else {
    return NextResponse.json({ error: "Invalid template type" }, { status: 400 });
  }

  const buffer = generateExcel(sheetName, columns, sampleRows);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}