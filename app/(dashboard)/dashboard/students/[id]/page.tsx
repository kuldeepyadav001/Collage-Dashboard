import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Sparkles,
  FileText,
  Briefcase,
  Pencil,
} from "lucide-react";
import { getBatchInfo } from "@/lib/year-utils";
import { DeleteStudentButton } from "@/components/students/delete-student-button";

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  const canEdit =
    session?.user.role === "SUPER_ADMIN" ||
    session?.user.role === "WRITE_ADMIN";

  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      section: {
        include: {
          course: { include: { year: true } },
        },
      },
      eliteMemberships: {
        include: { eliteSection: true },
      },
      placement: true,
      testMarks: {
        include: { test: true },
        orderBy: { test: { date: "desc" } },
      },
    },
  });

  if (!student) notFound();

  const batchInfo = getBatchInfo(parseInt(student.section.course.year.label));
  const initials = student.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const avgMarks =
    student.testMarks.length > 0
      ? (
          student.testMarks.reduce(
            (acc, m) => acc + (m.marks / m.test.maxMarks) * 100,
            0,
          ) / student.testMarks.length
        ).toFixed(1)
      : null;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back link */}
      <Link
        href="/dashboard/students"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to students
      </Link>

      {/* Header card */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/20 via-[color:var(--gold)]/10 to-transparent" />
        <CardContent className="p-6 pt-0">
          <div className="flex items-start gap-6 -mt-12">
            <Avatar className="h-24 w-24 border-4 border-card ring-2 ring-primary/20">
              <AvatarImage src={student.photoUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-[color:var(--gold)] text-primary-foreground text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 pt-14">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {student.name}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Roll No:{" "}
                    <span className="font-mono">{student.rollNumber}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                      {student.section.course.year.label}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-[color:var(--emerald)]/10 text-[color:var(--emerald)] font-medium">
                      {student.section.course.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-[color:var(--gold)]/10 text-[color:var(--gold)] font-medium">
                      Section {student.section.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                      {student.college.name}
                    </span>

                    <span className="text-xs text-muted-foreground">
                      · {batchInfo.label}
                    </span>
                    {batchInfo.status === "PASSED_OUT" && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[color:var(--gold)]/10 text-[color:var(--gold)]">
                        Alumni
                      </span>
                    )}
                  </div>
                </div>

                {canEdit && (
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/students/${id}/edit`}
                      className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-md border hover:bg-accent transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                    <DeleteStudentButton id={student.id} name={student.name} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact + Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow icon={Mail} label="Email" value={student.email} />
            {student.phone && (
              <InfoRow icon={Phone} label="Phone" value={student.phone} />
            )}
            {student.address && (
              <InfoRow icon={MapPin} label="Address" value={student.address} />
            )}
          </CardContent>
        </Card>

        {/* Academic */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Academic</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              icon={GraduationCap}
              label="Course"
              value={`${student.section.course.name} · Section ${student.section.name}`}
            />
            <InfoRow
              icon={FileText}
              label="Tests Taken"
              value={String(student.testMarks.length)}
            />
            {avgMarks && (
              <InfoRow
                icon={FileText}
                label="Average Score"
                value={`${avgMarks}%`}
              />
            )}
          </CardContent>
        </Card>

        {/* Elite + Placement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Other</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Elite Sections
              </p>
              {student.eliteMemberships.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">None</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {student.eliteMemberships.map((m) => (
                    <span
                      key={m.id}
                      className="text-[11px] px-2 py-0.5 rounded bg-[color:var(--gold)]/10 text-[color:var(--gold)]"
                    >
                      {m.eliteSection.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5" />
                Placement
              </p>
              {student.placement ? (
                <div className="text-xs">
                  <p className="font-medium">
                    {student.placement.company || student.placement.status}
                  </p>
                  {student.placement.packageLpa && (
                    <p className="text-muted-foreground">
                      ₹ {student.placement.packageLpa} LPA
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Not tracked yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-sm break-words">{value}</p>
      </div>
    </div>
  );
}
