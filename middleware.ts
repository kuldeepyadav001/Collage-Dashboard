export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/(dashboard)(.*)",
    "/api/students(.*)",
    "/api/sections(.*)",
    "/api/tests(.*)",
    "/api/attendance(.*)",
    "/api/excel(.*)",
  ],
};