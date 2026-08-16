"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Pencil, Plus } from "lucide-react";
import { PlacementDialog } from "./placement-dialog";

interface Props {
  studentId: string;
  studentName: string;
  existing: {
    id: string;
    status: string;
    company: string | null;
    role: string | null;
    packageLpa: number | null;
    placementDate: string | null;
    type: string | null;
    notes: string | null;
  } | null;
}

export function StudentPlacementEditor({ studentId, studentName, existing }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const canWrite =
    session?.user.role === "SUPER_ADMIN" || session?.user.role === "WRITE_ADMIN";

  if (!canWrite) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded hover:bg-accent border transition-colors"
      >
        {existing ? (
          <>
            <Pencil className="h-3 w-3" />
            Edit
          </>
        ) : (
          <>
            <Plus className="h-3 w-3" />
            Log
          </>
        )}
      </button>

      <PlacementDialog
        open={open}
        onOpenChange={setOpen}
        studentId={studentId}
        studentName={studentName}
        existing={existing}
        onSaved={() => router.refresh()}
      />
    </>
  );
}