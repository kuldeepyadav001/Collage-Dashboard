"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSelectedYear } from "@/components/providers/year-provider";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Sparkles,
  Users,
  ArrowUpRight,
  Trash2,
  Calendar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getBatchInfo } from "@/lib/year-utils";

interface EliteSection {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  year: { label: string };
  _count: { members: number };
}

export default function ElitePage() {
  const { data: session } = useSession();
  const { selectedYear } = useSelectedYear();
  const [sections, setSections] = useState<EliteSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<EliteSection | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canWrite =
    session?.user.role === "SUPER_ADMIN" || session?.user.role === "WRITE_ADMIN";

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.set("year", String(selectedYear));
      const res = await fetch(`/api/elite?${params}`);
      const data = await res.json();
      setSections(data);
    } catch {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/elite/${deleteTarget.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Failed to delete");
      setDeleting(false);
      return;
    }
    toast.success(`${deleteTarget.name} deleted`);
    setDeleteTarget(null);
    setDeleting(false);
    loadData();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Elite Sections</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {selectedYear
              ? `Showing ${selectedYear} batch elite groups`
              : "Special groups across all batches"}
          </p>
        </div>
        {canWrite && (
          <Link
            href="/dashboard/elite/new"
            className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Elite Section
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
                <div className="h-3 bg-muted rounded w-full mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sections.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="inline-flex p-3 rounded-full bg-[color:var(--gold)]/10 mb-3">
              <Sparkles className="h-5 w-5 text-[color:var(--gold)]" />
            </div>
            <p className="text-sm font-medium">
              {selectedYear
                ? `No elite sections for ${selectedYear} batch`
                : "No elite sections yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Elite sections let you group students from different courses and colleges within the same year for special training
            </p>
            {canWrite && (
              <Link
                href="/dashboard/elite/new"
                className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mt-4"
              >
                <Plus className="h-4 w-4" />
                Create First
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => {
            const batchInfo = getBatchInfo(parseInt(s.year.label));
            return (
              <Card
                key={s.id}
                className="group relative overflow-hidden border hover:border-[color:var(--gold)]/40 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-br from-[color:var(--gold)]/10 to-transparent rounded-bl-full" />
                <CardContent className="p-5 relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-[color:var(--gold)]/10 text-[color:var(--gold)]">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    {canWrite && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setDeleteTarget(s);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <Link href={`/dashboard/elite/${s.id}`}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <h3 className="text-base font-semibold tracking-tight line-clamp-1">
                        {s.name}
                      </h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium shrink-0">
                        {s.year.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-2">
                      {batchInfo.label}
                    </p>

                    {s.description ? (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3 min-h-[32px]">
                        {s.description}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic mb-3 min-h-[32px]">
                        No description
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {s._count.members}{" "}
                        {s._count.members === 1 ? "member" : "members"}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(s.createdAt).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">View details</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-[color:var(--gold)] transition-colors" />
                    </div>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{deleteTarget?.name}"?</DialogTitle>
            <DialogDescription>
              This permanently removes the elite section, its members,
              tests, and attendance records. Student profiles are not affected.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}