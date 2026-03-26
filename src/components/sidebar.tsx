"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Zap,
  LogOut,
  Menu,
  X,
  Flame,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SidebarProps {
  productName?: string;
}

const navItems = [
  { href: "/dashboard", label: "Server Overview", icon: LayoutDashboard },
  { href: "/dashboard#control", label: "Server Control", icon: Zap },
];

export default function Sidebar({ productName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/access-server");
    } catch {
      toast.error("Logout failed");
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-red-600 flex items-center justify-center flex-shrink-0">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-sm text-white truncate">
              Host<span className="text-red-500">hell</span>
            </h2>
            {productName && (
              <p className="text-[11px] text-zinc-500 truncate leading-tight mt-0.5">{productName}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mx-4 h-px bg-zinc-800/80" />

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 mt-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <button
              key={item.href}
              onClick={() => {
                if (item.href.includes("#")) {
                  const el = document.getElementById(item.href.split("#")[1]);
                  el?.scrollIntoView({ behavior: "smooth" });
                } else {
                  router.push(item.href);
                }
                setMobileOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-red-500/10 text-red-400 border border-red-500/15"
                  : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 border border-transparent"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mx-4 h-px bg-zinc-800/80" />

      {/* Logout */}
      <div className="p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-zinc-500 hover:text-red-400 hover:bg-red-500/5"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-zinc-900 border border-zinc-800 shadow-lg"
      >
        {mobileOpen ? <X className="h-5 w-5 text-zinc-300" /> : <Menu className="h-5 w-5 text-zinc-300" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-40 w-64 bg-zinc-950 border-r border-zinc-800 transform transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-zinc-950 border-r border-zinc-800/80">
        {sidebarContent}
      </aside>
    </>
  );
}
