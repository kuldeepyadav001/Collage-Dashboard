"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSelectedYear } from "@/components/providers/year-provider";
import { useSelectedCollege } from "@/components/providers/college-provider";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  IndianRupee,
  TrendingUp,
  Users,
  Trophy,
  Search,
  Pencil,
  Sparkles,
  Building2,
  GraduationCap,
  Ban,
  HelpCircle,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PlacementDialog } from "@/components/placements/placement-dialog";
import { ExportButton } from "@/components/ui/export-button";
interface Student {
  id: string;
  name: string;
  rollNumber: string;
  email: string;
  college: { name: string };
  section: {
    name: string;
    course: { name: string; year: { label: string } };
  };
  placement: {
    id: string;
    status: string;
    company: string | null;
    role: string | null;
    packageLpa: number | null;
    placementDate: string | null;
    type: string | null;
    notes: string | null;
  } | null;
}

interface Stats {
  totalStudents: number;
  statusCounts: Record<string, number>;
  placementRate: number;
  packages: {
    avg: number | null;
    highest: number | null;
    lowest: number | null;
    count: number;
  };
  topCompanies: { company: string; count: number }[];
  eliteVsRegular: {
    eliteTotal: number;
    elitePlaced: number;
    eliteRate: number;
    regularTotal: number;
    regularPlaced: number;
    regularRate: number;
  };
}

const STATUS_STYLE: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  PLACED: {
    label: "Placed",
    color:
      "bg-[color:var(--emerald)]/10 text-[color:var(--emerald)] ring-1 ring-[color:var(--emerald)]/20",
    icon: Briefcase,
  },
  INTERNSHIP: {
    label: "Internship",
    color:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20",
    icon: Rocket,
  },
  HIGHER_STUDIES: {
    label: "Higher Studies",
    color:
      "bg-[color:var(--gold)]/10 text-[color:var(--gold)] ring-1 ring-[color:var(--gold)]/20",
    icon: GraduationCap,
  },
  NOT_PLACED: {
    label: "Not Placed",
    color: "bg-muted text-muted-foreground ring-1 ring-border",
    icon: HelpCircle,
  },
  OPTED_OUT: {
    label: "Opted Out",
    color: "bg-destructive/10 text-destructive ring-1 ring-destructive/20",
    icon: Ban,
  },
};

