import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <Header onOpenMobileSidebar={() => setMobileOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        <footer className="border-t px-6 py-4 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            SIMRS Enterprise Frontend — Terintegrasi dengan{" "}
            <strong className="text-foreground">SIMRS Backend API (Yii2)</strong>
          </span>
          <span>RBAC & Stateless JWT Authentication</span>
        </footer>
      </div>
    </div>
  );
}
