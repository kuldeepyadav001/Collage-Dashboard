import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StudentForm } from "@/components/students/student-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewStudentPage() {
  const session = await getServerSession(authOptions);

  if (session?.user.role === "READER") {
    redirect("/dashboard/students");
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/students"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to students
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Add New Student</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Fill in student details to add them to a section
        </p>
      </div>

      <StudentForm mode="create" />
    </div>
  );
}