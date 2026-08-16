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
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { getBatchInfo } from "@/lib/year-utils";

interface Year {
  id: string;
  label: string;
}

export default function NewElitePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { selectedYear } = useSelectedYear();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [yearId, setYearId] = useState("");
  const [years, setYears] = useState<Year[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user.role === "READER") {
      router.push("/dashboard/elite");
    }
  }, [status, session, router]);

  useEffect(() => {
    fetch("/api/years")
      .then((r) => r.json())
      .then((data: Year[]) => {
        setYears(data);
        // Pre-fill year from topbar if selected
        if (selectedYear) {
          const match = data.find((y) => y.label === String(selectedYear));
          if (match) setYearId(match.id);
        }
      })
      .catch(() => toast.error("Failed to load years"));
  }, [selectedYear]);

  if (status === "loading" || session?.user.role === "READER") {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/elite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, yearId }),
    });
    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error || "Failed");
      setLoading(false);
      return;
    }

    toast.success(`"${name}" created for ${data.year.label} batch`);
    router.push(`/dashboard/elite/${data.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/dashboard/elite"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to elite sections
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          New Elite Section
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Create a special group for students of a specific batch
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[color:var(--gold)]/10 text-[color:var(--gold)]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Section Details</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add members after creation
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Batch Year *</Label>
              <Select value={yearId} onValueChange={(v) => setYearId(v || "")}>
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
              <p className="text-xs text-muted-foreground">
                Only students from this batch can be added
              </p>
            </div>

            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="Service Based Training"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                E.g., "Service Based", "Product Companies", "GATE Prep"
              </p>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                placeholder="Brief description of this group's purpose..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
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
          <Button type="submit" disabled={loading || !name.trim() || !yearId}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Section
          </Button>
        </div>
      </form>
    </div>
  );
}