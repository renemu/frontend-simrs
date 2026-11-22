import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Check,
  Clock,
  Layers,
  RefreshCw,
  Server,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useAuth } from "../../context/AuthContext";
import { DynamicIcon } from "../../lib/icons";
import { formatDateTime, getInitials } from "../../lib/utils";
import { moduleService } from "../../services/module.service";
import { roleService } from "../../services/role.service";
import { userService } from "../../services/user.service";

export default function DashboardPage() {
  const { user, permissions, menus, apiInfo, hasPermission, refreshMe } =
    useAuth();

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRoles: 0,
    totalModules: 0,
    recentUsers: [],
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setLoadingStats(true);
    try {
      const promises = [];

      if (hasPermission("users-list", "read")) {
        promises.push(
          userService
            .list({ page: 1, per_page: 5 })
            .catch(() => ({ data: [], meta: { total: 0 } }))
        );
      } else {
        promises.push(Promise.resolve({ data: [], meta: { total: 0 } }));
      }

      if (hasPermission("users-roles", "read")) {
        promises.push(roleService.list().catch(() => ({ data: [] })));
      } else {
        promises.push(Promise.resolve({ data: [] }));
      }

      if (hasPermission("settings-modules", "read")) {
        promises.push(moduleService.list().catch(() => ({ data: [] })));
      } else {
        promises.push(Promise.resolve({ data: [] }));
      }

      const [usersRes, rolesRes, modulesRes] = await Promise.all(promises);

      setStats({
        totalUsers: usersRes?.meta?.total || usersRes?.data?.length || 0,
        totalRoles: Array.isArray(rolesRes?.data) ? rolesRes.data.length : 0,
        totalModules: Array.isArray(modulesRes?.data)
          ? modulesRes.data.length
          : 0,
        recentUsers: Array.isArray(usersRes?.data) ? usersRes.data : [],
      });
    } finally {
      setLoadingStats(false);
    }
  }, [hasPermission]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const grantedModulesCount = permissions.filter((p) => p.read).length;

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border bg-card p-6 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default" className="gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              {user?.role?.display_name || user?.role?.name || "Authenticated"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Session v{user?.session_version ?? 1}
            </Badge>
            <Badge
              variant={apiInfo?.online ? "success" : "destructive"}
              className="text-xs"
            >
              {apiInfo?.online ? "Backend Yii2 Connected" : "Backend Offline"}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Selamat Datang, {user?.name || user?.email}!
          </h1>
          <p className="text-sm text-muted-foreground">
            Panel kendali utama SIMRS — pantau pengguna, hak akses modul RBAC,
            dan konfigurasi sistem secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refreshMe();
              fetchDashboardData();
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Data
          </Button>
          {hasPermission("users-list", "read") && (
            <Link to="/users">
              <Button size="sm">
                Kelola Users
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* 4 KPI Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pengguna
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Terdaftar di tabel <code className="font-mono">users</code>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Role RBAC
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {stats.totalRoles || "4"}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Role aktif dengan matriks CRUD
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Modul & Menu Sistem
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Layers className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {stats.totalModules || permissions.length}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {grantedModulesCount} modul dapat Anda akses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status Sesi & API
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Server className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {apiInfo?.online ? `Online (${apiInfo.environment})` : "Offline"}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Login: {formatDateTime(user?.last_login_at)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Two-Column Section: Recent Users & Active User Permission Matrix */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left 7 Cols: Recent Users Table from /api/users */}
        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Daftar Pengguna Terbaru
              </CardTitle>
              <CardDescription>
                Data langsung dari endpoint{" "}
                <code className="text-xs font-mono">GET /api/users</code>
              </CardDescription>
            </div>
            {hasPermission("users-list", "read") && (
              <Link to="/users">
                <Button variant="outline" size="sm">
                  Lihat Semua
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {!hasPermission("users-list", "read") ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Role Anda tidak memiliki izin <code>read</code> pada modul{" "}
                <code>users-list</code>.
              </div>
            ) : loadingStats ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Login Terakhir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {getInitials(u.name || u.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-xs sm:text-sm">
                              {u.name || "Tanpa Nama"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {u.role?.display_name || u.role?.name || `Role #${u.role_id}`}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={u.is_active ? "success" : "destructive"}
                        >
                          {u.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatDateTime(u.last_login_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Right 5 Cols: Current User's Effective RBAC Permissions Matrix */}
        <Card className="lg:col-span-5">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Hak Akses Modul Anda (RBAC)
              </CardTitle>
              <CardDescription>
                Matriks efektif dari{" "}
                <code className="text-xs font-mono">GET /api/auth/me</code>
              </CardDescription>
            </div>
            {hasPermission("users-roles", "read") && (
              <Link to="/users/roles">
                <Button variant="ghost" size="sm" className="text-xs">
                  Atur Role
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            <div className="max-h-[340px] overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module Code</TableHead>
                    <TableHead className="text-center">C</TableHead>
                    <TableHead className="text-center">R</TableHead>
                    <TableHead className="text-center">U</TableHead>
                    <TableHead className="text-center">D</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map((perm) => (
                    <TableRow key={perm.module_code}>
                      <TableCell className="font-mono text-xs font-medium">
                        {perm.module_code}
                      </TableCell>
                      {["create", "read", "update", "delete"].map((act) => (
                        <TableCell key={act} className="text-center p-2">
                          {perm[act] ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              <Check className="h-3 w-3" />
                            </span>
                          ) : (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground/50">
                              <X className="h-3 w-3" />
                            </span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Module Navigation Cards from Hierarchical Menu Tree */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Pintasan Modul Hierarki SIMRS
          </CardTitle>
          <CardDescription>
            Struktur modul dinamis yang dimuat dari pohon{" "}
            <code className="font-mono text-xs">menus</code> pada Backend Yii2
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {menus.map((menu) => (
              <div
                key={menu.id}
                className="flex flex-col justify-between rounded-xl border p-4 hover:border-primary/40 transition-colors bg-muted/20"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <DynamicIcon name={menu.icon} className="h-4 w-4" />
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {menu.code}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-sm">{menu.name}</h4>

                  {Array.isArray(menu.children) && menu.children.length > 0 ? (
                    <div className="space-y-1 pt-1">
                      {menu.children.map((sub) => (
                        <Link
                          key={sub.id}
                          to={sub.path || "#"}
                          className="flex items-center justify-between rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <DynamicIcon name={sub.icon} className="h-3 w-3" />
                            {sub.name}
                          </span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Endpoint Path:{" "}
                      <code className="font-mono">{menu.path || "/"}</code>
                    </p>
                  )}
                </div>

                {menu.path &&
                  (!menu.children || menu.children.length === 0) && (
                    <Link
                      to={menu.path}
                      className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Buka Modul <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
