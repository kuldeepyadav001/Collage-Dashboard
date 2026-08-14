"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, BarChart3, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface TestSummary {
  id: string;
  name: string;
  date: string;
  maxMarks: number;
}

interface StudentComparison {
  student: {
    id: string;
    name: string;
    rollNumber: string;
    college: { name: string };
    section: { name: string; course: { name: string } };
  };
  testsAttempted: number;
  totalTests: number;
  avgPercentage: number;
  marksPerTest: Record<string, { marks: number; percentage: number }>;
}

export default function ComparePage() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get("ids") || "";
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [students, setStudents] = useState<StudentComparison[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const testIds = idsParam.split(",").filter(Boolean);
      if (testIds.length < 2) {
        toast.error("Select at least 2 tests");
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/tests/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testIds }),
        });
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Failed");
          return;
        }
        const data = await res.json();
        setTests(data.tests);
        setStudents(data.students);
      } catch {
        toast.error("Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [idsParam]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/tests"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to tests
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Test Comparison</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Combined performance across {tests.length} tests
            </p>
          </div>
        </div>
      </div>

      {/* Test chips */}
      <div className="flex gap-2 flex-wrap">
        {tests.map((t) => (
          <div
            key={t.id}
            className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs"
          >
            <span className="font-medium">{t.name}</span>
            <span className="text-muted-foreground">
              · {new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
            <span className="text-muted-foreground">· Max {t.maxMarks}</span>
          </div>
        ))}
      </div>

      {/* Combined table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
          ) : students.length === 0 ? (
            <div className="py-12 text-center text-sm">No student data across these tests</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 w-12">Rank</th>
                    <th className="text-left p-3">Student</th>
                    {tests.map((t) => (
                      <th key={t.id} className="text-center p-3 min-w-[100px]">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          {t.name}
                        </div>
                      </th>
                    ))}
                    <th className="text-center p-3 min-w-[100px] bg-primary/5">
                      <div className="text-[10px] uppercase tracking-wider text-primary font-semibold">
                        Average
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map((s, idx) => {
                    const rank = idx + 1;
                    const initials = s.student.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);
                    return (
                      <tr key={s.student.id} className="hover:bg-accent transition-colors">
                        <td className="p-3">
                          {rank <= 3 ? (
                            <span
                              className={cn(
                                "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                                rank === 1 && "bg-[color:var(--gold)]/20 text-[color:var(--gold)]",
                                rank === 2 && "bg-slate-400/20 text-slate-500",
                                rank === 3 && "bg-orange-500/20 text-orange-600"
                              )}
                            >
                              {rank}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">#{rank}</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Link
                            href={`/dashboard/students/${s.student.id}`}
                            className="flex items-center gap-2 min-w-0"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{s.student.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {s.student.rollNumber} · {s.student.college.name}
                              </p>
                            </div>
                          </Link>
                        </td>
                        {tests.map((t) => {
                          const m = s.marksPerTest[t.id];
                          return (
                            <td key={t.id} className="p-3 text-center">
                              {m ? (
                                <div>
                                  <p className="font-medium">{m.marks}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {m.percentage.toFixed(0)}%
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="p-3 text-center bg-primary/5">
                          <div>
                            <p className="font-semibold text-primary">
                              {s.avgPercentage.toFixed(1)}%
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {s.testsAttempted}/{s.totalTests} tests
                            </p>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}