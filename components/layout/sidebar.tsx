"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  FileText,
  ClipboardCheck,
  Settings,
  GraduationCap,
  Briefcase,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Directory", href: "/dashboard/directory", icon: Users },
  { label: "Elite Sections", href: "/dashboard/elite", icon: Sparkles },
  { label: "Tests", href: "/dashboard/tests", icon: FileText },
  { label: "Attendance", href: "/dashboard/attendance", icon: ClipboardCheck },
  { label: "Placements", href: "/dashboard/placements", icon: Briefcase },
];

const adminItems = [
  { label: "Manage", href: "/dashboard/manage", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
  <aside className="hidden md:flex w-64 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary via-primary to-[hsl(var(--gold))] shadow-lg shadow-primary/20">
          <GraduationCap className="h-4.5 w-4.5 text-primary-foreground" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">T&P Portal</span>
          <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
            Faculty Dashboard
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-6 px-3 py-6 overflow-y-auto">
        <div>
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Main
          </p>
          <div className="space-y-1">
            {navItems.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        </div>

        <div>
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Administration
          </p>
          <div className="space-y-1">
            {adminItems.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="rounded-lg bg-gradient-to-br from-primary/5 via-[hsl(var(--gold))]/5 to-transparent border border-border p-3">
          <p className="text-xs font-semibold">
            Need help?
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Contact your admin
          </p>
        </div>
      </div>
    </aside>
  );
}

function NavLink({
  item,
  pathname,
}: {
  item: { label: string; href: string; icon: any };
  pathname: string;
}) {
  const Icon = item.icon;
  const active = pathname === item.href;

  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
      )}
      <Icon className={cn("h-4 w-4", active && "text-primary")} />
      {item.label}
    </Link>
  );
}