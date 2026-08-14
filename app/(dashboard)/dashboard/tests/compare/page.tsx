"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, BarChart3, Trophy, ArrowDown } from "lucide-react";
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
  avgTaken: number;
  avgAll: number;
  marksPerTest: Record<string, { marks: number; percentage: number }>;
}

export default function ComparePage() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get("ids") || "";
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [students, setStudents] = useState<StudentComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"taken" | "all">("taken");

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

  const sortedStudents = [...students].sort((a, b) => {
    return sortBy === "taken" ? b.avgTaken - a.avgTaken : b.avgAll - a.avgAll;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
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
            <h1 className="text-2xl font-semibold tracking-tight">
              Test Comparison
            </h1>
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
              ·{" "}
              {new Date(t.date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </span>
            <span className="text-muted-foreground">· Max {t.maxMarks}</span>
          </div>
        ))}
      </div>

      {/* Explanation card */}
      <Card>
        <CardContent className="p-4 flex items-start gap-3">
          <div className="p-1.5 rounded bg-primary/10 text-primary shrink-0">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Avg (Taken)</span> =
              average of only the tests a student attempted. Fair for absent
              students.
            </p>
            <p className="mt-1">
              <span className="font-medium text-foreground">Avg (All)</span> =
              average across all selected tests (missed = 0). Shows overall
              consistency.
            </p>
            <p className="mt-1 text-[10px]">
              Click a column header to sort by it.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Combined table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : sortedStudents.length === 0 ? (
            <div className="py-12 text-center text-sm">
              No student data across these tests
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 w-12">Rank</th>
                    <th className="text-left p-3">Student</th>
                    {tests.map((t) => (
                      <th
                        key={t.id}
                        className="text-center p-3 min-w-[100px]"
                      >
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          {t.name}
                        </div>
                        <div className="text-[9px] text-muted-foreground normal-case font-normal mt-0.5">
                          Max {t.maxMarks}
                        </div>
                      </th>
                    ))}
                    <th
                      className={cn(
                        "text-center p-3 min-w-[110px] cursor-pointer hover:bg-muted transition-colors select-none",
                        sortBy === "taken" && "bg-primary/5"
                      )}
                      onClick={() => setSortBy("taken")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <div
                          className={cn(
                            "text-[10px] uppercase tracking-wider font-semibold",
                            sortBy === "taken"
                              ? "text-primary"
                              : "text-muted-foreground"
                          )}
                        >
                          Avg (Taken)
                        </div>
                        {sortBy === "taken" && (
                          <ArrowDown className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      <div className="text-[9px] text-muted-foreground normal-case font-normal mt-0.5">
                        of attempted tests
                      </div>
                    </th>
                    <th
                      className={cn(
                        "text-center p-3 min-w-[110px] cursor-pointer hover:bg-muted transition-colors select-none",
                        sortBy === "all" && "bg-[color:var(--gold)]/5"
                      )}
                      onClick={() => setSortBy("all")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <div
                          className={cn(
                            "text-[10px] uppercase tracking-wider font-semibold",
                            sortBy === "all"
                              ? "text-[color:var(--gold)]"
                              : "text-muted-foreground"
                          )}
                        >
                          Avg (All)
                        </div>
                        {sortBy === "all" && (
                          <ArrowDown className="h-3 w-3 text-[color:var(--gold)]" />
                        )}
                      </div>
                      <div className="text-[9px] text-muted-foreground normal-case font-normal mt-0.5">
                        missed counted as 0
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedStudents.map((s, idx) => {
                    const rank = idx + 1;
                    const initials = s.student.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);
                    return (
                      <tr
                        key={s.student.id}
                        className="hover:bg-accent transition-colors"
                      >
                        {/* Rank */}
                        <td className="p-3">
                          {rank <= 3 ? (
                            <span
                              className={cn(
                                "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                                rank === 1 &&
                                  "bg-[color:var(--gold)]/20 text-[color:var(--gold)]",
                                rank === 2 &&
                                  "bg-slate-400/20 text-slate-500",
                                rank === 3 &&
                                  "bg-orange-500/20 text-orange-600"
                              )}
                            >
                              {rank}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              #{rank}
                            </span>
                          )}
                        </td>

                        {/* Student info */}
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
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-medium truncate">
                                  {s.student.name}
                                </p>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                                  {s.student.college.name}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {s.student.rollNumber}
                              </p>
                            </div>
                          </Link>
                        </td>

                        {/* Per-test marks */}
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
                                <div>
                                  <p className="font-medium text-muted-foreground">
                                    —
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    missed
                                  </p>
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Avg Taken */}
                        <td
                          className={cn(
                            "p-3 text-center transition-colors",
                            sortBy === "taken" && "bg-primary/5"
                          )}
                        >
                          <p className="font-semibold text-primary">
                            {s.avgTaken.toFixed(1)}%
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {s.testsAttempted}/{s.totalTests} tests
                          </p>
                        </td>

                        {/* Avg All */}
                        <td
                          className={cn(
                            "p-3 text-center transition-colors",
                            sortBy === "all" && "bg-[color:var(--gold)]/5"
                          )}
                        >
                          <p
                            className={cn(
                              "font-semibold",
                              s.testsAttempted === s.totalTests
                                ? "text-[color:var(--gold)]"
                                : "text-muted-foreground"
                            )}
                          >
                            {s.avgAll.toFixed(1)}%
                          </p>
                          {s.testsAttempted < s.totalTests && (
                            <p className="text-[10px] text-muted-foreground">
                              missed {s.totalTests - s.testsAttempted}
                            </p>
                          )}
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

      {/* Summary stats */}
      {sortedStudents.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {sortedStudents.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Students appeared in at least 1 test
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[color:var(--emerald)]">
                {sortedStudents.filter((s) => s.testsAttempted === s.totalTests).length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Appeared in all {tests.length} tests
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[color:var(--gold)]">
                {(
                  sortedStudents.reduce((a, s) => a + s.avgTaken, 0) /
                  sortedStudents.length
                ).toFixed(1)}
                %
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Overall average (of attempted)
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}