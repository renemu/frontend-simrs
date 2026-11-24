import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Download,
  FileBarChart2,
  Filter,
  FlaskConical,
  Pill,
  Printer,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  Users,
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
import { Label } from "../../components/ui/label";
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
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatLocalDateInput,
  getLocalFirstOfMonthDate,
  getLocalTodayDate,
} from "../../lib/utils";
import { departmentService, doctorService } from "../../services/master.service";
import { reportService } from "../../services/report.service";
import {
  exportReportToCsv,
  getItemTypeLabel,
  getModalityLabel,
  printSimrsReport,
} from "./reportExport";

const REPORT_TABS = [
  { id: "all", label: "Laporan Keseluruhan", code: "SIMRS-ALL", icon: BarChart3 },
  { id: "visits", label: "RL 5.2 Kunjungan", code: "RL 5.2", icon: Users },
  { id: "morbidity", label: "RL 5.4 — 10 Besar Penyakit", code: "RL 5.4", icon: Stethoscope },
  { id: "procedures", label: "Tindakan Medis", code: "RL 3.x", icon: ClipboardList },
  { id: "pharmacy", label: "Farmasi & Obat", code: "RL 3.13", icon: Pill },
  { id: "laboratory", label: "Lab & Penunjang", code: "RL 3.8", icon: FlaskConical },
  { id: "finance", label: "Keuangan & Kasir", code: "SIMRS-KEU", icon: CreditCard },
];

const PERIOD_MODES = [
  { id: "day", label: "Harian (Day)" },
  { id: "month", label: "Bulanan (Month)" },
  { id: "range", label: "Rentang Tanggal" },
  { id: "year", label: "Tahunan (Year)" },
];

const VISIT_STATUS_BADGE = {
  registered: { label: "Terdaftar", variant: "info" },
  in_progress: { label: "Diperiksa", variant: "warning" },
  completed: { label: "Selesai", variant: "success" },
  cancelled: { label: "Dibatalkan", variant: "destructive" },
};

const PAY_STATUS_BADGE = {
  paid: { label: "Lunas", variant: "success" },
  partially_paid: { label: "Sebagian", variant: "warning" },
  unpaid: { label: "Belum Lunas", variant: "destructive" },
};

const RX_STATUS_BADGE = {
  dispensed: { label: "Diserahkan", variant: "success" },
  pending: { label: "Menunggu", variant: "warning" },
  cancelled: { label: "Dibatalkan", variant: "destructive" },
};

const LAB_STATUS_BADGE = {
  completed: { label: "Selesai", variant: "success" },
  in_progress: { label: "Diproses", variant: "warning" },
  requested: { label: "Diminta", variant: "info" },
  cancelled: { label: "Dibatalkan", variant: "destructive" },
};

const INTEGRATION_BADGE = {
  synced: { label: "Synced", variant: "success" },
  dispatched: { label: "Dispatched", variant: "info" },
  failed: { label: "Failed", variant: "destructive" },
  local_only: { label: "Lokal", variant: "secondary" },
};

