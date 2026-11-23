import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Cpu,
  DownloadCloud,
  FlaskConical,
  Info,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency, formatDateTime } from "../../lib/utils";
import { procedureService } from "../../services/master.service";
import {
  labGatewayService,
  labOrderService,
  visitService,
} from "../../services/outpatient.service";

const MODALITY_OPTIONS = [
  { value: "lab_clinical", label: "Lab Klinis (LIS)" },
  { value: "ct_scan", label: "CT-Scan (Eksternal)" },
  { value: "xray", label: "X-Ray / Rontgen" },
  { value: "mri", label: "MRI" },
  { value: "usg", label: "USG" },
  { value: "ekg", label: "EKG" },
];

const IMAGING_MODALITIES = new Set(["ct_scan", "xray", "mri", "usg"]);

function inferModalityFromProcedure(proc) {
  if (!proc) return "lab_clinical";
  const hay = `${proc.code || ""} ${proc.name || ""}`.toLowerCase();
  if (hay.includes("ct-scan") || hay.includes("ct scan") || hay.includes("rad-ct")) return "ct_scan";
  if (hay.includes("x-ray") || hay.includes("xray") || hay.includes("rontgen")) return "xray";
  if (hay.includes("mri")) return "mri";
  if (hay.includes("usg") || hay.includes("ultrasound")) return "usg";
  if (hay.includes("ekg") || hay.includes("ecg")) return "ekg";
  return "lab_clinical";
}

function getIntegrationBadgeVariant(integrationStatus) {
  if (integrationStatus === "synced") return "success";
  if (integrationStatus === "dispatched") return "default";
  if (integrationStatus === "failed") return "destructive";
  return "secondary";
}

