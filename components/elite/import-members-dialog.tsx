"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eliteId: string;
  eliteName: string;
  onImported: () => void;
}

export function ImportMembersDialog({
  open,
  onOpenChange,
  eliteId,
  eliteName,
  onImported,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [addUnmatched, setAddUnmatched] = useState(true);

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
  }

  function closeAndReset() {
    reset();
    onOpenChange(false);
  }

  async function handlePreview() {
    if (!file) return;
    setLoading(true);
    setPreview(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("mode", "preview");

    try {
      const res = await fetch(`/api/elite/${eliteId}/import`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Preview failed");
        return;
      }
      setPreview(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (!file) return;
    setCommitting(true);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("mode", "commit");
    fd.append("addUnmatched", String(addUnmatched));

    try {
      const res = await fetch(`/api/elite/${eliteId}/import`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Import failed");
        return;
      }
      setResult(data);
      toast.success("Members imported");
      onImported();
    } finally {
      setCommitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(o) : closeAndReset())}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Members to "{eliteName}"</DialogTitle>
          <DialogDescription>
            Upload an Excel of students — they'll be added to this elite section
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <ResultView
            result={result}
            onDone={closeAndReset}
            onImportMore={reset}
          />
        ) : (
          <div className="space-y-4">
            {/* Template link */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <p className="text-sm font-medium">Need format help?</p>
                <p className="text-xs text-muted-foreground">
                  Same template as bulk student import
                </p>
              </div>
              <a
                href="/api/import/templates/students"
                className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-md border hover:bg-accent transition-colors"
              >
                <Download className="h-3 w-3" />
                Template
              </a>
            </div>

            {/* Info hint */}
            <div className="flex gap-2 p-3 rounded-lg border bg-primary/5 border-primary/20">
              <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">
                  Automatic handling
                </p>
                <p>
                  New students not in the database will be created and added to
                  this elite section. If their section or college is missing
                  from Excel, they'll be placed in an "Unassigned" bucket that
                  you can review later from the Manage page.
                </p>
              </div>
            </div>

            {/* File upload */}
            <div className="space-y-2">
              <Label className="text-xs">Excel File</Label>
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
            </div>

            {!preview && (
              <Button
                onClick={handlePreview}
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
                    Preview
                  </>
                )}
              </Button>
            )}

            {/* Preview */}
            {preview && (
              <div className="space-y-4">
                <p className="text-xs font-medium">Preview</p>

                {/* Stat chips */}
                <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                  <PreviewChip
                    label="Will Add"
                    value={preview.willBeAdded}
                    color="emerald"
                  />
                  <PreviewChip
                    label="Already In"
                    value={preview.alreadyMembers}
                    color="muted"
                  />
                  <PreviewChip
                    label="New Students"
                    value={preview.unmatched}
                    color="amber"
                  />
                  <PreviewChip
                    label="Wrong Year"
                    value={preview.wrongYear}
                    color="destructive"
                  />
                </div>

                {/* Wrong year warning */}
                {preview.wrongYear > 0 && (
                  <div className="text-xs p-3 rounded border border-destructive/40 bg-destructive/5">
                    <p className="font-medium text-destructive mb-1">
                      {preview.wrongYear} students not from batch{" "}
                      {preview.eliteYear}
                    </p>
                    <p className="text-muted-foreground">
                      They exist in the database but belong to different years.
                      Cannot be added.
                    </p>
                    {preview.wrongYearSample?.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {preview.wrongYearSample.map((w: any, i: number) => (
                          <div key={i} className="font-mono text-[10px]">
                            Row {w.rowNumber}: {w.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* New students to be created — full table */}
                {preview.unmatchedSample?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-2">
                      New students to be created (
                      {preview.unmatchedSample.length}
                      {preview.unmatched > preview.unmatchedSample.length &&
                        ` of ${preview.unmatched}`}
                      ):
                    </p>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/50 sticky top-0">
                            <tr>
                              <th className="text-left p-2">Row</th>
                              <th className="text-left p-2">Name / Roll</th>
                              <th className="text-left p-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {preview.unmatchedSample.map(
                              (u: any, i: number) => (
                                <tr key={i}>
                                  <td className="p-2 font-mono text-muted-foreground">
                                    {u.rowNumber}
                                  </td>
                                  <td className="p-2">
                                    <p className="font-medium">
                                      {u.identity}
                                    </p>
                                  </td>
                                  <td className="p-2">
                                    {u.reason.startsWith("Missing") ? (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">
                                        Can't create — {u.reason}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-medium">
                                        Will be created
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Confirmation checkbox */}
                {preview.unmatched > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded border bg-amber-500/5">
                    <input
                      type="checkbox"
                      checked={addUnmatched}
                      onChange={(e) => setAddUnmatched(e.target.checked)}
                      className="mt-0.5"
                    />
                    <div className="text-xs">
                      <p className="font-medium">
                        Create {preview.unmatched} new students & add to elite
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        Missing section/college info uses "Unassigned"
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
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResultView({
  result,
  onDone,
  onImportMore,
}: {
  result: any;
  onDone: () => void;
  onImportMore: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 rounded-lg border border-[color:var(--emerald)]/40 bg-[color:var(--emerald)]/5">
        <div className="p-2 rounded-full bg-[color:var(--emerald)]/10 text-[color:var(--emerald)]">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold">Import Complete</p>
          <p className="text-xs text-muted-foreground">
            {result.added} added · {result.created} new students created
          </p>
        </div>
      </div>

      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
        <PreviewChip label="Added" value={result.added} color="emerald" />
        <PreviewChip label="Created" value={result.created} color="primary" />
        <PreviewChip label="Skipped" value={result.skipped} color="amber" />
        <PreviewChip
          label="Failed"
          value={result.failures?.length || 0}
          color="destructive"
        />
      </div>

      {result.failures && result.failures.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
            Failed rows
          </p>
          <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
            {result.failures.map((f: any, i: number) => (
              <div key={i} className="p-2 text-xs">
                <span className="font-mono text-muted-foreground">
                  Row {f.row}
                </span>
                <span className="ml-2 text-destructive">{f.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onImportMore}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Import More
        </Button>
        <Button onClick={onDone}>Done</Button>
      </div>
    </div>
  );
}

function PreviewChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "emerald" | "muted" | "amber" | "destructive" | "primary";
}) {
  const bg = {
    emerald:
      "bg-[color:var(--emerald)]/10 text-[color:var(--emerald)] border-[color:var(--emerald)]/40",
    muted: "bg-muted text-muted-foreground border-border",
    amber: "bg-amber-500/10 text-amber-600 border-amber-500/40",
    destructive: "bg-destructive/10 text-destructive border-destructive/40",
    primary: "bg-primary/10 text-primary border-primary/40",
  }[color];

  return (
    <div className={cn("rounded-lg p-3 border", bg)}>
      <p className="text-xl font-bold leading-tight">{value}</p>
      <p className="text-[10px] uppercase tracking-wider mt-0.5 opacity-75">
        {label}
      </p>
    </div>
  );
}