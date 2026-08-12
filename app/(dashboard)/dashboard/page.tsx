import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  GraduationCap,
  Sparkles,
  Briefcase,
  TrendingUp,
  ArrowUpRight,
  FileText,
  IndianRupee,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  const [studentCount, sectionCount, eliteCount, placementStats] = await Promise.all([
    prisma.student.count(),
    prisma.section.count(),
    prisma.eliteSection.count(),
    prisma.placement.aggregate({
      _count: { id: true },
      _avg: { packageLpa: true },
      _max: { packageLpa: true },
      where: { status: "PLACED" },
    }),
  ]);

const stats = [
  {
    label: "Total Students",
    value: studentCount,
    icon: Users,
    hint: "Across all batches",
    gradient: "from-primary/20 via-primary/5 to-transparent",
    iconBg: "bg-primary/15 text-primary",
    borderAccent: "border-primary/40",
  },
  {
    label: "Sections",
    value: sectionCount,
    icon: GraduationCap,
    hint: "Regular batches",
    gradient: "from-[color:var(--emerald)]/20 via-[color:var(--emerald)]/5 to-transparent",
    iconBg: "bg-[color:var(--emerald)]/15 text-[color:var(--emerald)]",
    borderAccent: "border-[color:var(--emerald)]/40",
  },
  {
    label: "Elite Sections",
    value: eliteCount,
    icon: Sparkles,
    hint: "Special groups",
    gradient: "from-[color:var(--gold)]/20 via-[color:var(--gold)]/5 to-transparent",
    iconBg: "bg-[color:var(--gold)]/15 text-[color:var(--gold)]",
    borderAccent: "border-[color:var(--gold)]/40",
  },
  {
    label: "Placed Students",
    value: placementStats._count.id,
    icon: Briefcase,
    hint: "This year",
    gradient: "from-[color:var(--amber)]/20 via-[color:var(--amber)]/5 to-transparent",
    iconBg: "bg-[color:var(--amber)]/15 text-[color:var(--amber)]",
    borderAccent: "border-[color:var(--amber)]/40",
  },
];

  const avgPackage = placementStats._avg.packageLpa?.toFixed(1) ?? "0";
  const maxPackage = placementStats._max.packageLpa?.toFixed(1) ?? "0";

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {session?.user.name?.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Here's what's happening across the department today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  {stats.map((stat) => {
    const Icon = stat.icon;
    return (
      <Card
        key={stat.label}
        className={`relative overflow-hidden border ${stat.borderAccent} bg-gradient-to-br ${stat.gradient} transition-all hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5`}
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
            {stat.value}
          </p>
          <p className="text-sm font-medium mt-2">{stat.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{stat.hint}</p>
        </CardContent>
      </Card>
    );
  })}
</div>

      {/* Placement highlight */}
      <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 via-[hsl(var(--gold))]/5 to-transparent">
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
                    {avgPackage} <span className="text-sm text-muted-foreground font-normal ml-1">LPA</span>
                  </p>
                </div>
                <div className="h-10 w-px bg-border" />
                <div>
                  <p className="text-xs text-muted-foreground">Highest Package</p>
                  <p className="text-2xl font-semibold tracking-tight flex items-center gap-0.5 text-[hsl(var(--gold))]">
                    <IndianRupee className="h-4 w-4" />
                    {maxPackage} <span className="text-sm text-muted-foreground font-normal ml-1">LPA</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-full bg-gradient-to-br from-primary to-[hsl(var(--gold))] shadow-lg shadow-primary/20">
              <Briefcase className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Latest updates across the portal</p>
            </div>
            <button className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-3 rounded-full bg-muted mb-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No activity yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Activity will appear here as data is added.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Common tasks</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Add Student", icon: Users, href: "/dashboard/students/new" },
              { label: "Create Test", icon: FileText, href: "/dashboard/tests/new" },
              { label: "Log Placement", icon: Briefcase, href: "/dashboard/placements/new" },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  className="flex w-full items-center justify-between rounded-lg border p-3 text-sm hover:border-primary/40 hover:bg-accent transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {action.label}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}