export default function LaboratoryPage() {
  const { user, hasPermission } = useAuth();
  const canCreate = hasPermission("laboratory", "create");
  const canUpdate = hasPermission("laboratory", "update");

  const [orders, setOrders] = useState([]);
  const [modalities, setModalities] = useState([]);
  const [gatewayOnline, setGatewayOnline] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [modalityFilter, setModalityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Create Lab / Modality Order Modal
  const [createModal, setCreateModal] = useState(false);
  const [visits, setVisits] = useState([]);
  const [labProcedures, setLabProcedures] = useState([]);
  const [orderForm, setOrderForm] = useState({
    visit_id: "",
    procedure_id: "",
    test_name: "",
    modality_type: "lab_clinical",
    body_part: "",
    contrast_used: false,
    tariff: 0,
    notes: "",
  });

  // Result Entry / View Modal
  const [resultModal, setResultModal] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [resultForm, setResultForm] = useState({ result_summary: "", reference_notes: "" });
  const [saving, setSaving] = useState(false);

  const loadGatewayModalities = useCallback(async () => {
    try {
      const res = await labGatewayService.listModalities();
      setModalities(Array.isArray(res?.data) ? res.data : []);
      setGatewayOnline(true);
    } catch {
      setModalities([]);
      setGatewayOnline(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await labOrderService.list({
        status: statusFilter || undefined,
        modality_type: modalityFilter || undefined,
        search: search.trim() || undefined,
        per_page: 50,
      });
      setOrders(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal memuat permintaan laboratorium." });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, modalityFilter, search]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadGatewayModalities();
  }, [loadGatewayModalities]);

  const openCreateModal = async () => {
    setCreateModal(true);
    try {
      const [vRes, pLabRes, pDiagRes] = await Promise.all([
        visitService.list({ per_page: 50 }).catch(() => ({ data: [] })),
        procedureService
          .list({ category: "laboratory", is_active: "true", per_page: 100 })
          .catch(() => ({ data: [] })),
        procedureService
          .list({ category: "diagnostic", is_active: "true", per_page: 100 })
          .catch(() => ({ data: [] })),
      ]);
      const vList = (Array.isArray(vRes?.data) ? vRes.data : []).filter(
        (v) => v.status !== "cancelled"
      );
      const mergedProcs = [
        ...(Array.isArray(pLabRes?.data) ? pLabRes.data : []),
        ...(Array.isArray(pDiagRes?.data) ? pDiagRes.data : []),
      ];
      setVisits(vList);
      setLabProcedures(mergedProcs);
      setOrderForm((prev) => ({
        ...prev,
        visit_id: prev.visit_id || (vList[0] ? String(vList[0].id) : ""),
      }));
    } catch {
      // ignore
    }
  };

  const handleProcedureChange = (procId) => {
    const selected = labProcedures.find((p) => String(p.id) === String(procId));
    const inferredModality = selected ? inferModalityFromProcedure(selected) : orderForm.modality_type;
    const isContrast = selected ? selected.name.toLowerCase().includes("dengan kontras") : false;
    setOrderForm((p) => ({
      ...p,
      procedure_id: procId,
      modality_type: inferredModality,
      contrast_used: selected ? isContrast : p.contrast_used,
    }));
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!orderForm.visit_id) return;
    setSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      await labOrderService.createForVisit(Number(orderForm.visit_id), {
        procedure_id: orderForm.procedure_id ? Number(orderForm.procedure_id) : undefined,
        test_name: orderForm.procedure_id ? undefined : orderForm.test_name.trim(),
        modality_type: orderForm.modality_type || "lab_clinical",
        body_part: IMAGING_MODALITIES.has(orderForm.modality_type)
          ? orderForm.body_part.trim() || null
          : null,
        contrast_used:
          orderForm.modality_type === "ct_scan" || orderForm.modality_type === "mri"
            ? Boolean(orderForm.contrast_used)
            : false,
        tariff: orderForm.procedure_id ? undefined : Number(orderForm.tariff) || 0,
        notes: orderForm.notes.trim() || null,
      });
      setCreateModal(false);
      setOrderForm({
        visit_id: "",
        procedure_id: "",
        test_name: "",
        modality_type: "lab_clinical",
        body_part: "",
        contrast_used: false,
        tariff: 0,
        notes: "",
      });
      setFeedback({ type: "success", message: "Permintaan pemeriksaan laboratorium / penunjang berhasil dibuat." });
      loadOrders();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal membuat permintaan lab." });
    } finally {
      setSaving(false);
    }
  };

  const handleStartOrder = async (order) => {
    try {
      await labOrderService.updateStatus(order.id, "in_progress");
      setFeedback({ type: "success", message: `Order ${order.order_number} mulai diproses.` });
      loadOrders();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal mengubah status order." });
    }
  };

  const handleDispatchExternal = async (order) => {
    setBusyOrderId(order.id);
    setFeedback({ type: "", message: "" });
    try {
      const isCt = order.modality_type === "ct_scan";
      const payload = {
        body_part: order.body_part || undefined,
        contrast_used: Boolean(order.contrast_used),
        clinical_indication: order.notes || undefined,
      };
      const res = isCt
        ? await labGatewayService.dispatchCtScan(order.id, payload)
        : await labGatewayService.dispatchOrder(order.id, {
            ...payload,
            modality_type: order.modality_type,
          });
      const accNo = res?.data?.external_reference_id || res?.data?.external_ref || "-";
      setFeedback({
        type: "success",
        message: `${res?.message || "Order terkirim ke gateway eksternal."} (Ref/Accession: ${accNo})`,
      });
      loadOrders();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Gagal mengirim order ke gateway eksternal (pastikan backend-node aktif).",
      });
      loadOrders();
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleSyncExternalResult = async (order) => {
    setBusyOrderId(order.id);
    setFeedback({ type: "", message: "" });
    try {
      const isCt = order.modality_type === "ct_scan";
      const res = isCt
        ? await labGatewayService.syncCtScanResult(order.id, {
            body_part: order.body_part || undefined,
            contrast_used: Boolean(order.contrast_used),
          })
        : await labGatewayService.syncExternalResult(order.id, {
            modality_type: order.modality_type,
          });
      setFeedback({
        type: "success",
        message:
          res?.message ||
          `Hasil eksternal untuk ${order.order_number} berhasil disinkronkan ke SIMRS.`,
      });
      loadOrders();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Gagal menarik hasil dari gateway eksternal.",
      });
      loadOrders();
    } finally {
      setBusyOrderId(null);
    }
  };

  const openResultModal = (order) => {
    setActiveOrder(order);
    setResultForm({
      result_summary: order.result?.result_summary || "",
      reference_notes: order.result?.reference_notes || "",
    });
    setResultModal(true);
  };

  const handleSaveResult = async (e) => {
    e.preventDefault();
    if (!activeOrder) return;
    setSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      await labOrderService.saveResult(activeOrder.id, {
        result_summary: resultForm.result_summary.trim(),
        reference_notes: resultForm.reference_notes.trim() || null,
      });
      setFeedback({
        type: "success",
        message: `Hasil pemeriksaan ${activeOrder.order_number} berhasil disimpan dan dapat diakses dokter.`,
      });
      setResultModal(false);
      loadOrders();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal menyimpan hasil laboratorium." });
    } finally {
      setSaving(false);
    }
  };

  const showImagingFields = IMAGING_MODALITIES.has(orderForm.modality_type);
  const showContrastField = orderForm.modality_type === "ct_scan" || orderForm.modality_type === "mri";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" />
            Pemeriksaan Laboratorium &amp; Penunjang Eksternal
          </h1>
          <p className="text-sm text-muted-foreground">
            Manajemen permintaan lab klinis &amp; integrasi gateway perangkat mekanis (CT-Scan, X-Ray, MRI, USG, EKG)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadOrders();
              loadGatewayModalities();
            }}
          >
            <RefreshCw className="h-4 w-4" /> Muat Ulang
          </Button>
          {canCreate && (
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="h-4 w-4" /> Buat Permintaan Lab / CT-Scan
            </Button>
          )}
        </div>
      </div>

      {/* External Modality Gateway Status Bar (backend-node) */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">
                Gateway Perangkat Eksternal (Node.js Service)
              </CardTitle>
            </div>
            <Badge variant={gatewayOnline ? "success" : gatewayOnline === false ? "destructive" : "secondary"}>
              {gatewayOnline ? "Gateway Terhubung" : gatewayOnline === false ? "Node Gateway Offline" : "Memeriksa..."}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          {modalities.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {modalities.map((m) => (
                <div
                  key={m.modality}
                  className={`rounded-lg border p-2 text-xs ${
                    m.modality === "ct_scan" ? "border-primary/40 bg-primary/5" : "bg-muted/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold">{m.code}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {m.mode === "live" ? "LIVE" : "DUMMY"}
                    </Badge>
                  </div>
                  <div className="font-medium truncate mt-0.5" title={m.name}>
                    {m.modality === "ct_scan"
                      ? "CT-Scan"
                      : m.modality === "xray"
                      ? "X-Ray"
                      : m.modality === "mri"
                      ? "MRI"
                      : m.modality === "usg"
                      ? "USG"
                      : m.modality === "ekg"
                      ? "EKG"
                      : "LIS Klinis"}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate" title={m.protocol}>
                    {m.protocol}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {gatewayOnline === false
                ? "backend-node (:3001) tidak terjangkau. Fitur input manual Yii2 tetap berjalan normal."
                : "Memuat status perangkat eksternal (CT-Scan, X-Ray, MRI, USG, EKG, LIS)..."}
            </p>
          )}
        </CardContent>
      </Card>

      {!canUpdate && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Anda masuk sebagai{" "}
            <strong>{user?.role?.display_name || user?.role?.name}</strong>.
            {canCreate
              ? " Anda dapat membuat permintaan pemeriksaan lab & CT-Scan. Dispatch ke gateway eksternal dan input hasil dilakukan oleh Petugas Laboratorium (laboratory@example.com)."
              : " Mode Lihat Saja. Permintaan dibuat oleh Dokter (doctor@example.com) dan diproses oleh Petugas Laboratorium (laboratory@example.com)."}
          </AlertDescription>
        </Alert>
      )}

      {feedback.message && (
        <Alert variant={feedback.type === "error" ? "destructive" : "success"}>
          {feedback.type === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Permintaan Lab &amp; Penunjang ({orders.length})</CardTitle>
              <CardDescription>
                Order CT-Scan / modalitas eksternal dapat dikirim ke gateway Node.js dan ditarik hasilnya secara otomatis
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative w-52">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari No. order / ref / pasien..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                value={modalityFilter}
                onChange={(e) => setModalityFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Semua Modalitas</option>
                {MODALITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Semua Status</option>
                <option value="requested">Requested</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Order</TableHead>
                <TableHead>Pasien</TableHead>
                <TableHead>Pemeriksaan &amp; Tarif</TableHead>
                <TableHead>Modalitas &amp; Integrasi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ringkasan Hasil</TableHead>
                {canUpdate && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Memuat...
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Belum ada permintaan pemeriksaan laboratorium / penunjang.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((o) => {
                  const isBusy = busyOrderId === o.id;
                  const isCtScan = o.modality_type === "ct_scan";
                  return (
                    <TableRow key={o.id}>
                      <TableCell>
                        <div className="font-mono text-xs font-semibold">{o.order_number}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatDateTime(o.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{o.patient?.full_name}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {o.patient?.medical_record_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{o.test_name}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {formatCurrency(o.tariff_snapshot)}
                        </div>
                        {(o.body_part || o.contrast_used) && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {o.body_part ? `Area: ${o.body_part}` : ""}
                            {o.body_part && o.contrast_used ? " • " : ""}
                            {o.contrast_used ? "Dengan Kontras IV" : ""}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant={isCtScan ? "default" : "outline"} className="text-[11px]">
                            <Activity className="h-3 w-3 mr-1" />
                            {o.modality_label || o.modality_type || "Lab Klinis"}
                          </Badge>
                          <Badge
                            variant={getIntegrationBadgeVariant(o.integration_status)}
                            className="text-[10px]"
                          >
                            {o.integration_status || "local_only"}
                          </Badge>
                          {o.external_reference_id && (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              Ref: {o.external_reference_id}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            o.status === "completed"
                              ? "success"
                              : o.status === "in_progress"
                              ? "default"
                              : "warning"
                          }
                        >
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs">
                        <div>{o.result?.result_summary || "-"}</div>
                        {o.result?.result_source === "external_gateway" && (
                          <div className="text-[10px] text-primary mt-0.5">
                            Sumber: {o.result?.modality_device || "External Gateway"}
                          </div>
                        )}
                      </TableCell>
                      {canUpdate && (
                        <TableCell className="text-right">
                          <div className="inline-flex flex-wrap justify-end gap-1.5">
                            {o.status === "requested" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isBusy}
                                onClick={() => handleStartOrder(o)}
                              >
                                <Play className="h-3.5 w-3.5" /> Proses
                              </Button>
                            )}
                            {o.status !== "cancelled" && o.status !== "completed" && (
                              <Button
                                size="sm"
                                variant={isCtScan ? "default" : "outline"}
                                disabled={isBusy || gatewayOnline === false}
                                onClick={() => handleDispatchExternal(o)}
                                title={
                                  isCtScan
                                    ? "Kirim worklist ke External CT-Scan Gateway (Node.js)"
                                    : "Kirim order ke External Modality Gateway (Node.js)"
                                }
                              >
                                {isBusy ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Send className="h-3.5 w-3.5" />
                                )}{" "}
                                {isCtScan ? "Kirim CT-Scan" : "Kirim Gateway"}
                              </Button>
                            )}
                            {o.status !== "cancelled" &&
                              (o.integration_status === "dispatched" || isCtScan) &&
                              o.status !== "completed" && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={isBusy || gatewayOnline === false}
                                  onClick={() => handleSyncExternalResult(o)}
                                  title="Tarik hasil dari Dummy External Modality Gateway & simpan ke Yii2"
                                >
                                  {isBusy ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <DownloadCloud className="h-3.5 w-3.5" />
                                  )}{" "}
                                  {isCtScan ? "Tarik Hasil CT-Scan" : "Tarik Hasil"}
                                </Button>
                              )}
                            {o.status !== "cancelled" && (
                              <Button size="sm" variant="outline" onClick={() => openResultModal(o)}>
                                {o.result ? "Detail / Ubah Hasil" : "Input Manual"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Buat Permintaan Lab / CT-Scan / Modality */}
      <Dialog open={createModal} onOpenChange={setCreateModal}>
        <DialogContent onClose={() => setCreateModal(false)}>
          <form onSubmit={handleCreateOrder}>
            <DialogHeader>
              <DialogTitle>Buat Permintaan Lab / Penunjang Eksternal</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div className="space-y-1.5">
                <Label>Kunjungan Pasien</Label>
                <select
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={orderForm.visit_id}
                  onChange={(e) =>
                    setOrderForm((p) => ({ ...p, visit_id: e.target.value }))
                  }
                >
                  <option value="">-- Pilih Kunjungan --</option>
                  {visits.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.visit_number} — {v.patient?.full_name} ({v.department?.name})
                    </option>
                  ))}
                </select>
              </div>

              {labProcedures.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Pilih dari Master Tindakan Lab / Diagnostik (Opsional)</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={orderForm.procedure_id}
                    onChange={(e) => handleProcedureChange(e.target.value)}
                  >
                    <option value="">-- Input Manual --</option>
                    {labProcedures.map((lp) => (
                      <option key={lp.id} value={lp.id}>
                        [{lp.category.toUpperCase()}] {lp.name} ({formatCurrency(lp.tariff)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Modalitas / Sistem Eksternal</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={orderForm.modality_type}
                    onChange={(e) =>
                      setOrderForm((p) => ({ ...p, modality_type: e.target.value }))
                    }
                  >
                    {MODALITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {showImagingFields && (
                  <div className="space-y-1.5">
                    <Label>Area / Organ (Body Part)</Label>
                    <Input
                      placeholder="Kepala (Brain) / Thorax / Abdomen"
                      value={orderForm.body_part}
                      onChange={(e) =>
                        setOrderForm((p) => ({ ...p, body_part: e.target.value }))
                      }
                    />
                  </div>
                )}
              </div>

              {showContrastField && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={orderForm.contrast_used}
                    onChange={(e) =>
                      setOrderForm((p) => ({ ...p, contrast_used: e.target.checked }))
                    }
                    className="rounded border-input"
                  />
                  <span>Gunakan Media Kontras IV (Contrast-Enhanced)</span>
                </label>
              )}

              {!orderForm.procedure_id && (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Nama Pemeriksaan *</Label>
                    <Input
                      required
                      placeholder="CT-Scan Kepala / Darah Lengkap"
                      value={orderForm.test_name}
                      onChange={(e) =>
                        setOrderForm((p) => ({ ...p, test_name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tarif (Rp)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={orderForm.tariff}
                      onChange={(e) =>
                        setOrderForm((p) => ({ ...p, tariff: e.target.value }))
                      }
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Catatan / Indikasi Klinis (Opsional)</Label>
                <Input
                  placeholder="Suspek cedera kepala ringan / puasa 10 jam..."
                  value={orderForm.notes}
                  onChange={(e) =>
                    setOrderForm((p) => ({ ...p, notes: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateModal(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                Buat Permintaan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Input / Detail Hasil Lab & CT-Scan */}
      <Dialog open={resultModal} onOpenChange={setResultModal}>
        <DialogContent onClose={() => setResultModal(false)}>
          <form onSubmit={handleSaveResult}>
            <DialogHeader>
              <DialogTitle>
                Hasil Pemeriksaan — {activeOrder?.order_number}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div className="text-xs text-muted-foreground">
                Pasien:{" "}
                <strong className="text-foreground">
                  {activeOrder?.patient?.full_name}
                </strong>{" "}
                • Pemeriksaan:{" "}
                <strong className="text-foreground">{activeOrder?.test_name}</strong>{" "}
                • Modalitas:{" "}
                <strong className="text-foreground">
                  {activeOrder?.modality_label || activeOrder?.modality_type}
                </strong>
              </div>

              {activeOrder?.result?.result_source === "external_gateway" && (
                <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                  <div className="font-semibold text-foreground">
                    Metadata Integrasi Eksternal ({activeOrder?.external_system || "Gateway"})
                  </div>
                  {activeOrder?.external_reference_id && (
                    <div>
                      Accession / Ref: <code className="font-mono">{activeOrder.external_reference_id}</code>
                    </div>
                  )}
                  {activeOrder?.result?.modality_device && (
                    <div>Perangkat: {activeOrder.result.modality_device}</div>
                  )}
                  {activeOrder?.result?.external_study_uid && (
                    <div className="break-all">
                      DICOM Study UID: <code className="font-mono text-[11px]">{activeOrder.result.external_study_uid}</code>
                    </div>
                  )}
                  {activeOrder?.result?.result_details?.acquisition_parameters && (
                    <div className="pt-1 text-muted-foreground">
                      Parameter CT: {activeOrder.result.result_details.acquisition_parameters.tube_voltage_kv} kV •{" "}
                      Slice {activeOrder.result.result_details.acquisition_parameters.slice_thickness_mm} mm •{" "}
                      {activeOrder.result.result_details.acquisition_parameters.total_slices} irisan •{" "}
                      DLP {activeOrder.result.result_details.acquisition_parameters.radiation_dose_dlp_mgy_cm} mGy·cm
                    </div>
                  )}
                  {activeOrder?.result?.result_details?.findings && (
                    <div className="pt-1">
                      <span className="font-medium text-foreground">Temuan Radiologi:</span>{" "}
                      {activeOrder.result.result_details.findings}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Ringkasan Hasil Pemeriksaan *</Label>
                <textarea
                  rows={3}
                  required
                  placeholder="Hb 13.8 g/dL, Leukosit 7.200/uL, atau Kesan Radiologi CT-Scan..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={resultForm.result_summary}
                  onChange={(e) =>
                    setResultForm((p) => ({ ...p, result_summary: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nilai Rujukan / Catatan Analis &amp; Radiolog (Opsional)</Label>
                <Input
                  placeholder="Dalam batas normal..."
                  value={resultForm.reference_notes}
                  onChange={(e) =>
                    setResultForm((p) => ({ ...p, reference_notes: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResultModal(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4" /> Simpan Hasil
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
