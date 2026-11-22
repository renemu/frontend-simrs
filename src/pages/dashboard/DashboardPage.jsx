import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ClipboardList,
  CreditCard,
  FlaskConical,
  Pill,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
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
import {
  formatCurrency,
  getLocalFirstOfMonthDate,
  getLocalTodayDate,
} from "../../lib/utils";
import { dashboardService } from "../../services/finance.service";

export default function DashboardPage() {
  const { user } = useAuth();
  const [fromDate, setFromDate] = useState(() => getLocalFirstOfMonthDate());
  const [toDate, setToDate] = useState(() => getLocalTodayDate());
  const [metrics, setMetrics] = useState(null);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await dashboardService.getSummary({
        from: fromDate,
        to: toDate,
      });
      setMetrics(res?.data || null);
      setSource(res?.via || "");
    } catch (err) {
      setError(err?.message || "Gagal memuat ringkasan dashboard.");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const visitsByDept = metrics?.visits_by_department || [];
  const maxDeptVisits = Math.max(
    1,
    ...visitsByDept.map((d) => d.visit_count || 0),
  );
  const topMedicines = metrics?.medicine_usage?.top_medicines || [];

  return (
    <div className="space-y-6">
      {/* Header + Period Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border bg-card p-5 shadow-xs">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default" className="gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              {user?.role?.display_name || user?.role?.name || "User"}
            </Badge>
            {/* {source && (
              <Badge variant="outline" className="text-[11px]">
                {source === "node-service" ? "Node.js Analytics API" : "Yii2 Metrics API"}
              </Badge>
            )} */}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Dashboard Pelayanan Rawat Jalan
          </h1>
          <p className="text-sm text-muted-foreground">
            Ringkasan kunjungan, tindakan medis, pemakaian obat, dan status
            pendapatan periode terpilih
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            className="w-36"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">s/d</span>
          <Input
            type="date"
            className="w-36"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
          <Button variant="outline" size="sm" onClick={loadMetrics}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 4 Primary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Kunjungan
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {metrics?.visits?.total ?? 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Selesai: {metrics?.visits?.completed ?? 0} • Aktif:{" "}
              {metrics?.visits?.active ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tindakan Medis
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {metrics?.procedures?.count ?? 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Nilai: {formatCurrency(metrics?.procedures?.revenue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendapatan Diterima
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(metrics?.revenue?.total_paid)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Sisa piutang:{" "}
              {formatCurrency(metrics?.revenue?.total_outstanding)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Obat &amp; Laboratorium
            </CardTitle>
            <Pill className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {metrics?.medicine_usage?.total_dispensed_units ?? 0}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  unit obat
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <FlaskConical className="h-3 w-3" />
              Order Lab: {metrics?.laboratory?.completed_orders ?? 0}/
              {metrics?.laboratory?.total_orders ?? 0} selesai
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visits per Department & Payment Status */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="text-base">
              Kunjungan per Poliklinik
            </CardTitle>
            <CardDescription>
              Distribusi pasien rawat jalan aktif pada periode terpilih
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {visitsByDept.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Belum ada data poliklinik.
              </p>
            ) : (
              visitsByDept.map((d) => {
                const pct = Math.round(
                  ((d.visit_count || 0) / maxDeptVisits) * 100,
                );
                return (
                  <div key={d.department_id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{d.name}</span>
                      <span className="font-mono font-semibold">
                        {d.visit_count} kunjungan
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${Math.max(d.visit_count > 0 ? 6 : 0, pct)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Status Pembayaran Invoice
            </CardTitle>
            <CardDescription>
              Total tagihan diterbitkan:{" "}
              {formatCurrency(metrics?.revenue?.total_billed)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border p-3">
              <span className="text-sm font-medium">Lunas (Paid)</span>
              <Badge variant="success" className="font-mono text-sm px-3">
                {metrics?.payment_status?.paid ?? 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <span className="text-sm font-medium">
                Dibayar Sebagian (Partially Paid)
              </span>
              <Badge variant="warning" className="font-mono text-sm px-3">
                {metrics?.payment_status?.partially_paid ?? 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <span className="text-sm font-medium">Belum Lunas (Unpaid)</span>
              <Badge variant="destructive" className="font-mono text-sm px-3">
                {metrics?.payment_status?.unpaid ?? 0}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Medicine Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Ringkasan Pemakaian Obat (Dispensed)
          </CardTitle>
          <CardDescription>
            Berdasarkan catatan mutasi penyerahan obat oleh Instalasi Farmasi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama Obat</TableHead>
                <TableHead>Total Diserahkan</TableHead>
                <TableHead>Sisa Stok Saat Ini</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topMedicines.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-6"
                  >
                    Belum ada pemakaian obat pada periode ini.
                  </TableCell>
                </TableRow>
              ) : (
                topMedicines.map((m) => (
                  <TableRow key={m.medicine_id}>
                    <TableCell className="font-mono text-xs">
                      {m.code}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {m.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">
                      {m.dispensed_qty} {m.unit}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {m.current_stock} {m.unit}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
