import { prisma } from "./prisma";

/**
 * Find or create the "Unassigned" college.
 * Used when import doesn't specify a college.
 */
export async function ensureUnassignedCollege(): Promise<string> {
  let college = await prisma.college.findFirst({
    where: { name: "UNASSIGNED" },
  });

  if (!college) {
    college = await prisma.college.create({
      data: {
        name: "UNASSIGNED",
        fullName: "Unassigned — needs review",
      },
    });
  }

  return college.id;
}

/**
 * Find or create the "Unassigned" section for a given year.
 * Creates: Year → Course "Unassigned" → Section "Unassigned"
 */
export async function ensureUnassignedSection(yearId: string): Promise<string> {
  // Find or create the Unassigned course under this year
  let course = await prisma.course.findFirst({
    where: {
      yearId,
      name: "Unassigned",
    },
  });

  if (!course) {
    course = await prisma.course.create({
      data: {
        name: "Unassigned",
        yearId,
      },
    });
  }

  // Find or create Unassigned section under this course
  let section = await prisma.section.findFirst({
    where: {
      courseId: course.id,
      name: "Unassigned",
    },
  });

  if (!section) {
    section = await prisma.section.create({
      data: {
        name: "Unassigned",
        courseId: course.id,
      },
    });
  }

  return section.id;
}