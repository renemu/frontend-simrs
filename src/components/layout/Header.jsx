import React, { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getInitials } from "../../lib/utils";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";

const ROUTE_TITLES = {
  "/dashboard": "Dashboard Utama",
  "/profile": "Profil & Preferensi",
  "/master": "Master Data",
  "/master/patients": "Data Pasien",
  "/master/doctors": "Dokter & Poli",
  "/master/schedules": "Jadwal Praktik",
  "/master/procedures": "Tindakan & Tarif",
  "/master/medicines": "Obat & Stok",
  "/outpatient": "Rawat Jalan",
  "/outpatient/registrations": "Pendaftaran Pasien",
  "/outpatient/queues": "Antrean Poli",
  "/outpatient/medical-records": "Rekam Medis",
  "/outpatient/prescriptions": "Resep & Farmasi",
  "/outpatient/laboratory": "Laboratorium",
  "/finance": "Billing & Kasir",
  "/finance/billings": "Tagihan (Billing)",
  "/finance/payments": "Pembayaran",
  "/users": "Manajemen Pengguna",
  "/users/roles": "Role & Hak Akses",
  "/users/logs": "Log Aktivitas",
  "/settings": "Pengaturan Sistem",
  "/settings/apps": "Pengaturan Aplikasi",
  "/settings/modules": "Modul & Menu",
};

export function Header({
  sidebarCollapsed,
  onToggleSidebar,
  onOpenMobileSidebar,
}) {
  const {
    user,
    darkMode,
    setDarkMode,
    logout,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const breadcrumbs = useMemo(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      return [{ label: "Dashboard", path: "/dashboard" }];
    }
    return segments.map((seg, idx) => {
      const path = "/" + segments.slice(0, idx + 1).join("/");
      const label =
        ROUTE_TITLES[path] ||
        seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
      return { label, path };
    });
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="shrink-0 z-30 flex h-14 w-full items-center justify-between gap-2 border-b bg-background/95 px-3 sm:px-6 backdrop-blur-md">
      {/* Left: Mobile Drawer Trigger + Desktop Sidebar Toggle + Breadcrumbs */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <Button
          variant="outline"
          size="icon"
          className="lg:hidden shrink-0 h-8 w-8"
          onClick={onOpenMobileSidebar}
          title="Buka Menu Navigasi"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground transition-transform duration-200 active:scale-95"
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? "Buka Sidebar" : "Tutup Sidebar"}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>

        <div className="hidden lg:block h-4 w-[1px] bg-border shrink-0" />

        <nav className="flex items-center gap-1.5 text-sm min-w-0 overflow-hidden">
          <span className="hidden md:inline text-muted-foreground font-medium shrink-0">
            SIMRS
          </span>
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.path}>
                <ChevronRight className="hidden md:inline h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {isLast ? (
                  <span className="font-semibold text-foreground truncate">
                    {crumb.label}
                  </span>
                ) : (
                  <span className="hidden md:inline text-muted-foreground truncate">
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Right: Compact, responsive controls */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setDarkMode(!darkMode)}
          title={darkMode ? "Mode Terang" : "Mode Gelap"}
        >
          {darkMode ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:inline-flex h-8 w-8"
          onClick={() => navigate("/profile")}
          title="Profil & Preferensi Tampilan"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
        </Button>

        <div className="h-4 w-[1px] bg-border mx-0.5 hidden sm:block" />

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            to="/profile"
            className="flex items-center gap-2 rounded-full sm:rounded-lg p-0.5 sm:px-2 sm:py-1 hover:bg-accent transition-colors"
            title="Profil Pengguna"
          >
            <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
              <AvatarFallback className="text-[11px]">
                {getInitials(user?.name || user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-left leading-tight">
              <p className="text-xs font-semibold truncate max-w-[130px]">
                {user?.name || user?.email}
              </p>
              <p className="text-[10px] text-muted-foreground truncate max-w-[130px]">
                {user?.role?.display_name || user?.role?.name || "User"}
              </p>
            </div>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="h-8 px-2 sm:px-3 gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40"
            title="Keluar"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
