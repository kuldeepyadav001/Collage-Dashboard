"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Briefcase,
  GraduationCap,
  Ban,
  HelpCircle,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Placement {
  id?: string;
  status: string;
  company?: string | null;
  role?: string | null;
  packageLpa?: number | null;
  placementDate?: string | null;
  type?: string | null;
  notes?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  existing?: Placement | null;
  onSaved: () => void;
}

const STATUS_OPTIONS = [
  {
    value: "PLACED",
    label: "Placed",
    icon: Briefcase,
    color: "text-[color:var(--emerald)]",
    desc: "Has a full-time job offer",
  },
  {
    value: "INTERNSHIP",
    label: "Internship",
    icon: Rocket,
    color: "text-blue-600 dark:text-blue-400",
    desc: "Currently interning at a company",
  },
  {
    value: "HIGHER_STUDIES",
    label: "Higher Studies",
    icon: GraduationCap,
    color: "text-[color:var(--gold)]",
    desc: "Pursuing masters or further studies",
  },
  {
    value: "NOT_PLACED",
    label: "Not Placed",
    icon: HelpCircle,
    color: "text-muted-foreground",
    desc: "Still looking for opportunities",
  },
  {
    value: "OPTED_OUT",
    label: "Opted Out",
    icon: Ban,
    color: "text-destructive",
    desc: "Chose not to appear for placements",
  },
];

const TYPE_OPTIONS = [
  { value: "ON_CAMPUS", label: "On Campus" },
  { value: "OFF_CAMPUS", label: "Off Campus" },
  { value: "POOL_CAMPUS", label: "Pool Campus" },
];

export function PlacementDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  existing,
  onSaved,
}: Props) {
  const [status, setStatus] = useState<string>("NOT_PLACED");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [packageLpa, setPackageLpa] = useState("");
  const [placementDate, setPlacementDate] = useState("");
  const [type, setType] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStatus(existing?.status || "NOT_PLACED");
      setCompany(existing?.company || "");
      setRole(existing?.role || "");
      setPackageLpa(existing?.packageLpa ? String(existing.packageLpa) : "");
      setPlacementDate(
        existing?.placementDate
          ? new Date(existing.placementDate).toISOString().split("T")[0]
          : "",
      );
      setType(existing?.type || "");
      setNotes(existing?.notes || "");
    }
  }, [open, existing]);

  async function handleSave() {
    if ((status === "PLACED" || status === "INTERNSHIP") && !company.trim()) {
      toast.error("Company is required for placed/internship status");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/placements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        status,
        company: company || null,
        role: role || null,
        packageLpa: packageLpa || null,
        placementDate: placementDate || null,
        type: type || null,
        notes: notes || null,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error || "Failed");
      setSaving(false);
      return;
    }

    toast.success(`Placement updated for ${studentName}`);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  }

  const showCompanyFields = status === "PLACED" || status === "INTERNSHIP";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Placement</DialogTitle>
          <DialogDescription>
            Update placement status for{" "}
            <span className="font-medium text-foreground">{studentName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status picker as cards */}
          <div className="space-y-2">
            <Label>Status *</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={cn(
                      "flex items-start gap-2 p-3 rounded-lg border text-left transition-all",
                      active
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/40 hover:bg-accent",
                    )}
                  >
                    <Icon
                      className={cn("h-4 w-4 mt-0.5 shrink-0", opt.color)}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">
                        {opt.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Placed-specific fields */}
          {showCompanyFields && (
            <>
              <div className="space-y-2">
                <Label>Company *</Label>
                <Input
                  placeholder={
                    status === "INTERNSHIP"
                      ? "Razorpay, Zomato..."
                      : "TCS, Infosys, Google..."
                  }
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input
                    placeholder="SDE, Analyst..."
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {status === "INTERNSHIP"
                      ? "Stipend (LPA equivalent)"
                      : "Package (LPA)"}
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder={status === "INTERNSHIP" ? "3" : "12.5"}
                    value={packageLpa}
                    onChange={(e) => setPackageLpa(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Placement Date</Label>
                  <Input
                    type="date"
                    value={placementDate}
                    onChange={(e) => setPlacementDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type">
                        {TYPE_OPTIONS.find((o) => o.value === type)?.label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* Notes (always available) */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <textarea
              placeholder="Any additional information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Placement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
