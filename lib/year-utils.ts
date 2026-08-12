export type BatchStatus = "ACTIVE" | "PASSED_OUT";

export interface BatchInfo {
  admissionYear: number;
  currentYear: number | null;  // 1-4, or null if passed out
  status: BatchStatus;
  label: string;               // "1st Year" | "Passed Out"
}

/**
 * Given an admission year, calculate current academic year status.
 * Assumes 4-year degree, session starts in July.
 */
export function getBatchInfo(admissionYear: number): BatchInfo {
  const now = new Date();
  const currentAcademicYear =
    now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;

  const yearsElapsed = currentAcademicYear - admissionYear;

  if (yearsElapsed < 0) {
    // future batch
    return {
      admissionYear,
      currentYear: null,
      status: "ACTIVE",
      label: "Upcoming",
    };
  }

  if (yearsElapsed >= 4) {
    return {
      admissionYear,
      currentYear: null,
      status: "PASSED_OUT",
      label: "Passed Out",
    };
  }

  const yearNames = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  return {
    admissionYear,
    currentYear: yearsElapsed + 1,
    status: "ACTIVE",
    label: yearNames[yearsElapsed],
  };
}