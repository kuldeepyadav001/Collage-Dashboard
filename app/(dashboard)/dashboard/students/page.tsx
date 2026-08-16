"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSelectedYear } from "@/components/providers/year-provider";
import { useSelectedCollege } from "@/components/providers/college-provider";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ExportButton } from "@/components/ui/export-button";
import {
  Plus,
  Search,
  Users,
  ArrowUpRight,
  ArrowLeft,
  GraduationCap,
} from "lucide-react";

interface Section {
  id: string;
  name: string;
  courseId: string;
  course: {
    name: string;
    year: { label: string };
  };
  _count: { students: number };
}

interface Student {
  id: string;
  name: string;
  rollNumber: string;
  email: string;
  college: { name: string };
  section: {
    name: string;
    course: {
      name: string;
      year: { label: string };
    };
  };
}

export default function StudentsPage() {
  const { data: session } = useSession();
  const { selectedYear } = useSelectedYear();
  const { selectedCollegeId } = useSelectedCollege();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sectionId = searchParams.get("sectionId");
  const searchQ = searchParams.get("q") || "";

  const canWrite =
    session?.user.role === "SUPER_ADMIN" ||
    session?.user.role === "WRITE_ADMIN";

  const [sections, setSections] = useState<Section[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchQ);

  // Load sections (grouped by course)
  useEffect(() => {
    if (sectionId) return; // don't load sections if viewing student list
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedYear) params.set("year", String(selectedYear));
    fetch(`/api/sections?${params}`)
      .then((r) => r.json())
      .then((all: Section[]) => {
        const filtered = selectedYear
          ? all.filter((s) => s.course.year.label === String(selectedYear))
          : all;
        setSections(filtered);
      })
      .catch(() => setSections([]))
      .finally(() => setLoading(false));
  }, [selectedYear, sectionId]);

  // Load students when sectionId is set OR search is active
  useEffect(() => {
    if (!sectionId && !search) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (sectionId) params.set("sectionId", sectionId);
    if (selectedYear && !sectionId) params.set("year", String(selectedYear));
    if (selectedCollegeId) params.set("collegeId", selectedCollegeId);
    if (search) params.set("q", search);

    const t = setTimeout(
      () => {
        fetch(`/api/students?${params}`)
          .then((r) => r.json())
          .then(setStudents)
          .catch(() => setStudents([]))
          .finally(() => setLoading(false));
      },
      search ? 300 : 0,
    );

    return () => clearTimeout(t);
  }, [sectionId, selectedYear, selectedCollegeId, search]);

  // Load section details when in section view
  useEffect(() => {
    if (!sectionId) {
      setSelectedSection(null);
      return;
    }
    fetch(`/api/sections`)
      .then((r) => r.json())
      .then((all: Section[]) => {
        setSelectedSection(all.find((s) => s.id === sectionId) || null);
      });
  }, [sectionId]);

  // Group sections by course
  const groupedSections = sections.reduce(
    (acc, s) => {
      const key = `${s.course.year.label}__${s.course.name}`;
      if (!acc[key]) {
        acc[key] = {
          year: s.course.year.label,
          course: s.course.name,
          sections: [],
        };
      }
      acc[key].sections.push(s);
      return acc;
    },
    {} as Record<string, { year: string; course: string; sections: Section[] }>,
  );

  // Section detail view (when sectionId in URL)
  if (sectionId) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push("/dashboard/students")}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to sections
        </button>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {selectedSection
                ? `${selectedSection.course.name} · Section ${selectedSection.name}`
                : "Loading..."}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {selectedSection && `${selectedSection.course.year.label} batch`}
              {selectedCollegeId && ` · filtered by college`}
            </p>
          </div>
          <div className="flex gap-2">
            {selectedSection && (
              <ExportButton
                url={`/api/sections/${sectionId}/export`}
                label="Export"
              />
            )}
            {canWrite && (
              <Link
                href="/dashboard/students/new"
                className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Student
              </Link>
            )}
          </div>
        </div>

        <StudentList
          students={students}
          loading={loading}
          canWrite={canWrite}
          search={search}
        />
      </div>
    );
  }

  // Search view (when search active but no section)
  if (search) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Search results
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Searching for "{search}"
            </p>
          </div>
          <button
            onClick={() => {
              setSearch("");
              router.push("/dashboard/students");
            }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear search
          </button>
        </div>

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, roll, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <StudentList
          students={students}
          loading={loading}
          canWrite={canWrite}
          search={search}
        />
      </div>
    );
  }

  // Section grid view (default)
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {selectedYear
              ? `Browsing sections for ${selectedYear} batch`
              : "Browsing sections across all batches"}
          </p>
        </div>
        {canWrite && (
          <Link
            href="/dashboard/students/new"
            className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Student
          </Link>
        )}
      </div>

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search students across all sections..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Section groups */}
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Loading...
        </div>
      ) : sections.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="inline-flex p-3 rounded-full bg-muted mb-3">
              <GraduationCap className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No sections found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {canWrite
                ? "Add sections from Manage first"
                : "Ask admin to add sections"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSections).map(([key, group]) => (
            <div key={key}>
              <div className="flex items-baseline gap-2 mb-3">
                <h2 className="text-sm font-semibold">{group.course}</h2>
                <span className="text-xs text-muted-foreground">
                  · {group.year}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {group.sections.map((s) => (
                  <Link
                    key={s.id}
                    href={`/dashboard/students?sectionId=${s.id}`}
                    className="group flex items-center gap-4 rounded-lg border p-4 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all bg-card"
                  >
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">Section {s.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {s._count.students}{" "}
                        {s._count.students === 1 ? "student" : "students"}
                      </p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentList({
  students,
  loading,
  canWrite,
  search,
}: {
  students: Student[];
  loading: boolean;
  canWrite: boolean;
  search: string;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center">
            <div className="inline-flex p-3 rounded-full bg-muted mb-3">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No students found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search
                ? "Try a different search"
                : canWrite
                  ? "Add students from the button above"
                  : "Ask admin to add students"}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {students.map((s) => {
              const initials = s.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
              return (
                <Link
                  key={s.id}
                  href={`/dashboard/students/${s.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-accent transition-colors group"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                        {s.college.name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {s.rollNumber} · {s.email}
                    </p>
                  </div>
                  <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{s.section.course.year.label}</span>
                    <span>·</span>
                    <span>{s.section.course.name}</span>
                    <span>·</span>
                    <span>Sec {s.section.name}</span>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
