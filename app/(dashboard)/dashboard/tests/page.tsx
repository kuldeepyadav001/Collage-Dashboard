"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSelectedYear } from "@/components/providers/year-provider";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  FileText,
  Users,
  TrendingUp,
  Trash2,
  Calendar,
  ArrowUpRight,
  Check,
  BarChart3,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Test {
  id: string;
  name: string;
  date: string;
  maxMarks: number;
  year: { label: string };
  _count: { marks: number };
  avgMarks: number | null;
  highestMarks: number | null;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function TestsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { selectedYear } = useSelectedYear();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Test | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canWrite =
    session?.user.role === "SUPER_ADMIN" || session?.user.role === "WRITE_ADMIN";

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.set("year", String(selectedYear));
      const res = await fetch(`/api/tests?${params}`);
      const data = await res.json();
      setTests(data);
    } catch {
      toast.error("Failed to load tests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const grouped = useMemo(() => {
    const groups: Record<string, Test[]> = {};
    for (const test of tests) {
      const d = new Date(test.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(test);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [tests]);

  function toggleSelect(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  function compareSelected() {
    if (selected.size < 2) return;
    const ids = Array.from(selected).join(",");
    router.push(`/dashboard/tests/compare?ids=${ids}`);
  }

  async function handleDelete() {
    if (!deleteTarget || confirmName !== deleteTarget.name) return;
    setDeleting(true);
    const res = await fetch(`/api/tests/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete");
      setDeleting(false);
      return;
    }
    toast.success(`"${deleteTarget.name}" deleted`);
    setDeleteTarget(null);
    setConfirmName("");
    setDeleting(false);
    loadData();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tests</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {selectedYear
              ? `${selectedYear} batch — ${tests.length} ${tests.length === 1 ? "test" : "tests"}`
              : `All batches — ${tests.length} ${tests.length === 1 ? "test" : "tests"}`}
          </p>
        </div>
        {canWrite && (
          <Link
            href="/dashboard/tests/new"
            className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Test
          </Link>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5">
                <div className="h-4 bg-muted rounded w-2/3 mb-3" />
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tests.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="inline-flex p-3 rounded-full bg-primary/10 mb-3">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-medium">No tests yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Create a test manually or upload marks via Excel
            </p>
            {canWrite && (
              <Link
                href="/dashboard/tests/new"
                className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mt-4"
              >
                <Plus className="h-4 w-4" />
                Create First Test
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {grouped.map(([key, monthTests]) => {
            const [year, month] = key.split("-").map(Number);
            return (
              <div key={key}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {MONTH_NAMES[month]} {year}
                  </h2>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">
                    {monthTests.length} {monthTests.length === 1 ? "test" : "tests"}
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {monthTests.map((test) => (
                    <TestCard
                      key={test.id}
                      test={test}
                      isSelected={selected.has(test.id)}
                      onToggleSelect={() => toggleSelect(test.id)}
                      onDelete={() => setDeleteTarget(test)}
                      canWrite={canWrite}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky compare bar */}
      {selected.size > 0 && (
        <div className="sticky bottom-6 z-10 flex justify-center">
          <div className="flex items-center gap-3 bg-card border rounded-full shadow-lg pl-4 pr-2 py-2">
            <span className="text-sm">
              <span className="font-semibold">{selected.size}</span> selected
              {selected.size < 2 && (
                <span className="text-muted-foreground ml-1.5">
                  · select 2+ to compare
                </span>
              )}
            </span>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground px-2"
            >
              Clear
            </button>
            <Button
              onClick={compareSelected}
              disabled={selected.size < 2}
              className="rounded-full"
            >
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Compare
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation with typed name */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteTarget(null);
            setConfirmName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{deleteTarget?.name}"?</DialogTitle>
            <DialogDescription>
              This permanently deletes the test and all{" "}
              <span className="font-semibold">{deleteTarget?._count.marks} marks</span>{" "}
              recorded against it. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm">
              Type <span className="font-mono font-semibold">{deleteTarget?.name}</span>{" "}
              to confirm:
            </label>
            <Input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={deleteTarget?.name}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setConfirmName("");
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting || confirmName !== deleteTarget?.name}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:bg-destructive/50"
            >
              {deleting ? "Deleting..." : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TestCard({
  test,
  isSelected,
  onToggleSelect,
  onDelete,
  canWrite,
}: {
  test: Test;
  isSelected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  canWrite: boolean;
}) {
  const avgPct = test.avgMarks ? (test.avgMarks / test.maxMarks) * 100 : null;
  const highestPct = test.highestMarks ? (test.highestMarks / test.maxMarks) * 100 : null;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all",
        isSelected
          ? "border-primary shadow-md shadow-primary/10"
          : "hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
      )}
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <button
            onClick={onToggleSelect}
            className={cn(
              "h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
              isSelected
                ? "bg-primary border-primary"
                : "border-input hover:border-primary"
            )}
          >
            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
          </button>

          {canWrite && (
            <button
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Link href={`/dashboard/tests/${test.id}`}>
          {/* Title + date */}
          <div className="mb-4">
            <div className="flex items-baseline gap-2 mb-1">
              <h3 className="text-base font-semibold tracking-tight line-clamp-1">
                {test.name}
              </h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium shrink-0">
                {test.year.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(test.date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              <span className="mx-1">·</span>
              Max: {test.maxMarks}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 py-3 border-y">
            <Stat
              icon={Users}
              label="Took"
              value={String(test._count.marks)}
              color="text-primary"
            />
            <Stat
              icon={TrendingUp}
              label="Average"
              value={avgPct !== null ? `${avgPct.toFixed(0)}%` : "—"}
              color="text-[color:var(--emerald)]"
            />
            <Stat
              icon={Trophy}
              label="Top"
              value={highestPct !== null ? `${highestPct.toFixed(0)}%` : "—"}
              color="text-[color:var(--gold)]"
            />
          </div>

          {/* Action */}
          <div className="mt-3 pt-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">View details</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="text-center">
      <Icon className={cn("h-3.5 w-3.5 mx-auto mb-1", color)} />
      <p className="text-sm font-semibold">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
        {label}
      </p>
    </div>
  );
}