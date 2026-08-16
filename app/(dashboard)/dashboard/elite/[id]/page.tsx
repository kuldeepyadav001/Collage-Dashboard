"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Sparkles,
  UserPlus,
  Users,
  Search,
  X,
  Pencil,
  Calendar,
  GraduationCap,
  Loader2,
  Upload,
} from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";
import { ImportMembersDialog } from "@/components/elite/import-members-dialog";

interface Member {
  id: string;
  joinedAt: string;
  student: {
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
  };
}

interface EliteSection {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  year: { id: string; label: string };
  members: Member[];
  _count: { members: number };
}

export default function EliteDetailPage() {
  const { data: session } = useSession();
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [elite, setElite] = useState<EliteSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const canWrite =
    session?.user.role === "SUPER_ADMIN" ||
    session?.user.role === "WRITE_ADMIN";

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/elite/${params.id}`);
      if (!res.ok) {
        router.push("/dashboard/elite");
        return;
      }
      const data = await res.json();
      setElite(data);
      setEditName(data.name);
      setEditDesc(data.description || "");
    } catch {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function removeMember(studentId: string, name: string) {
    if (!confirm(`Remove ${name} from this elite section?`)) return;
    const res = await fetch(`/api/elite/${params.id}/members/${studentId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Failed to remove");
      return;
    }
    toast.success(`${name} removed`);
    loadData();
  }

  async function saveEdits() {
    setSaving(true);
    const res = await fetch(`/api/elite/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, description: editDesc }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed");
      setSaving(false);
      return;
    }
    toast.success("Updated");
    setEditOpen(false);
    setSaving(false);
    loadData();
  }

  const filteredMembers =
    elite?.members.filter((m) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        m.student.name.toLowerCase().includes(q) ||
        m.student.rollNumber.toLowerCase().includes(q) ||
        m.student.email.toLowerCase().includes(q) ||
        m.student.college.name.toLowerCase().includes(q)
      );
    }) || [];

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!elite) return null;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/elite"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to elite sections
      </Link>

      {/* Header card */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-[color:var(--gold)]/20 via-primary/10 to-transparent" />
        <CardContent className="p-6 pt-0">
          <div className="flex items-start gap-4 -mt-10">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[color:var(--gold)] to-primary flex items-center justify-center shadow-lg shadow-[color:var(--gold)]/20 border-4 border-card">
              <Sparkles className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="flex-1 pt-12">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {elite.name}
                  </h1>
                  {elite.description && (
                    <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                      {elite.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                      {elite.year.label} Batch
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {elite._count.members}{" "}
                      {elite._count.members === 1 ? "member" : "members"}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      Created{" "}
                      {new Date(elite.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <ExportButton
                    url={`/api/elite/${elite.id}/export`}
                    label="Export"
                  />
                  {canWrite && (
                    <>
                      <button
                        onClick={() => setEditOpen(true)}
                        className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-md border hover:bg-accent transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => setImportOpen(true)}
                        className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-md border hover:bg-accent transition-colors"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Import
                      </button>
                      <Link
                        href={`/dashboard/elite/${elite.id}/add-members`}
                        className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Add Members
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold">Members</h2>
          {elite.members.length > 0 && (
            <div className="relative max-w-xs flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            {elite.members.length === 0 ? (
              <div className="py-16 text-center">
                <div className="inline-flex p-3 rounded-full bg-muted mb-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No members yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {canWrite
                    ? "Click 'Add Members' or 'Import' to add students"
                    : "Members haven't been added yet"}
                </p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm">No members match "{search}"</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredMembers.map((m) => {
                  const initials = m.student.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 p-3 hover:bg-accent transition-colors group"
                    >
                      <Link
                        href={`/dashboard/students/${m.student.id}`}
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
                              {m.student.name}
                            </p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                              {m.student.college.name}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {m.student.rollNumber} · {m.student.email}
                          </p>
                        </div>
                        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
                          <GraduationCap className="h-3 w-3" />
                          <span>
                            {m.student.section.course.name} · Sec{" "}
                            {m.student.section.name}
                          </span>
                        </div>
                      </Link>
                      {canWrite && (
                        <button
                          onClick={() =>
                            removeMember(m.student.id, m.student.name)
                          }
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Elite Section</DialogTitle>
            <DialogDescription>
              Update the name and description
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={saveEdits} disabled={saving || !editName.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import members dialog */}
      <ImportMembersDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        eliteId={elite.id}
        eliteName={elite.name}
        onImported={loadData}
      />
    </div>
  );
}