function getCurrentMonthString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getPreviousMonthString() {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

function getOffsetDateString(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return formatLocalDateInput(d);
}

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function ReportsPage() {
  const { user } = useAuth();

  // Primary report & period filters
  const [reportType, setReportType] = useState("all");
  const [periodMode, setPeriodMode] = useState("month");
  const [selectedDate, setSelectedDate] = useState(() => getLocalTodayDate());
  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentMonthString());
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [fromDate, setFromDate] = useState(() => getLocalFirstOfMonthDate());
  const [toDate, setToDate] = useState(() => getLocalTodayDate());

  // Secondary granular filters
  const [departmentId, setDepartmentId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [gender, setGender] = useState("");
  const [visitStatus, setVisitStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [modalityType, setModalityType] = useState("");

  // Reference options (best-effort; roles without master-doctors read simply keep empty options)
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Report summary state
  const [reportData, setReportData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState("");
  const [trendMetric, setTrendMetric] = useState("visits");

  // Paginated drill-down details state
  const [detailRows, setDetailRows] = useState([]);
  const [detailMeta, setDetailMeta] = useState(null);
  const [detailPage, setDetailPage] = useState(1);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Load filter reference lists once
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [deptRes, docRes] = await Promise.allSettled([
          departmentService.list({ per_page: 100 }),
          doctorService.list({ per_page: 100 }),
        ]);
        if (!active) return;
        if (deptRes.status === "fulfilled") {
          setDepartments(deptRes.value?.data || []);
        }
        if (docRes.status === "fulfilled") {
          setDoctors(docRes.value?.data || []);
        }
      } catch {
        // Ignore if role does not have read access to master reference lists
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filteredDoctors = useMemo(() => {
    if (!departmentId) return doctors;
    return doctors.filter((d) => String(d.department_id) === String(departmentId));
  }, [doctors, departmentId]);

  // Reset doctor selection if department changes and selected doctor no longer belongs to it
  useEffect(() => {
    if (doctorId && departmentId) {
      const match = doctors.find((d) => String(d.id) === String(doctorId));
      if (match && String(match.department_id) !== String(departmentId)) {
        setDoctorId("");
      }
    }
  }, [departmentId, doctorId, doctors]);

  const queryParams = useMemo(() => {
    const params = {
      report_type: reportType,
      period_mode: periodMode,
    };
    if (periodMode === "day") params.date = selectedDate;
    if (periodMode === "month") params.month = selectedMonth;
    if (periodMode === "year") params.year = selectedYear;
    if (periodMode === "range") {
      params.from = fromDate;
      params.to = toDate;
    }
    if (departmentId) params.department_id = departmentId;
    if (doctorId) params.doctor_id = doctorId;
    if (gender) params.gender = gender;
    if (visitStatus) params.visit_status = visitStatus;
    if (paymentStatus) params.payment_status = paymentStatus;
    if (paymentMethod) params.payment_method = paymentMethod;
    if (modalityType) params.modality_type = modalityType;
    return params;
  }, [
    reportType,
    periodMode,
    selectedDate,
    selectedMonth,
    selectedYear,
    fromDate,
    toDate,
    departmentId,
    doctorId,
    gender,
    visitStatus,
    paymentStatus,
    paymentMethod,
    modalityType,
  ]);

  // Reset detail pagination whenever filter parameters change
  useEffect(() => {
    setDetailPage(1);
  }, [queryParams]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setError("");
    try {
      const res = await reportService.getSummary(queryParams);
      setReportData(res?.data || null);
    } catch (err) {
      setError(err?.message || "Gagal memuat laporan SIMRS.");
    } finally {
      setSummaryLoading(false);
    }
  }, [queryParams]);

  const loadDetails = useCallback(async () => {
    setDetailsLoading(true);
    try {
      const res = await reportService.getDetails({
        ...queryParams,
        page: detailPage,
        per_page: 15,
      });
      setDetailRows(res?.data || []);
      setDetailMeta(res?.meta || null);
    } catch {
      setDetailRows([]);
      setDetailMeta(null);
    } finally {
      setDetailsLoading(false);
    }
  }, [queryParams, detailPage]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const allowedTypes = useMemo(
    () => reportData?.allowed_report_types || REPORT_TABS.map((t) => t.id),
    [reportData]
  );

  const visibleTabs = useMemo(
    () => REPORT_TABS.filter((t) => allowedTypes.includes(t.id)),
    [allowedTypes]
  );

  const canSeeVisits = allowedTypes.includes("visits");
  const canSeeFinance = allowedTypes.includes("finance");

  useEffect(() => {
    if (trendMetric === "visits" && !canSeeVisits && canSeeFinance) {
      setTrendMetric("revenue");
    } else if (trendMetric === "revenue" && !canSeeFinance && canSeeVisits) {
      setTrendMetric("visits");
    }
  }, [trendMetric, canSeeVisits, canSeeFinance]);

  const activeFilterBadges = useMemo(() => {
    const list = [];
    if (departmentId) {
      const d = departments.find((x) => String(x.id) === String(departmentId));
      list.push(`Poli: ${d?.name || `#${departmentId}`}`);
    }
    if (doctorId) {
      const doc = doctors.find((x) => String(x.id) === String(doctorId));
      list.push(`Dokter: ${doc?.full_name || `#${doctorId}`}`);
    }
    if (gender) list.push(`Gender: ${gender === "male" ? "Laki-laki" : "Perempuan"}`);
    if (visitStatus) list.push(`Status Kunjungan: ${VISIT_STATUS_BADGE[visitStatus]?.label || visitStatus}`);
    if (paymentStatus) list.push(`Status Bayar: ${PAY_STATUS_BADGE[paymentStatus]?.label || paymentStatus}`);
    if (paymentMethod) list.push(`Metode: ${paymentMethod === "cash" ? "Tunai" : "Non-Tunai"}`);
    if (modalityType) list.push(`Modalitas: ${getModalityLabel(modalityType)}`);
    return list;
  }, [departmentId, doctorId, gender, visitStatus, paymentStatus, paymentMethod, modalityType, departments, doctors]);

  const resetSecondaryFilters = () => {
    setDepartmentId("");
    setDoctorId("");
    setGender("");
    setVisitStatus("");
    setPaymentStatus("");
    setPaymentMethod("");
    setModalityType("");
  };

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 3, current - 2, current - 1, current, current + 1].map(String);
  }, []);

  const sections = reportData?.sections || {};
  const trendPoints = useMemo(() => reportData?.trend?.points || [], [reportData]);
  const maxTrendVal = useMemo(() => {
    if (!trendPoints.length) return 1;
    const vals = trendPoints.map((pt) =>
      trendMetric === "revenue" ? Number(pt.revenue_paid || 0) : Number(pt.visits || 0)
    );
    return Math.max(1, ...vals);
  }, [trendPoints, trendMetric]);

  const handleRefreshAll = () => {
    loadSummary();
    loadDetails();
  };

  const detailReportType = detailMeta?.report_type || (reportType === "all" ? "visits" : reportType);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 rounded-2xl border bg-card p-5 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default" className="gap-1">
              <FileBarChart2 className="h-3.5 w-3.5" />
              {reportData?.report_standard?.code || "SIMRS-REPORT"}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {reportData?.period?.label || "Memuat periode..."}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              {user?.role?.display_name || user?.role?.name || "User"}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {reportData?.report_standard?.title || "Modul Laporan SIMRS"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {reportData?.report_standard?.description ||
              "Pelaporan operasional dan standar pelaporan SIMRS / SIRS (RL 5.2, RL 5.4, Tindakan, Farmasi, Penunjang, dan Keuangan)."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleRefreshAll} disabled={summaryLoading}>
            <RefreshCw className={cn("h-4 w-4", summaryLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportReportToCsv(reportData, detailRows, reportType)}
            disabled={!reportData || summaryLoading}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => printSimrsReport(reportData, reportType, user, activeFilterBadges)}
            disabled={!reportData || summaryLoading}
          >
            <Printer className="h-4 w-4" />
            Cetak Laporan
          </Button>
        </div>
      </div>

      {/* Standard SIMRS Report Type Selector */}
      <div className="flex flex-wrap gap-2">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const active = reportType === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setReportType(tab.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-mono",
                  active
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {tab.code}
              </span>
            </button>
          );
        })}
      </div>

      {/* Period & Multi-Criteria Filter Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                Filter Periode &amp; Kriteria Pelaporan
              </CardTitle>
              <CardDescription>
                Pilih mode harian (day), bulanan (month), rentang tanggal, atau tahunan serta filter unit pelayanan
              </CardDescription>
            </div>
            {activeFilterBadges.length > 0 && (
              <Button variant="ghost" size="sm" onClick={resetSecondaryFilters}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset Filter Tambahan
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Period Mode + Date/Month/Range/Year Picker */}
          <div className="flex flex-col lg:flex-row lg:items-end gap-4 pb-4 border-b">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Mode Periode</Label>
              <div className="inline-flex flex-wrap rounded-lg bg-muted p-1 gap-1">
                {PERIOD_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPeriodMode(m.id)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                      periodMode === m.id
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {periodMode === "day" && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tanggal Laporan</Label>
                  <Input
                    type="date"
                    className="w-44"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedDate(getLocalTodayDate())}>
                  Hari Ini
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedDate(getOffsetDateString(-1))}>
                  Kemarin
                </Button>
              </div>
            )}

            {periodMode === "month" && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Bulan Pelaporan</Label>
                  <Input
                    type="month"
                    className="w-48"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedMonth(getCurrentMonthString())}>
                  Bulan Ini
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedMonth(getPreviousMonthString())}>
                  Bulan Lalu
                </Button>
              </div>
            )}

            {periodMode === "range" && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Dari Tanggal</Label>
                  <Input
                    type="date"
                    className="w-40"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <span className="text-xs text-muted-foreground pb-2">s/d</span>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Sampai Tanggal</Label>
                  <Input
                    type="date"
                    className="w-40"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFromDate(getOffsetDateString(-6));
                    setToDate(getLocalTodayDate());
                  }}
                >
                  7 Hari
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFromDate(getOffsetDateString(-29));
                    setToDate(getLocalTodayDate());
                  }}
                >
                  30 Hari
                </Button>
              </div>
            )}

            {periodMode === "year" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tahun Pelaporan</Label>
                <select
                  className={cn(SELECT_CLASS, "w-36")}
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      Tahun {y}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Row 2: Contextual SIMRS Filters */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            {departments.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Poliklinik</Label>
                <select
                  className={SELECT_CLASS}
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                >
                  <option value="">Semua Poliklinik</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {doctors.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Dokter</Label>
                <select
                  className={SELECT_CLASS}
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                >
                  <option value="">Semua Dokter</option>
                  {filteredDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Jenis Kelamin</Label>
              <select
                className={SELECT_CLASS}
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Semua (L &amp; P)</option>
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status Kunjungan</Label>
              <select
                className={SELECT_CLASS}
                value={visitStatus}
                onChange={(e) => setVisitStatus(e.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="registered">Terdaftar</option>
                <option value="in_progress">Diperiksa</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>

            {(reportType === "all" || reportType === "finance") && canSeeFinance && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status Bayar</Label>
                  <select
                    className={SELECT_CLASS}
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                  >
                    <option value="">Semua Status Bayar</option>
                    <option value="paid">Lunas (Paid)</option>
                    <option value="partially_paid">Dibayar Sebagian</option>
                    <option value="unpaid">Belum Lunas</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Metode Bayar</Label>
                  <select
                    className={SELECT_CLASS}
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="">Semua Metode</option>
                    <option value="cash">Tunai (Cash)</option>
                    <option value="non_cash">Non-Tunai (QRIS/Transfer/Kartu)</option>
                  </select>
                </div>
              </>
            )}

            {(reportType === "all" || reportType === "laboratory") &&
              allowedTypes.includes("laboratory") && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Modalitas Penunjang</Label>
                  <select
                    className={SELECT_CLASS}
                    value={modalityType}
                    onChange={(e) => setModalityType(e.target.value)}
                  >
                    <option value="">Semua Modalitas</option>
                    <option value="lab_clinical">Laboratorium Klinis</option>
                    <option value="ct_scan">CT-Scan</option>
                    <option value="xray">X-Ray / Radiografi</option>
                    <option value="mri">MRI</option>
                    <option value="usg">USG</option>
                    <option value="ekg">EKG</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
              )}
          </div>

          {activeFilterBadges.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs text-muted-foreground mr-1">Filter aktif:</span>
              {activeFilterBadges.map((b) => (
                <Badge key={b} variant="secondary" className="text-xs font-normal">
                  {b}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Time-Series Trend Chart */}
      {(canSeeVisits || canSeeFinance) && trendPoints.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Tren{" "}
                  {reportData?.trend?.granularity === "hour"
                    ? "Per Jam (Harian)"
                    : reportData?.trend?.granularity === "month"
                      ? "Per Bulan (Tahunan)"
                      : "Harian (Per Tanggal)"}
                </CardTitle>
                <CardDescription>
                  Distribusi {trendMetric === "revenue" ? "pendapatan diterima" : "jumlah kunjungan"} pada periode{" "}
                  {reportData?.period?.label}
                </CardDescription>
              </div>
              {canSeeVisits && canSeeFinance && (
                <div className="inline-flex rounded-lg bg-muted p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setTrendMetric("visits")}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                      trendMetric === "visits"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Kunjungan
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendMetric("revenue")}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                      trendMetric === "revenue"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Pendapatan
                  </button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto pb-2">
              <div className="flex items-end gap-1.5 min-w-[520px] h-44 pt-4">
                {trendPoints.map((pt) => {
                  const val =
                    trendMetric === "revenue"
                      ? Number(pt.revenue_paid || 0)
                      : Number(pt.visits || 0);
                  const pct = val > 0 ? Math.max(8, Math.round((val / maxTrendVal) * 100)) : 2;
                  const tooltip =
                    trendMetric === "revenue"
                      ? `${pt.bucket}: ${formatCurrency(val)}`
                      : `${pt.bucket}: ${val} kunjungan (${pt.completed_visits || 0} selesai)`;
                  return (
                    <div
                      key={pt.bucket}
                      title={tooltip}
                      className="flex-1 min-w-[20px] flex flex-col items-center justify-end h-full gap-1 group"
                    >
                      <span className="text-[10px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity truncate max-w-full">
                        {trendMetric === "revenue"
                          ? val > 0
                            ? `${Math.round(val / 1000)}k`
                            : ""
                          : val > 0
                            ? val
                            : ""}
                      </span>
                      <div className="w-full flex-1 flex items-end">
                        <div
                          className={cn(
                            "w-full rounded-t-md transition-all",
                            val > 0
                              ? trendMetric === "revenue"
                                ? "bg-emerald-500/80 group-hover:bg-emerald-500"
                                : "bg-primary/80 group-hover:bg-primary"
                              : "bg-muted"
                          )}
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground truncate">
                        {pt.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================================================================== */}
      {/* SECTION: LAPORAN KESELURUHAN (SIMRS-ALL)                             */}
      {/* ==================================================================== */}
      {reportType === "all" && (
        <div className="space-y-6">
          {/* Executive KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sections.visits && (
              <KpiCard
                title="Total Kunjungan (RL 5.2)"
                icon={<Activity className="h-4 w-4 text-blue-600" />}
                loading={summaryLoading}
                value={sections.visits.summary?.total_visits ?? 0}
                sub={`Baru: ${sections.visits.summary?.new_patient_visits ?? 0} • Lama: ${sections.visits.summary?.returning_patient_visits ?? 0} • Selesai: ${sections.visits.summary?.completed ?? 0}`}
              />
            )}
            {sections.morbidity && (
              <KpiCard
                title="Rekam Medis & Diagnosis (RL 5.4)"
                icon={<Stethoscope className="h-4 w-4 text-rose-600" />}
                loading={summaryLoading}
                value={sections.morbidity.summary?.total_examined_visits ?? 0}
                sub={
                  sections.morbidity.top_diagnoses?.[0]
                    ? `Terbanyak: ${sections.morbidity.top_diagnoses[0].diagnosis} (${sections.morbidity.top_diagnoses[0].total_cases})`
                    : `${sections.morbidity.summary?.unique_diagnoses ?? 0} jenis diagnosis`
                }
              />
            )}
            {sections.procedures && (
              <KpiCard
                title="Tindakan Medis"
                icon={<ClipboardList className="h-4 w-4 text-violet-600" />}
                loading={summaryLoading}
                value={sections.procedures.summary?.active_count ?? 0}
                sub={`Total Qty: ${sections.procedures.summary?.total_quantity ?? 0} • Nilai: ${formatCurrency(sections.procedures.summary?.total_revenue)}`}
              />
            )}
            {sections.pharmacy && (
              <KpiCard
                title="Farmasi & Obat (RL 3.13)"
                icon={<Pill className="h-4 w-4 text-amber-600" />}
                loading={summaryLoading}
                value={`${sections.pharmacy.summary?.total_dispensed_units ?? 0} unit`}
                sub={`Resep selesai: ${sections.pharmacy.summary?.dispensed_prescriptions ?? 0}/${sections.pharmacy.summary?.total_prescriptions ?? 0} • Stok menipis: ${sections.pharmacy.summary?.low_stock_medicine_count ?? 0}`}
              />
            )}
            {sections.laboratory && (
              <KpiCard
                title="Lab & Penunjang (RL 3.8)"
                icon={<FlaskConical className="h-4 w-4 text-cyan-600" />}
                loading={summaryLoading}
                value={sections.laboratory.summary?.total_orders ?? 0}
                sub={`Selesai: ${sections.laboratory.summary?.completed ?? 0} • Synced eksternal: ${sections.laboratory.summary?.integration_synced ?? 0}`}
              />
            )}
            {sections.finance && (
              <KpiCard
                title="Pendapatan Diterima"
                icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
                loading={summaryLoading}
                value={formatCurrency(sections.finance.summary?.total_paid)}
                valueClassName="text-emerald-600"
                sub={`Tagihan: ${formatCurrency(sections.finance.summary?.total_billed)} • Collection: ${sections.finance.summary?.collection_rate ?? 0}%`}
              />
            )}
          </div>

          {/* Executive Breakdown Grid */}
          <div className="grid gap-6 lg:grid-cols-12">
            {sections.visits && (
              <Card className="lg:col-span-6">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Kunjungan per Poliklinik (RL 5.2)</CardTitle>
                    <CardDescription>Distribusi pasien baru &amp; lama per unit layanan</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setReportType("visits")}>
                    Detail →
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(sections.visits.by_department || []).length === 0 ? (
                    <EmptyState text="Belum ada data poliklinik pada periode ini." />
                  ) : (
                    (() => {
                      const maxV = Math.max(
                        1,
                        ...sections.visits.by_department.map((d) => d.total_visits || 0)
                      );
                      return sections.visits.by_department.map((d) => {
                        const pct = Math.round(((d.total_visits || 0) / maxV) * 100);
                        return (
                          <div key={d.department_id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium">{d.name}</span>
                              <span className="font-mono">
                                <strong>{d.total_visits}</strong>{" "}
                                <span className="text-muted-foreground">
                                  (Baru: {d.new_patients}, Lama: {d.returning_patients})
                                </span>
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${Math.max(d.total_visits > 0 ? 5 : 0, pct)}%` }}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                </CardContent>
              </Card>
            )}

            {sections.morbidity && (
              <Card className="lg:col-span-6">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Top Penyakit Rawat Jalan (RL 5.4)</CardTitle>
                    <CardDescription>Ringkasan diagnosis utama terbanyak</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setReportType("morbidity")}>
                    Detail →
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Diagnosis Utama</TableHead>
                        <TableHead className="text-right">Kasus</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(sections.morbidity.top_diagnoses || []).slice(0, 5).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                            Belum ada data diagnosis pada periode ini.
                          </TableCell>
                        </TableRow>
                      ) : (
                        sections.morbidity.top_diagnoses.slice(0, 5).map((d) => (
                          <TableRow key={d.diagnosis}>
                            <TableCell className="font-mono text-xs">{d.rank}</TableCell>
                            <TableCell className="font-medium text-sm">{d.diagnosis}</TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              {d.total_cases}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                              {d.percentage}%
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {sections.finance && (
              <Card className="lg:col-span-6">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Ringkasan Keuangan per Komponen</CardTitle>
                    <CardDescription>
                      Piutang tersisa: {formatCurrency(sections.finance.summary?.total_outstanding)}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setReportType("finance")}>
                    Detail →
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Komponen Layanan</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Total Tagihan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(sections.finance.by_component || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                            Belum ada tagihan pada periode ini.
                          </TableCell>
                        </TableRow>
                      ) : (
                        sections.finance.by_component.map((c) => (
                          <TableRow key={c.item_type}>
                            <TableCell className="font-medium text-sm">
                              {getItemTypeLabel(c.item_type)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {c.total_quantity}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold text-sm">
                              {formatCurrency(c.total_amount)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {sections.pharmacy && (
              <Card className="lg:col-span-6">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Top Pemakaian Obat (Farmasi)</CardTitle>
                    <CardDescription>
                      Nilai pemakaian: {formatCurrency(sections.pharmacy.summary?.total_dispensed_value)}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setReportType("pharmacy")}>
                    Detail →
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Obat</TableHead>
                        <TableHead className="text-right">Keluar</TableHead>
                        <TableHead className="text-right">Sisa Stok</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(sections.pharmacy.medicine_usage || []).slice(0, 5).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                            Belum ada obat diserahkan pada periode ini.
                          </TableCell>
                        </TableRow>
                      ) : (
                        sections.pharmacy.medicine_usage.slice(0, 5).map((m) => (
                          <TableRow key={m.medicine_id}>
                            <TableCell className="font-medium text-sm">
                              {m.name}{" "}
                              <span className="font-mono text-xs text-muted-foreground">
                                ({m.code})
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-semibold">
                              {m.dispensed_qty} {m.unit}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              <Badge variant={m.is_low_stock ? "destructive" : "secondary"}>
                                {m.current_stock} {m.unit}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION: RL 5.2 KUNJUNGAN RAWAT JALAN                                */}
      {/* ==================================================================== */}
      {reportType === "visits" && sections.visits && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Total Kunjungan"
              icon={<Activity className="h-4 w-4 text-blue-600" />}
              loading={summaryLoading}
              value={sections.visits.summary?.total_visits ?? 0}
              sub={`Pasien unik: ${sections.visits.summary?.unique_patients ?? 0}`}
            />
            <KpiCard
              title="Pasien Baru vs Lama"
              icon={<Users className="h-4 w-4 text-indigo-600" />}
              loading={summaryLoading}
              value={`${sections.visits.summary?.new_patient_visits ?? 0} / ${sections.visits.summary?.returning_patient_visits ?? 0}`}
              sub="Kunjungan pertama vs kunjungan ulang"
            />
            <KpiCard
              title="Jenis Kelamin (L / P)"
              icon={<Users className="h-4 w-4 text-teal-600" />}
              loading={summaryLoading}
              value={`${sections.visits.summary?.male_visits ?? 0} L / ${sections.visits.summary?.female_visits ?? 0} P`}
              sub="Distribusi demografi pasien"
            />
            <KpiCard
              title="Status Penyelesaian"
              icon={<ClipboardList className="h-4 w-4 text-emerald-600" />}
              loading={summaryLoading}
              value={sections.visits.summary?.completed ?? 0}
              sub={`Aktif: ${(sections.visits.summary?.registered ?? 0) + (sections.visits.summary?.in_progress ?? 0)} • Batal: ${sections.visits.summary?.cancelled ?? 0}`}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-8">
              <CardHeader>
                <CardTitle className="text-base">Rekapitulasi RL 5.2 per Poliklinik</CardTitle>
                <CardDescription>Jumlah kunjungan baru, lama, jenis kelamin, dan status per poliklinik</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Poliklinik</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Baru</TableHead>
                      <TableHead className="text-right">Lama</TableHead>
                      <TableHead className="text-right">L</TableHead>
                      <TableHead className="text-right">P</TableHead>
                      <TableHead className="text-right">Selesai</TableHead>
                      <TableHead className="text-right">Batal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sections.visits.by_department || []).map((d) => (
                      <TableRow key={d.department_id}>
                        <TableCell className="font-medium">
                          {d.name}{" "}
                          <span className="font-mono text-xs text-muted-foreground">({d.code})</span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">{d.total_visits}</TableCell>
                        <TableCell className="text-right font-mono">{d.new_patients}</TableCell>
                        <TableCell className="text-right font-mono">{d.returning_patients}</TableCell>
                        <TableCell className="text-right font-mono">{d.male_count}</TableCell>
                        <TableCell className="text-right font-mono">{d.female_count}</TableCell>
                        <TableCell className="text-right font-mono text-emerald-600">{d.completed_visits}</TableCell>
                        <TableCell className="text-right font-mono text-destructive">{d.cancelled_visits}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle className="text-base">Kelompok Umur (Standar SIMRS)</CardTitle>
                <CardDescription>Distribusi usia pasien saat kunjungan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const groups = sections.visits.age_groups || [];
                  const maxAge = Math.max(1, ...groups.map((g) => g.count || 0));
                  return groups.map((g) => {
                    const pct = Math.round(((g.count || 0) / maxAge) * 100);
                    return (
                      <div key={g.key} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{g.label}</span>
                          <span className="font-mono font-semibold">{g.count}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${Math.max(g.count > 0 ? 6 : 0, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Beban Kunjungan per Dokter</CardTitle>
              <CardDescription>Volume pelayanan rawat jalan per dokter pemeriksa</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dokter</TableHead>
                    <TableHead>Poliklinik</TableHead>
                    <TableHead className="text-right">Total Kunjungan</TableHead>
                    <TableHead className="text-right">Selesai</TableHead>
                    <TableHead className="text-right">Dibatalkan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(sections.visits.by_doctor || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        Belum ada data kunjungan dokter pada periode ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sections.visits.by_doctor.map((doc) => (
                      <TableRow key={`${doc.doctor_id}-${doc.department_name}`}>
                        <TableCell className="font-medium">
                          {doc.doctor_name}
                          {doc.specialization && (
                            <span className="block text-xs text-muted-foreground">
                              {doc.specialization}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{doc.department_name}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{doc.total_visits}</TableCell>
                        <TableCell className="text-right font-mono text-emerald-600">{doc.completed_visits}</TableCell>
                        <TableCell className="text-right font-mono text-destructive">{doc.cancelled_visits}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION: RL 5.4 — 10 BESAR PENYAKIT RAWAT JALAN                      */}
      {/* ==================================================================== */}
      {reportType === "morbidity" && sections.morbidity && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <KpiCard
              title="Total Rekam Medis Terdiagnosis"
              icon={<Stethoscope className="h-4 w-4 text-rose-600" />}
              loading={summaryLoading}
              value={sections.morbidity.summary?.total_examined_visits ?? 0}
              sub="Jumlah pemeriksaan dengan diagnosis utama tercatat"
            />
            <KpiCard
              title="Variasi Diagnosis Unik"
              icon={<FileBarChart2 className="h-4 w-4 text-violet-600" />}
              loading={summaryLoading}
              value={sections.morbidity.summary?.unique_diagnoses ?? 0}
              sub="Jumlah jenis penyakit berbeda pada periode terpilih"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">RL 5.4 — Daftar 10 Besar Penyakit Rawat Jalan</CardTitle>
              <CardDescription>
                Diurutkan berdasarkan jumlah kasus terbanyak lengkap dengan distribusi kasus baru/lama dan jenis kelamin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">Rank</TableHead>
                    <TableHead>Diagnosis Utama</TableHead>
                    <TableHead className="text-right">Baru</TableHead>
                    <TableHead className="text-right">Lama</TableHead>
                    <TableHead className="text-right">L</TableHead>
                    <TableHead className="text-right">P</TableHead>
                    <TableHead className="text-right">Total Kasus</TableHead>
                    <TableHead className="w-40">Proporsi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(sections.morbidity.top_diagnoses || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Belum ada data morbiditas / diagnosis pada periode ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sections.morbidity.top_diagnoses.map((d) => (
                      <TableRow key={d.diagnosis}>
                        <TableCell>
                          <Badge variant={d.rank <= 3 ? "default" : "secondary"} className="font-mono">
                            #{d.rank}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{d.diagnosis}</TableCell>
                        <TableCell className="text-right font-mono">{d.new_cases}</TableCell>
                        <TableCell className="text-right font-mono">{d.returning_cases}</TableCell>
                        <TableCell className="text-right font-mono">{d.male_cases}</TableCell>
                        <TableCell className="text-right font-mono">{d.female_cases}</TableCell>
                        <TableCell className="text-right font-mono font-bold">{d.total_cases}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-rose-500"
                                style={{ width: `${Math.min(100, Math.max(4, d.percentage))}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs w-11 text-right">{d.percentage}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION: TINDAKAN MEDIS                                              */}
      {/* ==================================================================== */}
      {reportType === "procedures" && sections.procedures && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              title="Total Tindakan Aktif"
              icon={<ClipboardList className="h-4 w-4 text-violet-600" />}
              loading={summaryLoading}
              value={sections.procedures.summary?.active_count ?? 0}
              sub={`Dibatalkan: ${sections.procedures.summary?.cancelled_count ?? 0}`}
            />
            <KpiCard
              title="Total Kuantitas Tindakan"
              icon={<Activity className="h-4 w-4 text-blue-600" />}
              loading={summaryLoading}
              value={sections.procedures.summary?.total_quantity ?? 0}
              sub="Akumulasi qty seluruh tindakan aktif"
            />
            <KpiCard
              title="Total Nilai Tarif Tindakan"
              icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
              loading={summaryLoading}
              value={formatCurrency(sections.procedures.summary?.total_revenue)}
              valueClassName="text-emerald-600"
              sub="Berdasarkan snapshot tarif saat tindakan dilakukan"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle className="text-base">Rekap per Kategori</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(sections.procedures.by_category || []).length === 0 ? (
                  <EmptyState text="Belum ada tindakan medis pada periode ini." />
                ) : (
                  sections.procedures.by_category.map((c) => (
                    <div key={c.category} className="flex items-center justify-between rounded-xl border p-3">
                      <div>
                        <div className="text-sm font-medium capitalize">{c.category}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.procedure_count} entri • {c.total_quantity} qty
                        </div>
                      </div>
                      <span className="font-mono font-semibold text-sm">
                        {formatCurrency(c.total_revenue)}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-8">
              <CardHeader>
                <CardTitle className="text-base">Top Tindakan Medis Rawat Jalan</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead>Nama Tindakan</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Total Tarif</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sections.procedures.top_procedures || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                          Belum ada data tindakan medis pada periode ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sections.procedures.top_procedures.map((p) => (
                        <TableRow key={p.procedure_id}>
                          <TableCell className="font-mono text-xs">{p.code}</TableCell>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{p.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{p.total_quantity}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatCurrency(p.total_revenue)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION: FARMASI & PEMAKAIAN OBAT (RL 3.13)                          */}
      {/* ==================================================================== */}
      {reportType === "pharmacy" && sections.pharmacy && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Total Resep"
              icon={<Pill className="h-4 w-4 text-amber-600" />}
              loading={summaryLoading}
              value={sections.pharmacy.summary?.total_prescriptions ?? 0}
              sub={`Diserahkan: ${sections.pharmacy.summary?.dispensed_prescriptions ?? 0} • Pending: ${sections.pharmacy.summary?.pending_prescriptions ?? 0}`}
            />
            <KpiCard
              title="Unit Obat Diserahkan"
              icon={<Activity className="h-4 w-4 text-blue-600" />}
              loading={summaryLoading}
              value={sections.pharmacy.summary?.total_dispensed_units ?? 0}
              sub={`Restock periode: +${sections.pharmacy.summary?.restocked_units_in_period ?? 0}`}
            />
            <KpiCard
              title="Nilai Pemakaian Obat"
              icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
              loading={summaryLoading}
              value={formatCurrency(sections.pharmacy.summary?.total_dispensed_value)}
              valueClassName="text-emerald-600"
              sub="Berdasarkan harga snapshot resep"
            />
            <KpiCard
              title="Peringatan Stok Menipis"
              icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
              loading={summaryLoading}
              value={sections.pharmacy.summary?.low_stock_medicine_count ?? 0}
              valueClassName={
                (sections.pharmacy.summary?.low_stock_medicine_count ?? 0) > 0
                  ? "text-destructive"
                  : ""
              }
              sub="Item obat aktif dengan stok ≤ min_stock"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-8">
              <CardHeader>
                <CardTitle className="text-base">Rekapitulasi Pemakaian Obat (Dispensed)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead>Nama Obat</TableHead>
                      <TableHead className="text-right">Jml Resep</TableHead>
                      <TableHead className="text-right">Diserahkan</TableHead>
                      <TableHead className="text-right">Nilai</TableHead>
                      <TableHead className="text-right">Sisa Stok</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sections.pharmacy.medicine_usage || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                          Belum ada penyerahan obat pada periode ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sections.pharmacy.medicine_usage.map((m) => (
                        <TableRow key={m.medicine_id}>
                          <TableCell className="font-mono text-xs">{m.code}</TableCell>
                          <TableCell className="font-medium">{m.name}</TableCell>
                          <TableCell className="text-right font-mono">{m.prescription_count}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {m.dispensed_qty} {m.unit}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(m.dispensed_value)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={m.is_low_stock ? "destructive" : "secondary"} className="font-mono">
                              {m.current_stock} / min {m.min_stock}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Daftar Stok Menipis
                </CardTitle>
                <CardDescription>Rekomendasi pengadaan / restock segera</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {(sections.pharmacy.low_stock_medicines || []).length === 0 ? (
                  <EmptyState text="Seluruh stok obat aktif berada di atas batas minimum." />
                ) : (
                  sections.pharmacy.low_stock_medicines.map((m) => (
                    <div key={m.medicine_id} className="flex items-center justify-between rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{m.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{m.code}</div>
                      </div>
                      <Badge variant="destructive" className="font-mono shrink-0">
                        {m.stock} {m.unit}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION: LABORATORIUM & PENUNJANG DIAGNOSTIK (RL 3.8)                */}
      {/* ==================================================================== */}
      {reportType === "laboratory" && sections.laboratory && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Total Order Penunjang"
              icon={<FlaskConical className="h-4 w-4 text-cyan-600" />}
              loading={summaryLoading}
              value={sections.laboratory.summary?.total_orders ?? 0}
              sub={`Diminta: ${sections.laboratory.summary?.requested ?? 0} • Proses: ${sections.laboratory.summary?.in_progress ?? 0}`}
            />
            <KpiCard
              title="Hasil Selesai"
              icon={<ClipboardList className="h-4 w-4 text-emerald-600" />}
              loading={summaryLoading}
              value={sections.laboratory.summary?.completed ?? 0}
              sub={`Dibatalkan: ${sections.laboratory.summary?.cancelled ?? 0}`}
            />
            <KpiCard
              title="Integrasi Eksternal"
              icon={<Activity className="h-4 w-4 text-indigo-600" />}
              loading={summaryLoading}
              value={sections.laboratory.summary?.integration_synced ?? 0}
              sub={`Dispatched: ${sections.laboratory.summary?.integration_dispatched ?? 0} • Failed: ${sections.laboratory.summary?.integration_failed ?? 0}`}
            />
            <KpiCard
              title="Total Tarif Penunjang"
              icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
              loading={summaryLoading}
              value={formatCurrency(sections.laboratory.summary?.total_tariff)}
              valueClassName="text-emerald-600"
              sub="Order aktif / non-batal"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-5">
              <CardHeader>
                <CardTitle className="text-base">Rekap per Modalitas</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Modalitas</TableHead>
                      <TableHead className="text-right">Order</TableHead>
                      <TableHead className="text-right">Selesai</TableHead>
                      <TableHead className="text-right">Synced</TableHead>
                      <TableHead className="text-right">Tarif</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sections.laboratory.by_modality || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                          Belum ada order penunjang pada periode ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sections.laboratory.by_modality.map((m) => (
                        <TableRow key={m.modality_type}>
                          <TableCell className="font-medium">{getModalityLabel(m.modality_type)}</TableCell>
                          <TableCell className="text-right font-mono">{m.total_orders}</TableCell>
                          <TableCell className="text-right font-mono text-emerald-600">{m.completed_orders}</TableCell>
                          <TableCell className="text-right font-mono text-indigo-600">{m.synced_orders}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatCurrency(m.total_tariff)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="lg:col-span-7">
              <CardHeader>
                <CardTitle className="text-base">Jenis Pemeriksaan Terbanyak</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Pemeriksaan</TableHead>
                      <TableHead>Modalitas</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Selesai</TableHead>
                      <TableHead className="text-right">Total Tarif</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sections.laboratory.top_tests || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                          Belum ada data pemeriksaan pada periode ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sections.laboratory.top_tests.map((t) => (
                        <TableRow key={`${t.test_name}-${t.modality_type}`}>
                          <TableCell className="font-medium">{t.test_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{getModalityLabel(t.modality_type)}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{t.total_orders}</TableCell>
                          <TableCell className="text-right font-mono text-emerald-600">{t.completed_orders}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatCurrency(t.total_tariff)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION: KEUANGAN, BILLING & KASIR                                   */}
      {/* ==================================================================== */}
      {reportType === "finance" && sections.finance && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Total Tagihan Diterbitkan"
              icon={<CreditCard className="h-4 w-4 text-blue-600" />}
              loading={summaryLoading}
              value={formatCurrency(sections.finance.summary?.total_billed)}
              sub={`${sections.finance.summary?.total_invoices ?? 0} invoice aktif`}
            />
            <KpiCard
              title="Pendapatan Diterima"
              icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
              loading={summaryLoading}
              value={formatCurrency(sections.finance.summary?.total_paid)}
              valueClassName="text-emerald-600"
              sub={`Collection rate: ${sections.finance.summary?.collection_rate ?? 0}% (${sections.finance.summary?.paid_count ?? 0} lunas)`}
            />
            <KpiCard
              title="Sisa Piutang (Outstanding)"
              icon={<AlertCircle className="h-4 w-4 text-amber-600" />}
              loading={summaryLoading}
              value={formatCurrency(sections.finance.summary?.total_outstanding)}
              valueClassName={
                (sections.finance.summary?.total_outstanding ?? 0) > 0 ? "text-amber-600" : ""
              }
              sub={`Belum lunas: ${sections.finance.summary?.unpaid_count ?? 0} • Sebagian: ${sections.finance.summary?.partially_paid_count ?? 0}`}
            />
            <KpiCard
              title="Tunai vs Non-Tunai"
              icon={<CreditCard className="h-4 w-4 text-violet-600" />}
              loading={summaryLoading}
              value={formatCurrency(sections.finance.summary?.cash_total)}
              sub={`Non-Tunai: ${formatCurrency(sections.finance.summary?.non_cash_total)} (${sections.finance.summary?.payment_transaction_count ?? 0} trx)`}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-6">
              <CardHeader>
                <CardTitle className="text-base">Pendapatan per Komponen Layanan</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Komponen</TableHead>
                      <TableHead className="text-right">Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Total Nominal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sections.finance.by_component || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                          Belum ada komponen billing pada periode ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sections.finance.by_component.map((c) => (
                        <TableRow key={c.item_type}>
                          <TableCell className="font-medium">{getItemTypeLabel(c.item_type)}</TableCell>
                          <TableCell className="text-right font-mono">{c.item_count}</TableCell>
                          <TableCell className="text-right font-mono">{c.total_quantity}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatCurrency(c.total_amount)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="lg:col-span-6">
              <CardHeader>
                <CardTitle className="text-base">Penerimaan per Metode &amp; Channel Pembayaran</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metode</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead className="text-right">Transaksi</TableHead>
                      <TableHead className="text-right">Total Diterima</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sections.finance.by_payment_method || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                          Belum ada transaksi pembayaran pada periode ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sections.finance.by_payment_method.map((pm) => (
                        <TableRow key={`${pm.payment_method}-${pm.payment_channel}`}>
                          <TableCell>
                            <Badge variant={pm.payment_method === "cash" ? "secondary" : "info"}>
                              {pm.payment_method === "cash" ? "Tunai" : "Non-Tunai"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{pm.payment_channel}</TableCell>
                          <TableCell className="text-right font-mono">{pm.transaction_count}</TableCell>
                          <TableCell className="text-right font-mono font-semibold text-emerald-600">
                            {formatCurrency(pm.total_amount)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rekapitulasi Keuangan per Poliklinik</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Poliklinik</TableHead>
                    <TableHead className="text-right">Invoice</TableHead>
                    <TableHead className="text-right">Total Tagihan</TableHead>
                    <TableHead className="text-right">Diterima</TableHead>
                    <TableHead className="text-right">Sisa Piutang</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(sections.finance.by_department || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        Belum ada tagihan per poliklinik pada periode ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sections.finance.by_department.map((d) => (
                      <TableRow key={d.department_id}>
                        <TableCell className="font-medium">
                          {d.name}{" "}
                          <span className="font-mono text-xs text-muted-foreground">({d.code})</span>
                        </TableCell>
                        <TableCell className="text-right font-mono">{d.invoice_count}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(d.total_billed)}</TableCell>
                        <TableCell className="text-right font-mono text-emerald-600 font-semibold">
                          {formatCurrency(d.total_paid)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-amber-600">
                          {formatCurrency(d.total_outstanding)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PAGINATED DRILL-DOWN DETAIL TABLE                                    */}
      {/* ==================================================================== */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              Rincian Data Operasional ({REPORT_TABS.find((t) => t.id === detailReportType)?.label || detailReportType})
            </CardTitle>
            <CardDescription>
              Menampilkan data transaksi terpaginasi sesuai filter periode dan kriteria aktif
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono w-fit">
            Total: {detailMeta?.total ?? 0} baris
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {detailsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : (
            <DetailTable reportType={detailReportType} rows={detailRows} />
          )}

          {detailMeta && detailMeta.total_pages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
              <span>
                Halaman {detailMeta.page} dari {detailMeta.total_pages} ({detailMeta.total} total data)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={detailPage <= 1 || detailsLoading}
                  onClick={() => setDetailPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" /> Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={detailPage >= detailMeta.total_pages || detailsLoading}
                  onClick={() => setDetailPage((p) => p + 1)}
                >
                  Berikutnya <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ title, icon, loading, value, sub, valueClassName = "" }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className={cn("text-2xl font-bold", valueClassName)}>{value}</div>
        )}
        {sub && <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }) {
  return <p className="text-sm text-muted-foreground text-center py-6">{text}</p>;
}

function DetailTable({ reportType, rows }) {
  if (!rows || rows.length === 0) {
    return <EmptyState text="Tidak ada rincian data untuk filter periode ini." />;
  }

  if (reportType === "visits") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No. Kunjungan</TableHead>
            <TableHead>Tanggal</TableHead>
            <TableHead>Pasien</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Poliklinik</TableHead>
            <TableHead>Dokter</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const st = VISIT_STATUS_BADGE[r.status] || { label: r.status, variant: "secondary" };
            return (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs font-semibold">{r.visit_number}</TableCell>
                <TableCell className="text-xs">{formatDate(r.visit_date)}</TableCell>
                <TableCell>
                  <div className="font-medium text-sm">{r.patient_name}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {r.medical_record_number} • {r.gender === "male" ? "L" : "P"} • {r.patient_age ?? "-"} th
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={r.visit_category === "baru" ? "info" : "outline"} className="capitalize">
                    Pasien {r.visit_category}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{r.department_name}</TableCell>
                <TableCell className="text-sm">{r.doctor_name}</TableCell>
                <TableCell>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  }

  if (reportType === "morbidity") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead>No. Kunjungan</TableHead>
            <TableHead>Pasien</TableHead>
            <TableHead>Poliklinik / Dokter</TableHead>
            <TableHead>Diagnosis Utama</TableHead>
            <TableHead>Diagnosis Sekunder</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-xs">{formatDate(r.visit_date)}</TableCell>
              <TableCell className="font-mono text-xs">{r.visit_number}</TableCell>
              <TableCell>
                <div className="font-medium text-sm">{r.patient_name}</div>
                <div className="font-mono text-xs text-muted-foreground">
                  {r.medical_record_number} • {r.gender === "male" ? "L" : "P"}
                </div>
              </TableCell>
              <TableCell className="text-xs">
                <div className="font-medium">{r.department_name}</div>
                <div className="text-muted-foreground">{r.doctor_name}</div>
              </TableCell>
              <TableCell className="font-medium text-sm">{r.primary_diagnosis}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{r.secondary_diagnoses || "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (reportType === "procedures") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead>No. Kunjungan</TableHead>
            <TableHead>Pasien</TableHead>
            <TableHead>Tindakan</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Subtotal</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-xs">{formatDate(r.visit_date)}</TableCell>
              <TableCell className="font-mono text-xs">{r.visit_number}</TableCell>
              <TableCell>
                <div className="font-medium text-sm">{r.patient_name}</div>
                <div className="font-mono text-xs text-muted-foreground">{r.medical_record_number}</div>
              </TableCell>
              <TableCell>
                <div className="font-medium text-sm">{r.procedure_name}</div>
                <div className="font-mono text-xs text-muted-foreground">{r.procedure_code} • {r.category}</div>
              </TableCell>
              <TableCell className="text-right font-mono">{r.quantity}</TableCell>
              <TableCell className="text-right font-mono font-semibold">{formatCurrency(r.line_total)}</TableCell>
              <TableCell>
                <Badge variant={r.status === "active" ? "success" : "destructive"}>
                  {r.status === "active" ? "Aktif" : "Batal"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (reportType === "pharmacy") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No. Resep</TableHead>
            <TableHead>Tanggal</TableHead>
            <TableHead>Pasien</TableHead>
            <TableHead>Dokter / Poli</TableHead>
            <TableHead className="text-right">Item / Unit</TableHead>
            <TableHead className="text-right">Nilai</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const st = RX_STATUS_BADGE[r.status] || { label: r.status, variant: "secondary" };
            return (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs font-semibold">{r.prescription_number}</TableCell>
                <TableCell className="text-xs">{formatDate(r.visit_date)}</TableCell>
                <TableCell>
                  <div className="font-medium text-sm">{r.patient_name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{r.medical_record_number}</div>
                </TableCell>
                <TableCell className="text-xs">
                  <div className="font-medium">{r.doctor_name}</div>
                  <div className="text-muted-foreground">{r.department_name}</div>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {r.item_count} item / {r.total_units} unit
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatCurrency(r.total_value)}</TableCell>
                <TableCell>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  }

  if (reportType === "laboratory") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No. Order</TableHead>
            <TableHead>Tanggal</TableHead>
            <TableHead>Pasien</TableHead>
            <TableHead>Pemeriksaan / Modalitas</TableHead>
            <TableHead className="text-right">Tarif</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Integrasi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const st = LAB_STATUS_BADGE[r.status] || { label: r.status, variant: "secondary" };
            const integ = INTEGRATION_BADGE[r.integration_status] || { label: r.integration_status, variant: "secondary" };
            return (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs font-semibold">{r.order_number}</TableCell>
                <TableCell className="text-xs">{formatDate(r.visit_date)}</TableCell>
                <TableCell>
                  <div className="font-medium text-sm">{r.patient_name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{r.medical_record_number}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-sm">{r.test_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {getModalityLabel(r.modality_type)}
                    {r.body_part ? ` • ${r.body_part}` : ""}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {formatCurrency(r.tariff_snapshot)}
                </TableCell>
                <TableCell>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={integ.variant}>{integ.label}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  }

  // Finance details
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>No. Invoice</TableHead>
          <TableHead>Tanggal</TableHead>
          <TableHead>Pasien</TableHead>
          <TableHead>Poliklinik</TableHead>
          <TableHead className="text-right">Tagihan</TableHead>
          <TableHead className="text-right">Dibayar</TableHead>
          <TableHead className="text-right">Sisa</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const st = PAY_STATUS_BADGE[r.payment_status] || { label: r.payment_status, variant: "secondary" };
          return (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs font-semibold">
                {r.invoice_number}
                {Number(r.revision_number) > 1 && (
                  <span className="ml-1 text-[10px] text-muted-foreground">(Rev #{r.revision_number})</span>
                )}
              </TableCell>
              <TableCell className="text-xs">{formatDateTime(r.issued_at)}</TableCell>
              <TableCell>
                <div className="font-medium text-sm">{r.patient_name}</div>
                <div className="font-mono text-xs text-muted-foreground">{r.medical_record_number}</div>
              </TableCell>
              <TableCell className="text-sm">{r.department_name}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(r.total_amount)}</TableCell>
              <TableCell className="text-right font-mono text-emerald-600 font-semibold">
                {formatCurrency(r.paid_amount)}
              </TableCell>
              <TableCell className="text-right font-mono text-amber-600">
                {formatCurrency(r.balance_amount)}
              </TableCell>
              <TableCell>
                <Badge variant={st.variant}>{st.label}</Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
