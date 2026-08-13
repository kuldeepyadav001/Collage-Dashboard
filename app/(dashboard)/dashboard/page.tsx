"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSelectedYear } from "@/components/providers/year-provider";
import { useSelectedCollege } from "@/components/providers/college-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  Sparkles,
  Briefcase,
  TrendingUp,
  ArrowUpRight,
  FileText,
  IndianRupee,
  Building2,
} from "lucide-react";

interface Stats {
  studentCount: number;
  sectionCount: number;
  eliteCount: number;
  placedCount: number;
  avgPackage: number | null;
  maxPackage: number | null;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { selectedYear } = useSelectedYear();
  const { selectedCollegeId } = useSelectedCollege();
  const [stats, setStats] = useState<Stats | null>(null);
  const [collegeName, setCollegeName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedYear) params.set("year", String(selectedYear));
    if (selectedCollegeId) params.set("collegeId", selectedCollegeId);

    fetch(`/api/stats?${params}`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [selectedYear, selectedCollegeId]);

  useEffect(() => {
    if (!selectedCollegeId) {
      setCollegeName(null);
      return;
    }
    fetch("/api/colleges")
      .then((r) => r.json())
      .then((colleges: { id: string; name: string }[]) => {
        const c = colleges.find((c) => c.id === selectedCollegeId);
        setCollegeName(c?.name || null);
      });
  }, [selectedCollegeId]);

  const filterHint = [
    selectedYear && `${selectedYear} batch`,
    collegeName,
  ]
    .filter(Boolean)
    .join(" · ");

  const statCards = [
    {
      label: "Total Students",
      value: stats?.studentCount ?? 0,
      icon: Users,
      accent: "from-primary/20 via-primary/5 to-transparent",
      iconBg: "bg-primary/15 text-primary",
      borderAccent: "border-primary/40",
      hint: "Enrolled",
    },
    {
      label: "Sections",
      value: stats?.sectionCount ?? 0,
      icon: GraduationCap,
      accent: "from-[color:var(--emerald)]/20 via-[color:var(--emerald)]/5 to-transparent",
      iconBg: "bg-[color:var(--emerald)]/15 text-[color:var(--emerald)]",
      borderAccent: "border-[color:var(--emerald)]/40",
      hint: "With students",
    },
    {
      label: "Elite Sections",
      value: stats?.eliteCount ?? 0,
      icon: Sparkles,
      accent: "from-[color:var(--gold)]/20 via-[color:var(--gold)]/5 to-transparent",
      iconBg: "bg-[color:var(--gold)]/15 text-[color:var(--gold)]",
      borderAccent: "border-[color:var(--gold)]/40",
      hint: "Cross-course",
    },
    {
      label: "Placed Students",
      value: stats?.placedCount ?? 0,
      icon: Briefcase,
      accent: "from-[color:var(--amber)]/20 via-[color:var(--amber)]/5 to-transparent",
      iconBg: "bg-[color:var(--amber)]/15 text-[color:var(--amber)]",
      borderAccent: "border-[color:var(--amber)]/40",
      hint: filterHint || "All batches",
    },
  ];

  const avgPackage = stats?.avgPackage?.toFixed(1) ?? "0";
  const maxPackage = stats?.maxPackage?.toFixed(1) ?? "0";

return (
  <div className="space-y-8">
    {/* Welcome */}
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome back, {session?.user.name?.split(" ")[0]}
      </h1>
      <p className="text-sm text-muted-foreground mt-1.5">
        {filterHint
          ? `Showing data for ${filterHint}`
          : "Showing data across all batches and colleges"}
      </p>
    </div>

    {/* Stats grid */}
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.label}
            className={`relative overflow-hidden border ${stat.borderAccent} bg-gradient-to-br ${stat.accent} transition-all hover:shadow-lg hover:-translate-y-0.5`}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Live
                </span>
              </div>
              <p className="text-3xl font-bold tracking-tight leading-none">
                {loading ? "—" : stat.value}
              </p>
              <p className="text-sm font-medium mt-2">{stat.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.hint}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>

    {/* Placement + Quick Actions */}
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Placement highlights — spans 2 columns */}
      <Card className="lg:col-span-2 relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 via-[color:var(--gold)]/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-primary uppercase tracking-wider">
                Placement Highlights
              </p>
              <div className="flex items-baseline gap-6 mt-3">
                <div>
                  <p className="text-xs text-muted-foreground">Average Package</p>
                  <p className="text-2xl font-semibold tracking-tight flex items-center gap-0.5">
                    <IndianRupee className="h-4 w-4" />
                    {loading ? "—" : avgPackage}
                    <span className="text-sm text-muted-foreground font-normal ml-1">LPA</span>
                  </p>
                </div>
                <div className="h-10 w-px bg-border" />
                <div>
                  <p className="text-xs text-muted-foreground">Highest Package</p>
                  <p className="text-2xl font-semibold tracking-tight flex items-center gap-0.5 text-[color:var(--gold)]">
                    <IndianRupee className="h-4 w-4" />
                    {loading ? "—" : maxPackage}
                    <span className="text-sm text-muted-foreground font-normal ml-1">LPA</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-full bg-gradient-to-br from-primary to-[color:var(--gold)] shadow-lg shadow-primary/20">
              <Briefcase className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Common tasks</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { label: "Add Student", icon: Users, href: "/dashboard/students/new" },
            { label: "Manage Structure", icon: GraduationCap, href: "/dashboard/manage" },
            { label: "View Students", icon: Users, href: "/dashboard/students" },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className="flex w-full items-center justify-between rounded-lg border p-3 text-sm hover:border-primary/40 hover:bg-accent transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {action.label}
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  </div>
);
}