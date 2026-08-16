"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Users,
  FileText,
  Briefcase,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ImportType = "students" | "test-marks" | "placements" | null;

interface Year {
  id: string;
  label: string;
}

interface College {
  id: string;
  name: string;
}

interface Section {
  id: string;
  name: string;
  course: { name: string; year: { label: string } };
}

export default function ImportPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [importType, setImportType] = useState<ImportType>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Options for defaults
  const [years, setYears] = useState<Year[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  // Import-specific options
  const [yearId, setYearId] = useState("");
  const [defaultCollegeId, setDefaultCollegeId] = useState("");
  const [defaultSectionId, setDefaultSectionId] = useState("");
  const [addUnmatched, setAddUnmatched] = useState(true);

  // Test-marks specific: per-column config
  const [testsConfig, setTestsConfig] = useState<
    { header: string; date: string; maxMarks: number }[]
  >([]);

  useEffect(() => {
    if (status === "authenticated" && session?.user.role === "READER") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    Promise.all([
      fetch("/api/years").then((r) => r.json()),
      fetch("/api/colleges").then((r) => r.json()),
      fetch("/api/sections").then((r) => r.json()),
    ])
      .then(([y, c, s]) => {
        setYears(y);
        setColleges(c);
        setSections(s);
      })
      .catch(() => toast.error("Failed to load options"));
  }, []);

  if (status === "loading" || session?.user.role === "READER") return null;

  function reset() {
    setImportType(null);
    setFile(null);
    setPreview(null);
    setResult(null);
    setYearId("");
    setDefaultCollegeId("");
    setDefaultSectionId("");
    setTestsConfig([]);
  }

  async function handleUpload() {
    if (!file || !importType) return;
    setLoading(true);
    setPreview(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", "preview");

    if (importType === "students") {
      if (defaultCollegeId) formData.append("defaultCollegeId", defaultCollegeId);
      if (defaultSectionId) formData.append("defaultSectionId", defaultSectionId);
    }

    try {
      const url = `/api/import/${importType}`;
      const res = await fetch(url, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Preview failed");
        return;
      }
      setPreview(data);

      // For test-marks, pre-fill test configs from detected columns
      if (importType === "test-marks" && data.testColumns) {
        const today = new Date().toISOString().split("T")[0];
        setTestsConfig(
          data.testColumns.map((h: string) => ({
            header: h,
            date: today,
            maxMarks: 100,
          }))
        );
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (!file || !importType) return;
    setCommitting(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", "commit");

    if (importType === "students") {
      if (defaultCollegeId) formData.append("defaultCollegeId", defaultCollegeId);
      if (defaultSectionId) formData.append("defaultSectionId", defaultSectionId);
      formData.append("addUnmatched", String(addUnmatched));
    }

    if (importType === "test-marks") {
      if (!yearId) {
        toast.error("Please select a year");
        setCommitting(false);
        return;
      }
      formData.append("yearId", yearId);
      formData.append("testsConfig", JSON.stringify(testsConfig));
    }

    try {
      const url = `/api/import/${importType}`;
      const res = await fetch(url, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Import failed");
        return;
      }
      setResult(data);
      toast.success("Import complete");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCommitting(false);
    }
  }

  // Step 1 — Pick import type
  if (!importType) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Import Data</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Bulk upload students, test marks, or placement records from Excel
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <ImportTypeCard
            type="students"
            title="Students"
            description="Add or update student records in bulk"
            icon={Users}
            color="primary"
            onClick={() => setImportType("students")}
          />
          <ImportTypeCard
            type="test-marks"
            title="Test Marks"
            description="Create tests and upload marks together"
            icon={FileText}
            color="emerald"
            onClick={() => setImportType("test-marks")}
          />
          <ImportTypeCard
            type="placements"
            title="Placements"
            description="Log placement records for many students at once"
            icon={Briefcase}
            color="gold"
            onClick={() => setImportType("placements")}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                1
              </div>
              <p>Download the template to see the expected format</p>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                2
              </div>
              <p>Fill in your data and upload the Excel file</p>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                3
              </div>
              <p>Preview shows what will be added/updated/skipped</p>
            </div>
            <div className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                4
              </div>
              <p>Confirm to commit — everything happens in one go</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Result screen
  if (result) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <button
            onClick={reset}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <RefreshCw className="h-3 w-3" />
            New import
          </button>
          <h1 className="text-2xl font-semibold tracking-tight">
            Import Complete
          </h1>
        </div>

        <Card className="border-[color:var(--emerald)]/40 bg-[color:var(--emerald)]/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-[color:var(--emerald)]/10 text-[color:var(--emerald)]">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Success</p>
                <p className="text-xs text-muted-foreground">
                  Your data has been imported
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4 pt-4 border-t">
              {result.created !== undefined && (
                <StatBlock label="Created" value={result.created} color="emerald" />
              )}
              {result.updated !== undefined && (
                <StatBlock label="Updated" value={result.updated} color="primary" />
              )}
              {result.testsCreated !== undefined && (
                <StatBlock
                  label="Tests Created"
                  value={result.testsCreated}
                  color="gold"
                />
              )}
              {result.marksCreated !== undefined && (
                <StatBlock
                  label="Marks Recorded"
                  value={result.marksCreated}
                  color="emerald"
                />
              )}
              {result.skipped !== undefined && (
                <StatBlock label="Skipped" value={result.skipped} color="amber" />
              )}
              {result.failures && result.failures.length > 0 && (
                <StatBlock
                  label="Failed"
                  value={result.failures.length}
                  color="destructive"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {result.failures && result.failures.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Failed Rows ({result.failures.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-72 overflow-y-auto">
                {result.failures.map((f: any, i: number) => (
                  <div key={i} className="p-3 text-xs">
                    <span className="font-mono text-muted-foreground">
                      Row {f.row}
                    </span>
                    {f.test && (
                      <span className="text-muted-foreground"> · {f.test}</span>
                    )}
                    <span className="text-destructive ml-2">{f.reason}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2">
          <Button onClick={reset}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Import More
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-semibold tracking-tight">
          Import{" "}
          {importType === "students"
            ? "Students"
            : importType === "test-marks"
              ? "Test Marks"
              : "Placements"}
        </h1>
      </div>

      {/* Template download */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Need the template?</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Download to see expected columns and format
            </p>
          </div>
          <a
            href={`/api/import/templates/${importType}`}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-md border hover:bg-accent transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Template
          </a>
        </CardContent>
      </Card>

      {/* Defaults for students */}
      {importType === "students" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Defaults (Optional)</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Used when Excel doesn't specify these values
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default College</Label>
              <Select value={defaultCollegeId} onValueChange={setDefaultCollegeId}>
                <SelectTrigger>
                  <SelectValue placeholder="None">
                    {colleges.find((c) => c.id === defaultCollegeId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {colleges.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default Section</Label>
              <Select value={defaultSectionId} onValueChange={setDefaultSectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="None">
                    {(() => {
                      const s = sections.find((s) => s.id === defaultSectionId);
                      if (!s) return null;
                      return `${s.course.year.label} · ${s.course.name} · ${s.name}`;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.course.year.label} · {s.course.name} · {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Year for test marks */}
      {importType === "test-marks" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test Year *</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              All tests in this file will belong to this year
            </p>
          </CardHeader>
          <CardContent>
            <Select value={yearId} onValueChange={setYearId}>
              <SelectTrigger>
                <SelectValue placeholder="Select year">
                  {years.find((y) => y.id === yearId)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* File upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setPreview(null);
            }}
          />
          {file && (
            <p className="text-xs text-muted-foreground">
              Selected: <span className="font-mono">{file.name}</span>
            </p>
          )}
          <Button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1.5" />
                Preview Import
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview results */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Total rows: {preview.totalRows}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Common stats */}
            <div className="grid gap-3 md:grid-cols-3">
              {preview.matched !== undefined && (
                <PreviewStat label="Matched" value={preview.matched} color="emerald" />
              )}
              {preview.unmatched !== undefined && (
                <PreviewStat label="Unmatched" value={preview.unmatched} color="amber" />
              )}
              {preview.errors !== undefined && (
                <PreviewStat label="Errors" value={preview.errors} color="destructive" />
              )}
              {preview.toImport !== undefined && (
                <PreviewStat label="Ready to Import" value={preview.toImport} color="emerald" />
              )}
            </div>

            {/* Test columns detected */}
            {importType === "test-marks" && preview.testColumns && (
              <div className="space-y-3">
                <div>
                  <Label>Detected Test Columns ({preview.testColumns.length})</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Set date and max marks for each — a new test card will be created
                  </p>
                </div>
                <div className="space-y-2">
                  {testsConfig.map((cfg, i) => (
                    <div
                      key={cfg.header}
                      className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 border rounded-lg"
                    >
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Test Name</p>
                        <p className="text-sm font-medium truncate">{cfg.header}</p>
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Date
                        </Label>
                        <Input
                          type="date"
                          value={cfg.date}
                          onChange={(e) => {
                            const next = [...testsConfig];
                            next[i].date = e.target.value;
                            setTestsConfig(next);
                          }}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Max Marks
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          step="0.5"
                          value={cfg.maxMarks}
                          onChange={(e) => {
                            const next = [...testsConfig];
                            next[i].maxMarks = parseFloat(e.target.value) || 100;
                            setTestsConfig(next);
                          }}
                          className="h-8"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unmatched preview */}
            {preview.details?.unmatched?.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2">
                  Unmatched sample ({preview.details.unmatched.length} of {preview.unmatched}):
                </p>
                <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                  {preview.details.unmatched.slice(0, 10).map((u: any, i: number) => (
                    <div key={i} className="p-2 text-xs">
                      <span className="font-mono text-muted-foreground">
                        Row {u.row?.rowNumber}
                      </span>
                      <span className="ml-2">
                        {u.row?.name || u.row?.rollNumber || u.row?.email}
                      </span>
                      <span className="ml-2 text-amber-600">— {u.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preview.unmatchedSample?.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2">
                  Unmatched students (won't be imported):
                </p>
                <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                  {preview.unmatchedSample.map((u: any, i: number) => (
                    <div key={i} className="p-2 text-xs">
                      <span className="font-mono text-muted-foreground">
                        Row {u.rowNumber}
                      </span>
                      <span className="ml-2">
                        {u.name || u.rollNumber || u.email}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add unmatched option (students only) */}
            {importType === "students" && preview.unmatched > 0 && (
              <div className="flex items-start gap-2 p-3 border rounded-lg bg-amber-500/5">
                <input
                  type="checkbox"
                  checked={addUnmatched}
                  onChange={(e) => setAddUnmatched(e.target.checked)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">
                    Add {preview.unmatched} unmatched students as new
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Requires College and Section defaults (or in Excel columns)
                  </p>
                </div>
              </div>
            )}

            <Button
              onClick={handleCommit}
              disabled={committing}
              className="w-full"
            >
              {committing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  Confirm & Import
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ImportTypeCard({
  title,
  description,
  icon: Icon,
  color,
  onClick,
}: {
  type: string;
  title: string;
  description: string;
  icon: any;
  color: "primary" | "emerald" | "gold";
  onClick: () => void;
}) {
  const colorMap = {
    primary: "bg-primary/10 text-primary hover:border-primary/40",
    emerald:
      "bg-[color:var(--emerald)]/10 text-[color:var(--emerald)] hover:border-[color:var(--emerald)]/40",
    gold:
      "bg-[color:var(--gold)]/10 text-[color:var(--gold)] hover:border-[color:var(--gold)]/40",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "group text-left border rounded-lg p-5 hover:shadow-md hover:-translate-y-0.5 transition-all bg-card",
        colorMap[color]
      )}
    >
      <div className={cn("inline-flex p-2.5 rounded-lg mb-3", colorMap[color])}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
      <div className="flex items-center gap-1 text-xs mt-3 text-muted-foreground group-hover:text-foreground transition-colors">
        Start
        <ArrowRight className="h-3 w-3" />
      </div>
    </button>
  );
}

function StatBlock({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "emerald" | "primary" | "gold" | "amber" | "destructive";
}) {
  const colorClass = {
    emerald: "text-[color:var(--emerald)]",
    primary: "text-primary",
    gold: "text-[color:var(--gold)]",
    amber: "text-[color:var(--amber)]",
    destructive: "text-destructive",
  }[color];

  return (
    <div>
      <p className={cn("text-2xl font-bold leading-tight", colorClass)}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
        {label}
      </p>
    </div>
  );
}

function PreviewStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "emerald" | "amber" | "destructive";
}) {
  const bg = {
    emerald: "bg-[color:var(--emerald)]/10 text-[color:var(--emerald)]",
    amber: "bg-amber-500/10 text-amber-600",
    destructive: "bg-destructive/10 text-destructive",
  }[color];

  return (
    <div className={cn("rounded-lg p-3 border", bg.split(" ")[0])}>
      <p className={cn("text-2xl font-bold leading-tight", bg.split(" ")[1])}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
        {label}
      </p>
    </div>
  );
}