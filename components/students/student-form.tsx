"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface Section {
  id: string;
  name: string;
  course: {
    name: string;
    year: { label: string };
  };
}

interface StudentFormProps {
  mode: "create" | "edit";
  initialData?: {
    id?: string;
    name: string;
    rollNumber: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    photoUrl?: string | null;
    sectionId: string;
    collegeId: string;
  };
}

export function StudentForm({ mode, initialData }: StudentFormProps) {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [colleges, setColleges] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: initialData?.name || "",
    rollNumber: initialData?.rollNumber || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    address: initialData?.address || "",
    photoUrl: initialData?.photoUrl || "",
    sectionId: initialData?.sectionId || "",
    collegeId: initialData?.collegeId || "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/sections").then((r) => r.json()),
      fetch("/api/colleges").then((r) => r.json()),
    ])
      .then(([s, c]) => {
        setSections(s);
        setColleges(c);
      })
      .catch(() => toast.error("Failed to load data"));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const url =
      mode === "create" ? "/api/students" : `/api/students/${initialData?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Something went wrong");
        return;
      }

      toast.success(mode === "create" ? "Student added" : "Student updated");
      router.push(`/dashboard/students/${data.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Information</CardTitle>
          <p className="text-xs text-muted-foreground">
            Required fields marked with *
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ram Kumar"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Roll Number *</Label>
              <Input
                value={form.rollNumber}
                onChange={(e) =>
                  setForm({ ...form, rollNumber: e.target.value })
                }
                placeholder="21BTCSE001"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ram@college.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Section *</Label>
            <Select
              value={form.sectionId}
              onValueChange={(v) => setForm({ ...form, sectionId: v || "" })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a section">
                  {(() => {
                    const selected = sections.find(
                      (s) => s.id === form.sectionId,
                    );
                    if (!selected) return null;
                    return `${selected.course.year.label} · ${selected.course.name} · Section ${selected.name}`;
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-72 w-[--radix-select-trigger-width] min-w-[320px]">
                {sections.length === 0 ? (
                  <div className="p-4 text-xs text-muted-foreground text-center">
                    No sections yet. Add one from Manage first.
                  </div>
                ) : (
                  sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="font-medium">{s.course.year.label}</span>
                      <span className="text-muted-foreground mx-1.5">·</span>
                      <span>{s.course.name}</span>
                      <span className="text-muted-foreground mx-1.5">·</span>
                      <span>Section {s.name}</span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>College *</Label>
            <Select
              value={form.collegeId}
              onValueChange={(v) => setForm({ ...form, collegeId: v || "" })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select college">
                  {colleges.find((c) => c.id === form.collegeId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {colleges.length === 0 ? (
                  <div className="p-4 text-xs text-muted-foreground text-center">
                    No colleges yet. Add one from Manage first.
                  </div>
                ) : (
                  colleges.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Street, City, State"
            />
          </div>
          <div className="space-y-2">
            <Label>Photo URL</Label>
            <Input
              value={form.photoUrl}
              onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
              placeholder="https://..."
            />
            <p className="text-xs text-muted-foreground">
              Photo upload coming in future update
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !form.sectionId || !form.collegeId}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {mode === "create" ? "Add Student" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
