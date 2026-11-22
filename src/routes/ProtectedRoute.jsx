import React from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";

/**
 * Guards authenticated routes and optionally validates RBAC `moduleCode` read permission.
 */
export function ProtectedRoute({ children, moduleCode, action = "read" }) {
  const { isAuthenticated, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Memverifikasi sesi JWT dengan Backend Yii2...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (moduleCode && !hasPermission(moduleCode, action)) {
    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold">403 — Akses Ditolak (Forbidden)</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Role Anda tidak memiliki izin{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            {action}
          </code>{" "}
          pada modul{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            {moduleCode}
          </code>
          .
        </p>
        <div className="mt-5">
          <Link to="/dashboard">
            <Button variant="outline">Kembali ke Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
