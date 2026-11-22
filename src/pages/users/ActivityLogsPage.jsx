import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { formatDateTime } from "../../lib/utils";
import { userLogService } from "../../services/userLog.service";

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    per_page: 20,
    total_pages: 1,
  });
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = useCallback(
    async (targetPage = 1) => {
      setLoading(true);
      setError("");
      try {
        const res = await userLogService.list({
          search: search.trim() || undefined,
          module: moduleFilter || undefined,
          page: targetPage,
          per_page: meta.per_page,
        });
        setLogs(Array.isArray(res?.data) ? res.data : []);
        if (res?.meta) {
          setMeta(res.meta);
        }
      } catch (err) {
        setError(err?.message || "Gagal memuat log aktivitas.");
      } finally {
        setLoading(false);
      }
    },
    [search, moduleFilter, meta.per_page]
  );

  useEffect(() => {
    loadLogs(1);
  }, [loadLogs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Log Aktivitas &amp; Audit Trail
          </h1>
          <p className="text-sm text-muted-foreground">
            Rekaman aktivitas autentikasi dan perubahan hak akses yang bersifat
            read-only (
            <code className="font-mono text-xs">GET /api/user-logs</code> —
            Module Code: <code className="font-mono text-xs">users-logs</code>)
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => loadLogs(meta.page)}>
          <RefreshCw className="h-4 w-4" />
          Muat Ulang
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">
                Riwayat Aktivitas ({meta.total})
              </CardTitle>
              <CardDescription>
                Diurutkan dari aktivitas terbaru untuk kebutuhan audit keamanan
                SIMRS
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari aktor, aksi, deskripsi..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Semua Modul</option>
                <option value="auth">auth</option>
                <option value="users-list">users-list</option>
                <option value="users-roles">users-roles</option>
                <option value="settings-modules">settings-modules</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Aktor</TableHead>
                <TableHead>Modul / Aksi</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="inline-flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memuat log aktivitas dari Backend Yii2...
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-28 text-center text-muted-foreground"
                  >
                    Belum ada log aktivitas yang sesuai filter.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{log.id}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {log.actor_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {log.module}
                        </Badge>
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {log.action}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-md">
                      {log.description}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.ip || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
            <div>
              Halaman <strong className="text-foreground">{meta.page}</strong>{" "}
              dari{" "}
              <strong className="text-foreground">
                {meta.total_pages || 1}
              </strong>{" "}
              (Total {meta.total} log)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page <= 1 || loading}
                onClick={() => loadLogs(meta.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page >= (meta.total_pages || 1) || loading}
                onClick={() => loadLogs(meta.page + 1)}
              >
                Selanjutnya
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
