import React, { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
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
  "/settings/apps": "Sistem & API",
  "/settings/modules": "Modul & Menu",
};

export function Header({ onOpenMobileSidebar }) {
  const {
    user,
    apiInfo,
    darkMode,
    setDarkMode,
    logout,
    refreshMe,
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
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/85 px-4 sm:px-6 backdrop-blur-md">
      {/* Left: Mobile Menu Trigger + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="outline"
          size="icon"
          className="lg:hidden shrink-0"
          onClick={onOpenMobileSidebar}
        >
          <Menu className="h-4 w-4" />
        </Button>

        <nav className="flex items-center gap-1.5 text-sm overflow-hidden">
          <span className="hidden sm:inline text-muted-foreground font-medium">
            SIMRS
          </span>
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.path}>
                <ChevronRight className="hidden sm:inline h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {isLast ? (
                  <span className="font-semibold text-foreground truncate">
                    {crumb.label}
                  </span>
                ) : (
                  <span className="hidden sm:inline text-muted-foreground truncate">
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Right: Backend Status, Theme Toggle, Profile Quick Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Backend Yii2 Connection Indicator */}
        <div
          className="hidden md:flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs"
          title={`Backend: ${apiInfo?.name || "Yii2 API"}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              apiInfo?.online ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />
          <span className="font-medium text-muted-foreground">
            {apiInfo?.online ? `API v${apiInfo.version}` : "API Offline"}
          </span>
        </div>

        {/* Sync / Refresh Session Permissions */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refreshMe()}
          title="Sinkronisasi Hak Akses & Menu (/api/auth/me)"
        >
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </Button>

        {/* Dark / Light Mode Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDarkMode(!darkMode)}
          title={darkMode ? "Mode Terang" : "Mode Gelap"}
        >
          {darkMode ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        {/* Self Profile & Preferences Shortcut (available for all authenticated roles) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/profile")}
          title="Profil & Preferensi Tampilan"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
        </Button>

        <div className="h-6 w-[1px] bg-border mx-1 hidden sm:block" />

        {/* User Profile Pill */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/profile"
            className="flex items-center gap-2.5 rounded-full sm:rounded-lg p-1 sm:px-2 sm:py-1 hover:bg-accent transition-colors"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {getInitials(user?.name || user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold leading-none">
                {user?.name || user?.email}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {user?.role?.display_name || user?.role?.name || "User"}
              </p>
            </div>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
