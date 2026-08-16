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
  Upload
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Students", href: "/dashboard/students", icon: Users },
  { label: "Elite Sections", href: "/dashboard/elite", icon: Sparkles },
  { label: "Tests", href: "/dashboard/tests", icon: FileText },
 
  { label: "Placements", href: "/dashboard/placements", icon: Briefcase },
];

const adminItems = [
  { label: "Manage", href: "/dashboard/manage", icon: Settings },
   { label: "Import Data", href: "/dashboard/import", icon: Upload },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-16 lg:w-64 flex-col border-r bg-card transition-all duration-200">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b px-3 lg:px-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary via-primary to-[color:var(--gold)] shadow-lg shadow-primary/20">
          <GraduationCap className="h-[18px] w-[18px] text-primary-foreground" />
        </div>
        <div className="hidden lg:flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">T&P Portal</span>
          <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
            Faculty Dashboard
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-6 px-2 lg:px-3 py-6 overflow-y-auto">
        <div>
          <p className="hidden lg:block px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Main
          </p>
          <div className="space-y-1">
            {navItems.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        </div>

        <div>
          <p className="hidden lg:block px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
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
      <div className="hidden lg:block border-t p-4">
        <div className="rounded-lg bg-gradient-to-br from-primary/5 via-[color:var(--gold)]/5 to-transparent border p-3">
          <p className="text-xs font-semibold">Need help?</p>
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
      title={item.label}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-2 lg:px-3 py-2 text-sm font-medium transition-all justify-center lg:justify-start",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
      )}
      <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
      <span className="hidden lg:inline">{item.label}</span>
    </Link>
  );
}