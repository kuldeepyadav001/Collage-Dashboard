"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSelectedYear } from "@/components/providers/year-provider";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, FileText } from "lucide-react";
import { getBatchInfo } from "@/lib/year-utils";

interface Year {
  id: string;
  label: string;
}

export default function NewTestPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { selectedYear } = useSelectedYear();

  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [maxMarks, setMaxMarks] = useState("100");
  const [yearId, setYearId] = useState("");
  const [years, setYears] = useState<Year[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user.role === "READER") {
      router.push("/dashboard/tests");
    }
  }, [status, session, router]);

  useEffect(() => {
    fetch("/api/years")
      .then((r) => r.json())
      .then((data: Year[]) => {
        setYears(data);
        if (selectedYear) {
          const match = data.find((y) => y.label === String(selectedYear));
          if (match) setYearId(match.id);
        }
      })
      .catch(() => toast.error("Failed to load years"));
  }, [selectedYear]);

  if (status === "loading" || session?.user.role === "READER") return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, date, maxMarks, yearId }),
    });
    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error || "Failed");
      setLoading(false);
      return;
    }

    toast.success(`Test "${name}" created`);
    router.push(`/dashboard/tests/${data.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/dashboard/tests"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to tests
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Create Test</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Set up a new test — enter marks after creation
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Test Details</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You can edit these later
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Batch Year *</Label>
              <Select value={yearId} onValueChange={(v) => setYearId(v|| "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select batch year">
                    {(() => {
                      const y = years.find((y) => y.id === yearId);
                      if (!y) return null;
                      const info = getBatchInfo(parseInt(y.label));
                      return `${y.label} · ${info.label}`;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {years.length === 0 ? (
                    <div className="p-4 text-xs text-muted-foreground text-center">
                      No years yet. Add from Manage first.
                    </div>
                  ) : (
                    years.map((y) => {
                      const info = getBatchInfo(parseInt(y.label));
                      return (
                        <SelectItem key={y.id} value={y.id}>
                          {y.label} · {info.label}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Test Name *</Label>
              <Input
                placeholder="HackerRank Assessment 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Descriptive name — same name allowed for multiple tests
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Max Marks *</Label>
                <Input
                  type="number"
                  min="1"
                  step="0.5"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !name.trim() || !yearId || !date || !maxMarks}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Test
          </Button>
        </div>
      </form>
    </div>
  );
}