export default function PlacementsPage() {
  const { data: session } = useSession();
  const { selectedYear } = useSelectedYear();
  const { selectedCollegeId } = useSelectedCollege();

  const [stats, setStats] = useState<Stats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);

  const canWrite =
    session?.user.role === "SUPER_ADMIN" ||
    session?.user.role === "WRITE_ADMIN";

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.set("year", String(selectedYear));
      if (selectedCollegeId) params.set("collegeId", selectedCollegeId);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("q", search);

      const [studentsRes, statsRes] = await Promise.all([
        fetch(`/api/placements?${params}`),
        fetch(
          `/api/placements/stats?${new URLSearchParams({
            ...(selectedYear && { year: String(selectedYear) }),
            ...(selectedCollegeId && { collegeId: selectedCollegeId }),
          }).toString()}`,
        ),
      ]);
      const [studentsData, statsData] = await Promise.all([
        studentsRes.json(),
        statsRes.json(),
      ]);
      setStudents(studentsData);
      setStats(statsData);
    } catch {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(loadData, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [selectedYear, selectedCollegeId, statusFilter, search]);

  function openLogDialog(student: Student) {
    setActiveStudent(student);
    setDialogOpen(true);
  }

  return (
   <div className="space-y-6">
    {/* Header */}
    <div className="flex items-start justify-between flex-wrap gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Placements</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Track and manage placement records across the batch
        </p>
      </div>
      <ExportButton
        url={`/api/placements/export?${new URLSearchParams({
          ...(selectedYear && { year: String(selectedYear) }),
          ...(selectedCollegeId && { collegeId: selectedCollegeId }),
          ...(statusFilter !== "all" && { status: statusFilter }),
        }).toString()}`}
        label="Export"
      />
    </div>

      {/* Top stats row */}
      {loading && !stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 h-24" />
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Students"
            value={String(stats.totalStudents)}
            hint="In scope"
            icon={Users}
            color="primary"
          />
          <StatCard
            label="Placement Rate"
            value={`${stats.placementRate.toFixed(1)}%`}
            hint={`${stats.statusCounts.PLACED} placed`}
            icon={TrendingUp}
            color="emerald"
          />
          <StatCard
            label="Average Package"
            value={
              stats.packages.avg ? `${stats.packages.avg.toFixed(1)}` : "—"
            }
            suffix="LPA"
            hint={`${stats.packages.count} packages`}
            icon={IndianRupee}
            color="gold"
          />
          <StatCard
            label="Highest Package"
            value={
              stats.packages.highest
                ? `${stats.packages.highest.toFixed(1)}`
                : "—"
            }
            suffix="LPA"
            hint={stats.packages.highest ? "Top offer" : "No offers yet"}
            icon={Trophy}
            color="amber"
          />
        </div>
      ) : null}

      {/* Status breakdown + Elite comparison + Top companies */}
      {stats && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Status breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(STATUS_STYLE).map(([key, style]) => {
                const count = stats.statusCounts[key] || 0;
                const pct = stats.totalStudents
                  ? (count / stats.totalStudents) * 100
                  : 0;
                const Icon = style.icon;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <Icon className="h-3 w-3" />
                        <span className="font-medium">{style.label}</span>
                      </span>
                      <span className="text-muted-foreground">
                        {count} · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          key === "PLACED" && "bg-[color:var(--emerald)]",
                          key === "INTERNSHIP" && "bg-blue-500",
                          key === "HIGHER_STUDIES" && "bg-[color:var(--gold)]",
                          key === "NOT_PLACED" && "bg-muted-foreground/50",
                          key === "OPTED_OUT" && "bg-destructive",
                        )}
                        style={{ width: `${pct}%` }}
                      />{" "}
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          key === "PLACED" && "bg-[color:var(--emerald)]",
                          key === "HIGHER_STUDIES" && "bg-[color:var(--gold)]",
                          key === "NOT_PLACED" && "bg-muted-foreground/50",
                          key === "OPTED_OUT" && "bg-destructive",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {stats.statusCounts.NO_RECORD > 0 && (
                <div className="pt-2 mt-2 border-t text-xs text-muted-foreground">
                  {stats.statusCounts.NO_RECORD} students have no placement
                  record yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Elite vs Regular */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[color:var(--gold)]" />
                Elite vs Regular
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">Elite Students</span>
                  <span className="text-muted-foreground">
                    {stats.eliteVsRegular.elitePlaced} /{" "}
                    {stats.eliteVsRegular.eliteTotal}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[color:var(--gold)] transition-all"
                    style={{ width: `${stats.eliteVsRegular.eliteRate}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.eliteVsRegular.eliteRate.toFixed(1)}% placement rate
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">Regular Students</span>
                  <span className="text-muted-foreground">
                    {stats.eliteVsRegular.regularPlaced} /{" "}
                    {stats.eliteVsRegular.regularTotal}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${stats.eliteVsRegular.regularRate}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.eliteVsRegular.regularRate.toFixed(1)}% placement rate
                </p>
              </div>
              {stats.eliteVsRegular.eliteTotal > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Elite students are{" "}
                    <span className="font-medium text-foreground">
                      {stats.eliteVsRegular.regularRate > 0
                        ? (
                            stats.eliteVsRegular.eliteRate /
                            stats.eliteVsRegular.regularRate
                          ).toFixed(1)
                        : "—"}
                      x
                    </span>{" "}
                    more likely to be placed
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top companies */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Top Companies
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topCompanies.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No placements yet
                </p>
              ) : (
                <div className="space-y-2">
                  {stats.topCompanies.slice(0, 5).map((c, i) => (
                    <div
                      key={c.company}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono text-muted-foreground w-4">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium truncate">
                          {c.company}
                        </span>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                        {c.count} {c.count === 1 ? "offer" : "offers"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Student list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-base font-semibold">Students</h2>
          <div className="flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue>
                  {statusFilter === "all"
                    ? "All statuses"
                    : statusFilter === "NO_RECORD"
                      ? "No record"
                      : STATUS_STYLE[statusFilter]?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="PLACED">Placed</SelectItem>
                <SelectItem value="INTERNSHIP">Internship</SelectItem>
                <SelectItem value="HIGHER_STUDIES">Higher Studies</SelectItem>
                <SelectItem value="NOT_PLACED">Not Placed</SelectItem>
                <SelectItem value="OPTED_OUT">Opted Out</SelectItem>
                <SelectItem value="NO_RECORD">No Record</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 w-48"
              />
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : students.length === 0 ? (
              <div className="py-16 text-center">
                <div className="inline-flex p-3 rounded-full bg-muted mb-3">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No students found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Adjust filters or add students first
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
                  const style = s.placement
                    ? STATUS_STYLE[s.placement.status]
                    : null;
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 p-3 hover:bg-accent transition-colors group"
                    >
                      <Link
                        href={`/dashboard/students/${s.id}`}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate">
                              {s.name}
                            </p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                              {s.college.name}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {s.rollNumber} · {s.section.course.name} · Sec{" "}
                            {s.section.name}
                          </p>
                        </div>
                      </Link>

                      <div className="hidden md:block text-right min-w-[180px]">
                        {s.placement ? (
                          <div className="space-y-0.5">
                            {(s.placement.status === "PLACED" ||
                              s.placement.status === "INTERNSHIP") &&
                            s.placement.company ? (
                              <>
                                <p className="text-sm font-medium">
                                  {s.placement.company}
                                </p>
                                {s.placement.packageLpa && (
                                  <p className="text-xs text-[color:var(--gold)] font-medium">
                                    ₹ {s.placement.packageLpa}{" "}
                                    {s.placement.status === "INTERNSHIP"
                                      ? "LPA*"
                                      : "LPA"}
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                {style?.label}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            No record
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {style && (
                          <span
                            className={cn(
                              "text-[10px] px-2 py-1 rounded font-medium",
                              style.color,
                            )}
                          >
                            {style.label}
                          </span>
                        )}
                        {canWrite && (
                          <button
                            onClick={() => openLogDialog(s)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-accent border rounded transition-all"
                            title="Log/edit placement"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {students.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Showing {students.length}{" "}
            {students.length === 1 ? "student" : "students"}
          </p>
        )}
      </div>

      {/* Placement dialog */}
      {activeStudent && (
        <PlacementDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          studentId={activeStudent.id}
          studentName={activeStudent.name}
          existing={activeStudent.placement}
          onSaved={loadData}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  hint,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  suffix?: string;
  hint: string;
  icon: any;
  color: "primary" | "emerald" | "gold" | "amber";
}) {
  const colorMap = {
    primary: {
      bg: "from-primary/20 via-primary/5 to-transparent",
      icon: "bg-primary/10 text-primary",
      border: "border-primary/40",
    },
    emerald: {
      bg: "from-[color:var(--emerald)]/20 via-[color:var(--emerald)]/5 to-transparent",
      icon: "bg-[color:var(--emerald)]/10 text-[color:var(--emerald)]",
      border: "border-[color:var(--emerald)]/40",
    },
    gold: {
      bg: "from-[color:var(--gold)]/20 via-[color:var(--gold)]/5 to-transparent",
      icon: "bg-[color:var(--gold)]/10 text-[color:var(--gold)]",
      border: "border-[color:var(--gold)]/40",
    },
    amber: {
      bg: "from-[color:var(--amber)]/20 via-[color:var(--amber)]/5 to-transparent",
      icon: "bg-[color:var(--amber)]/10 text-[color:var(--amber)]",
      border: "border-[color:var(--amber)]/40",
    },
  };
  const c = colorMap[color];

  return (
    <Card className={cn("border bg-gradient-to-br", c.bg, c.border)}>
      <CardContent className="p-5">
        <div className={cn("inline-flex p-2 rounded-lg mb-3", c.icon)}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-2xl font-bold tracking-tight leading-none">
          {value}
          {suffix && (
            <span className="text-sm text-muted-foreground font-normal ml-1">
              {suffix}
            </span>
          )}
        </p>
        <p className="text-sm font-medium mt-2">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
      </CardContent>
    </Card>
  );
}
