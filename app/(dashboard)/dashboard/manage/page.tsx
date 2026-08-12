"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Calendar,
  BookOpen,
  Users,
  Trash2,
  ChevronRight,
  ChevronDown,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getBatchInfo } from "@/lib/year-utils";
import { useSelectedYear } from "@/components/providers/year-provider";


interface Year {
  id: string;
  label: string;
  _count: { courses: number };
}

interface Course {
  id: string;
  name: string;
  yearId: string;
  year: { label: string };
  _count: { sections: number };
}

interface Section {
  id: string;
  name: string;
  courseId: string;
  _count: { students: number };
}

export default function ManagePage() {
  const { data: session } = useSession();
  const { triggerRefresh } = useSelectedYear();
  const canWrite =
    session?.user.role === "SUPER_ADMIN" || session?.user.role === "WRITE_ADMIN";

  const [years, setYears] = useState<Year[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  
  // Dialogs
  const [yearDialogOpen, setYearDialogOpen] = useState(false);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);

  // Form state
  const [newYear, setNewYear] = useState("");
  const [newCourse, setNewCourse] = useState({ name: "", yearId: "" });
  const [newSection, setNewSection] = useState({ name: "", courseId: "" });

  async function loadData() {
    setLoading(true);
    try {
      const [yRes, cRes, sRes] = await Promise.all([
        fetch("/api/years"),
        fetch("/api/courses"),
        fetch("/api/sections"),
      ]);
      const [yData, cData, sData] = await Promise.all([
        yRes.json(),
        cRes.json(),
        sRes.json(),
      ]);
      setYears(yData);
      setCourses(cData);
      setSections(sData);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Actions
  async function addYear() {
    const res = await fetch("/api/years", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newYear }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Failed");
    toast.success(`Year ${newYear} added`);
    setNewYear("");
    setYearDialogOpen(false);
    loadData();
    triggerRefresh(); 
  }

  async function addCourse() {
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCourse),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Failed");
    toast.success(`Course ${newCourse.name} added`);
    setNewCourse({ name: "", yearId: "" });
    setCourseDialogOpen(false);
    loadData();
  }

  async function addSection() {
    const res = await fetch("/api/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSection),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Failed");
    toast.success(`Section ${newSection.name} added`);
    setNewSection({ name: "", courseId: "" });
    setSectionDialogOpen(false);
    loadData();
  }

  async function deleteYear(id: string, label: string) {
    if (!confirm(`Delete year ${label}? This removes ALL data under it.`)) return;
    const res = await fetch(`/api/years/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Failed to delete");
    toast.success(`Year ${label} deleted`);
    loadData();
    triggerRefresh(); 
  }

  async function deleteCourse(id: string, name: string) {
    if (!confirm(`Delete course ${name}? This removes all sections and students under it.`)) return;
    const res = await fetch(`/api/courses/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Failed to delete");
    toast.success(`Course ${name} deleted`);
    loadData();
    
  }

  async function deleteSection(id: string, name: string) {
    if (!confirm(`Delete section ${name}? Students in it will be removed.`)) return;
    const res = await fetch(`/api/sections/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Failed to delete");
    toast.success(`Section ${name} deleted`);
    loadData();
  }

  function toggleYear(id: string) {
    const next = new Set(expandedYears);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedYears(next);
  }

  function toggleCourse(id: string) {
    const next = new Set(expandedCourses);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedCourses(next);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Manage Structure</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Add and organize years, courses, and sections
          </p>
        </div>

        {!canWrite && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-2 rounded-lg">
            <Lock className="h-3.5 w-3.5" />
            View only — you don't have write access
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid gap-3 md:grid-cols-3">
        <StatChip icon={Calendar} label="Years" value={years.length} color="primary" />
        <StatChip icon={BookOpen} label="Courses" value={courses.length} color="emerald" />
        <StatChip icon={Users} label="Sections" value={sections.length} color="gold" />
      </div>

      {/* Add buttons */}
      {canWrite && (
        <div className="flex gap-2 flex-wrap">
          <Dialog open={yearDialogOpen} onOpenChange={setYearDialogOpen}>
           <DialogTrigger className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
  <Plus className="h-4 w-4" />
  Add Year
</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Admission Year</DialogTitle>
                <DialogDescription>
                  Enter the year students were admitted (e.g., 2025)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  placeholder="2025"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  type="number"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setYearDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={addYear} disabled={!newYear.trim()}>
                  Add Year
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
            <DialogTrigger
  disabled={years.length === 0}
  className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
>
  <Plus className="h-4 w-4" />
  Add Course
</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Course</DialogTitle>
                <DialogDescription>
                  Add a course under an admission year (e.g., BTech, BCA)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select
                    value={newCourse.yearId}
                    onValueChange={(v) => setNewCourse({ ...newCourse, yearId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y.id} value={y.id}>
                          {y.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Course Name</Label>
                  <Input
                    placeholder="BTech"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCourseDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={addCourse} disabled={!newCourse.name.trim() || !newCourse.yearId}>
                  Add Course
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
            <DialogTrigger
  disabled={courses.length === 0}
  className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
>
  <Plus className="h-4 w-4" />
  Add Section
</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Section</DialogTitle>
                <DialogDescription>
                  Add a section under a course (e.g., A, B, C)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Course</Label>
                  <Select
                    value={newSection.courseId}
                    onValueChange={(v) => setNewSection({ ...newSection, courseId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.year.label} · {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Section Name</Label>
                  <Input
                    placeholder="A"
                    value={newSection.name}
                    onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSectionDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={addSection} disabled={!newSection.name.trim() || !newSection.courseId}>
                  Add Section
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Tree view */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Structure</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : years.length === 0 ? (
            <div className="py-12 text-center">
              <div className="inline-flex p-3 rounded-full bg-muted mb-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No years yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                {canWrite ? "Click 'Add Year' to get started" : "Ask admin to add years"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {years.map((year) => {
                const info = getBatchInfo(parseInt(year.label));
                const yearCourses = courses.filter((c) => c.yearId === year.id);
                const isExpanded = expandedYears.has(year.id);

                return (
                  <div key={year.id}>
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-md p-2 hover:bg-accent group transition-colors",
                      )}
                    >
                      <button
                        onClick={() => toggleYear(year.id)}
                        className="p-0.5 hover:bg-muted rounded"
                        disabled={yearCourses.length === 0}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100" />
                        )}
                      </button>
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{year.label}</span>
                      <span className="text-xs text-muted-foreground">· {info.label}</span>
                      {info.status === "PASSED_OUT" && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[color:var(--gold)]/10 text-[color:var(--gold)]">
                          Alumni
                        </span>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {year._count.courses} {year._count.courses === 1 ? "course" : "courses"}
                      </span>
                      {canWrite && (
                        <button
                          onClick={() => deleteYear(year.id, year.label)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="ml-6 border-l pl-3 space-y-1 mt-1">
                        {yearCourses.map((course) => {
                          const courseSections = sections.filter(
                            (s) => s.courseId === course.id
                          );
                          const isCourseExpanded = expandedCourses.has(course.id);

                          return (
                            <div key={course.id}>
                              <div className="flex items-center gap-2 rounded-md p-2 hover:bg-accent group transition-colors">
                                <button
                                  onClick={() => toggleCourse(course.id)}
                                  className="p-0.5 hover:bg-muted rounded"
                                  disabled={courseSections.length === 0}
                                >
                                  {isCourseExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100" />
                                  )}
                                </button>
                                <BookOpen className="h-4 w-4 text-[color:var(--emerald)]" />
                                <span className="text-sm">{course.name}</span>
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {course._count.sections}{" "}
                                  {course._count.sections === 1 ? "section" : "sections"}
                                </span>
                                {canWrite && (
                                  <button
                                    onClick={() => deleteCourse(course.id, course.name)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>

                              {isCourseExpanded && (
                                <div className="ml-6 border-l pl-3 space-y-1 mt-1">
                                  {courseSections.map((section) => (
                                    <div
                                      key={section.id}
                                      className="flex items-center gap-2 rounded-md p-2 hover:bg-accent group transition-colors"
                                    >
                                      <div className="w-4" />
                                      <Users className="h-4 w-4 text-[color:var(--gold)]" />
                                      <span className="text-sm">{section.name}</span>
                                      <span className="ml-auto text-xs text-muted-foreground">
                                        {section._count.students}{" "}
                                        {section._count.students === 1 ? "student" : "students"}
                                      </span>
                                      {canWrite && (
                                        <button
                                          onClick={() => deleteSection(section.id, section.name)}
                                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: "primary" | "emerald" | "gold";
}) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-[color:var(--emerald)]/10 text-[color:var(--emerald)]",
    gold: "bg-[color:var(--gold)]/10 text-[color:var(--gold)]",
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className={cn("p-2 rounded-md", colorMap[color])}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold leading-tight">{value}</p>
      </div>
    </div>
  );
}