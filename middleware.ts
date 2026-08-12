import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/students/:path*",
    "/api/sections/:path*",
    "/api/tests/:path*",
    "/api/attendance/:path*",
    "/api/excel/:path*",
  ],
};