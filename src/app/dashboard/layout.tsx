"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import { Badge } from "@/components/ui/badge";
import { Flame } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [productName, setProductName] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setProductName(data.order.productName || "");
          setStatus(data.order.provisioningStatus || data.order.status || "");
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar productName={productName} />

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md px-6 lg:px-8">
          <div className="flex items-center gap-3 ml-10 lg:ml-0">
            <Flame className="h-4 w-4 text-red-500" />
            <h1 className="text-sm font-semibold text-zinc-200 truncate">
              {productName || "Server Dashboard"}
            </h1>
          </div>
          {status && (
            <Badge
              className={
                status === "active"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-zinc-800 text-zinc-400 border border-zinc-700"
              }
            >
              {status}
            </Badge>
          )}
        </header>

        {/* Main content */}
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
