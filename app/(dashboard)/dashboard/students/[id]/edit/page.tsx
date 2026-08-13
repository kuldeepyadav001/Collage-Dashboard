import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StudentForm } from "@/components/students/student-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (session?.user.role === "READER") {
    redirect("/dashboard/students");
  }

  const { id } = await params;
  const student = await prisma.student.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      rollNumber: true,
      email: true,
      phone: true,
      address: true,
      photoUrl: true,
      sectionId: true,
      collegeId: true,
    },
  });

  if (!student) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/students/${id}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to profile
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Student</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Update student information
        </p>
      </div>

      <StudentForm mode="edit" initialData={student} />
    </div>
  );
}