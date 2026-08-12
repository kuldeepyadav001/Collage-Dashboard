import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Welcome, {session?.user.name}</h1>
      <p className="text-slate-500 mt-1">Role: {session?.user.role}</p>
    </main>
  );
}