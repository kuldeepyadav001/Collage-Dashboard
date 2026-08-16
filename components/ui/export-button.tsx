"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  url: string;
  filename?: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

export function ExportButton({
  url,
  filename,
  label = "Export",
  className,
  size = "md",
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Export failed");
        return;
      }
      const blob = await res.blob();

      // Get filename from header if not provided
      let finalName = filename;
      if (!finalName) {
        const cd = res.headers.get("Content-Disposition");
        const match = cd?.match(/filename="?([^"]+)"?/);
        finalName = match?.[1] || "export.xlsx";
      }

      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(dlUrl);

      toast.success("Downloaded");
    } catch {
      toast.error("Download failed");
    } finally {
      setLoading(false);
    }
  }

  const sizeClasses = size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-sm";

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-md border hover:bg-accent transition-colors disabled:opacity-50",
        sizeClasses,
        className
      )}
    >
      {loading ? (
        <Loader2 className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5", "animate-spin")} />
      ) : (
        <Download className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      )}
      {label}
    </button>
  );
}