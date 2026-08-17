export type BatchStatus = "ACTIVE" | "PASSED_OUT" | "UPCOMING";

export interface BatchInfo {
  passingYear: number;
  admissionYear: number;
  currentYear: number | null;  // 1-4, or null if passed/upcoming
  status: BatchStatus;
  label: string;               // "1st Year" | "Passed Out" | "Upcoming"
}

const COURSE_DURATION = 4;

/**
 * Given a PASSING year (graduation year), calculate current status.
 * Example: passingYear 2028 → admission year 2024 → currently in 2nd year (if 2025).
 */
export function getBatchInfo(passingYear: number): BatchInfo {
  const admissionYear = passingYear - COURSE_DURATION;

  const now = new Date();
  const currentAcademicYear =
    now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;

  const yearsElapsed = currentAcademicYear - admissionYear;

  // Batch hasn't started yet
  if (yearsElapsed < 0) {
    return {
      passingYear,
      admissionYear,
      currentYear: null,
      status: "UPCOMING",
      label: "Upcoming",
    };
  }

  // Already graduated
  if (yearsElapsed >= COURSE_DURATION) {
    return {
      passingYear,
      admissionYear,
      currentYear: null,
      status: "PASSED_OUT",
      label: "Passed Out",
    };
  }

  const yearNames = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  return {
    passingYear,
    admissionYear,
    currentYear: yearsElapsed + 1,
    status: "ACTIVE",
    label: yearNames[yearsElapsed],
  };
}