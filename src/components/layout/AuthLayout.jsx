import React from "react";
import {
  Activity,
  CheckCircle2,
  Database,
  Lock,
  Moon,
  Server,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export function AuthLayout({ children }) {
  const { apiInfo, darkMode, setDarkMode } = useAuth();

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-12 bg-background text-foreground">
      {/* Left Hero Panel (SIMRS Enterprise Showcase) */}
      <div className="hidden lg:flex lg:col-span-7 relative flex-col justify-between overflow-hidden bg-slate-950 p-10 text-white">
        {/* Decorative gradient mesh */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/25 via-slate-950 to-slate-950" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="pointer-events-none absolute top-1/4 right-12 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />

        {/* Top Brand Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight">
                SIMRS Enterprise
              </span>
              <p className="text-xs text-slate-400">
                Hospital Management & RBAC Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3.5 py-1.5 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                apiInfo?.online
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-rose-500"
              }`}
            />
            <span className="text-slate-300 font-medium">
              {apiInfo?.online
                ? `${apiInfo.name} v${apiInfo.version}`
                : "Backend Yii2 Offline"}
            </span>
          </div>
        </div>

        {/* Center Feature Highlights */}
        <div className="relative z-10 my-auto max-w-xl space-y-6">
          <Badge
            variant="outline"
            className="border-blue-500/30 bg-blue-500/10 text-blue-300 px-3 py-1"
          >
            Integrated with Yii2 REST API & PostgreSQL
          </Badge>

          <h1 className="text-3xl xl:text-4xl font-bold tracking-tight text-white leading-tight">
            Sistem Informasi Manajemen Rumah Sakit Terpadu & Modern.
          </h1>

          <p className="text-slate-400 text-base leading-relaxed">
            Platform manajemen terpusat dengan autentikasi{" "}
            <span className="text-slate-200 font-medium">
              Stateless JWT (HS256)
            </span>
            , kontrol hak akses{" "}
            <span className="text-slate-200 font-medium">
              Role-Based Module Permissions (CRUD)
            </span>
            , serta struktur menu hierarkis dinamis.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-4 backdrop-blur-xs">
              <div className="flex items-center gap-2.5 text-blue-400 mb-1.5">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-sm font-semibold text-white">
                  Granular RBAC CRUD
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Otorisasi per modul (Create, Read, Update, Delete) terintegrasi
                langsung dengan PermissionFilter Yii2.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-4 backdrop-blur-xs">
              <div className="flex items-center gap-2.5 text-emerald-400 mb-1.5">
                <Lock className="h-4 w-4" />
                <span className="text-sm font-semibold text-white">
                  Instant Session Revocation
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Validasi token real-time dengan dukungan{" "}
                <code className="text-emerald-300">session_version</code> saat
                logout atau reset password.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-4 backdrop-blur-xs">
              <div className="flex items-center gap-2.5 text-amber-400 mb-1.5">
                <Database className="h-4 w-4" />
                <span className="text-sm font-semibold text-white">
                  Dynamic Tree Modules
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Navigasi sidebar terbentuk otomatis mengikuti struktur pohon{" "}
                <code className="text-amber-300">parent_id</code> dari database.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-4 backdrop-blur-xs">
              <div className="flex items-center gap-2.5 text-purple-400 mb-1.5">
                <Server className="h-4 w-4" />
                <span className="text-sm font-semibold text-white">
                  JSON API Standard
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Penanganan response & validasi terstandarisasi dari endpoint
                RESTful Yii2.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Footer Info */}
        <div className="relative z-10 flex items-center justify-between border-t border-slate-800/80 pt-6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Database: PostgreSQL (simrs_db)</span>
          </div>
          <span>© {new Date().getFullYear()} SIMRS Enterprise Architecture</span>
        </div>
      </div>

      {/* Right Authentication Form Panel */}
      <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-10 lg:p-12">
        <div className="flex items-center justify-between">
          <div className="flex lg:hidden items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-sm">SIMRS Enterprise</span>
              <p className="text-[11px] text-muted-foreground">
                {apiInfo?.online ? "Backend Online" : "Backend Offline"}
              </p>
            </div>
          </div>
          <div className="ml-auto">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="my-auto mx-auto w-full max-w-md py-6">{children}</div>

        <div className="text-center text-xs text-muted-foreground">
          Endpoint API:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
            {process.env.REACT_APP_API_URL || "http://localhost:8080"}
          </code>
        </div>
      </div>
    </div>
  );
}
