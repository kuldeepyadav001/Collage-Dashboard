"use client";

import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { CollegeSwitcher } from "./college-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Moon, Sun, Search, LogOut, User, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { YearSwitcher } from "./year-switcher";
import { cn } from "@/lib/utils";

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  WRITE_ADMIN: "Admin",
  READER: "Faculty",
};

const roleColors: Record<string, string> = {
  SUPER_ADMIN:
    "bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))] ring-1 ring-[hsl(var(--destructive))]/20",
  WRITE_ADMIN:
    "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/20",
  READER:
    "bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))] ring-1 ring-[hsl(var(--gold))]/20",
};

export function Topbar() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = theme === "dark";

  const initials = session?.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="flex h-16 items-center gap-3 border-b bg-card/60 backdrop-blur-md px-6 sticky top-0 z-10">
      {/* Year Switcher */}
      <YearSwitcher />
      <CollegeSwitcher />

      {/* Search */}
      <div className="relative flex-1 max-w-md">
  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
  <Input
    placeholder="Search students by name, roll, email..."
    className="pl-9 h-9 bg-secondary/60 border-border"
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        const q = (e.target as HTMLInputElement).value.trim();
        if (q) window.location.href = `/dashboard/students?q=${encodeURIComponent(q)}`;
      }
    }}
  />
  <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
    ↵
  </kbd>
</div>
      <div className="ml-auto flex items-center gap-2">
        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>

        {/* Theme pill toggle */}
        {mounted && (
          <div className="relative flex items-center rounded-full border bg-secondary/50 p-0.5">
            <button
              onClick={() => setTheme("light")}
              className={cn(
                "relative z-10 flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                !isDark ? "text-primary-foreground" : "text-muted-foreground",
              )}
              aria-label="Light mode"
            >
              <Sun className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={cn(
                "relative z-10 flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                isDark ? "text-primary-foreground" : "text-muted-foreground",
              )}
              aria-label="Dark mode"
            >
              <Moon className="h-3.5 w-3.5" />
            </button>
            {/* Sliding pill */}
            <span
              className={cn(
                "absolute top-0.5 h-7 w-7 rounded-full bg-foreground transition-transform duration-200",
                isDark ? "translate-x-7" : "translate-x-0",
              )}
            />
          </div>
        )}

        {/* Divider */}
        <div className="h-6 w-px bg-border mx-1" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-accent transition-colors outline-none">
            <Avatar className="h-8 w-8 ring-2 ring-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-primary to-[hsl(var(--gold))] text-primary-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col items-start leading-tight">
              <span className="text-sm font-medium">{session?.user.name}</span>
              {session?.user.role && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium mt-0.5 ${roleColors[session.user.role]}`}
                >
                  {roleLabels[session.user.role]}
                </span>
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm">{session?.user.name}</span>
                  <span className="text-xs text-muted-foreground font-normal mt-0.5">
                    {session?.user.email}
                  </span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="h-4 w-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
