"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Loader2, Sparkles, Users, Briefcase } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left — Hero */}
      <div className="relative flex-1 hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-[color:var(--gold)]">
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute top-1/4 right-1/3 h-64 w-64 rounded-full bg-[color:var(--gold)]/20 blur-3xl" />

        {/* Top — logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-xl tracking-tight">SutraBoard</p>
            <p className="text-white/70 text-xs">The thread that connects every batch</p>
          </div>
        </div>

        {/* Middle — hero content */}
        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-5xl font-bold text-white tracking-tight leading-tight">
              One dashboard.
              <br />
              Every batch.
              <br />
              <span className="text-white/70">Every placement.</span>
            </h1>
            <p className="text-white/80 text-lg mt-6 max-w-md">
              Track students across years, colleges, and courses. Manage tests, elite groups, and placements — all in one place.
            </p>
          </div>

          {/* Feature chips */}
          <div className="flex flex-wrap gap-2 pt-4">
            <FeatureChip icon={Users} label="Student Directory" />
            <FeatureChip icon={Sparkles} label="Elite Sections" />
            <FeatureChip icon={Briefcase} label="Placement Tracking" />
          </div>
        </div>

        {/* Bottom — footer */}
        <div className="relative z-10 flex items-center justify-between text-white/60 text-xs">
          <p>© {new Date().getFullYear()} SutraBoard</p>
          <p>Training & Placement · Faculty Portal</p>
        </div>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile-only logo */}
          <div className="lg:hidden flex items-center justify-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[color:var(--gold)] shadow-lg">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-lg tracking-tight">SutraBoard</p>
              <p className="text-[10px] text-muted-foreground">Faculty Portal</p>
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to access the faculty dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@college.com"
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="h-11"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 font-medium"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Footer help */}
          <div className="pt-6 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Access is provided by your Training & Placement admin.
              <br />
              Contact them for account issues.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function FeatureChip({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-medium">
      <Icon className="h-3 w-3" />
      {label}
    </div>
  );
}