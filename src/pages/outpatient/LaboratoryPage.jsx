import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FlaskConical,
  Info,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Save,
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
import { labOrderService, visitService } from "../../services/outpatient.service";

export default function LaboratoryPage() {
  const { user, hasPermission } = useAuth();
  const canCreate = hasPermission("laboratory", "create");
  const canUpdate = hasPermission("laboratory", "update");

  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Create Lab Order Modal
  const [createModal, setCreateModal] = useState(false);
  const [visits, setVisits] = useState([]);
  const [labProcedures, setLabProcedures] = useState([]);
  const [orderForm, setOrderForm] = useState({
    visit_id: "",
    procedure_id: "",
    test_name: "",
    tariff: 0,
    notes: "",
  });

  // Result Entry Modal
  const [resultModal, setResultModal] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [resultForm, setResultForm] = useState({ result_summary: "", reference_notes: "" });
  const [saving, setSaving] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await labOrderService.list({
        status: statusFilter || undefined,
        search: search.trim() || undefined,
        per_page: 50,
      });
      setOrders(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal memuat permintaan laboratorium." });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const openCreateModal = async () => {
    setCreateModal(true);
    try {
      const [vRes, pRes] = await Promise.all([
        visitService.list({ per_page: 50 }).catch(() => ({ data: [] })),
        procedureService
          .list({ category: "laboratory", is_active: "true", per_page: 100 })
          .catch(() => ({ data: [] })),
      ]);
      const vList = (Array.isArray(vRes?.data) ? vRes.data : []).filter(
        (v) => v.status !== "cancelled"
      );
      setVisits(vList);
      setLabProcedures(Array.isArray(pRes?.data) ? pRes.data : []);
      setOrderForm((prev) => ({
        ...prev,
        visit_id: prev.visit_id || (vList[0] ? String(vList[0].id) : ""),
      }));
    } catch {
      // ignore
    }
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
        tariff: orderForm.procedure_id ? undefined : Number(orderForm.tariff) || 0,
        notes: orderForm.notes.trim() || null,
      });
      setCreateModal(false);
      setOrderForm({ visit_id: "", procedure_id: "", test_name: "", tariff: 0, notes: "" });
      setFeedback({ type: "success", message: "Permintaan pemeriksaan laboratorium berhasil dibuat." });
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" />
            Pemeriksaan Laboratorium
          </h1>
          <p className="text-sm text-muted-foreground">
            Daftar permintaan pemeriksaan penunjang dan pencatatan hasil laboratorium
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadOrders}>
            <RefreshCw className="h-4 w-4" /> Muat Ulang
          </Button>
          {canCreate && (
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="h-4 w-4" /> Buat Permintaan Lab
            </Button>
          )}
        </div>
      </div>

      {!canUpdate && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Anda masuk sebagai{" "}
            <strong>{user?.role?.display_name || user?.role?.name}</strong>.
            {canCreate
              ? " Anda dapat membuat permintaan pemeriksaan lab. Proses pemeriksaan dan input hasil dilakukan oleh Petugas Laboratorium (laboratory@example.com)."
              : " Mode Lihat Saja. Permintaan lab dibuat oleh Dokter (doctor@example.com) dan hasil diinput oleh Petugas Laboratorium (laboratory@example.com)."}
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
              <CardTitle className="text-base">Permintaan Lab ({orders.length})</CardTitle>
              <CardDescription>
                Hasil yang tersimpan otomatis muncul di riwayat pemeriksaan dokter
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative w-52">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari No. order / pasien..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
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
                <TableHead>Status</TableHead>
                <TableHead>Ringkasan Hasil</TableHead>
                {canUpdate && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Memuat...
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Belum ada permintaan pemeriksaan laboratorium.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((o) => (
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
                      {o.result?.result_summary || "-"}
                    </TableCell>
                    {canUpdate && (
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1.5">
                          {o.status === "requested" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartOrder(o)}
                            >
                              <Play className="h-3.5 w-3.5" /> Proses
                            </Button>
                          )}
                          {o.status !== "cancelled" && (
                            <Button size="sm" onClick={() => openResultModal(o)}>
                              {o.result ? "Ubah Hasil" : "Input Hasil"}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Buat Permintaan Lab */}
      <Dialog open={createModal} onOpenChange={setCreateModal}>
        <DialogContent onClose={() => setCreateModal(false)}>
          <form onSubmit={handleCreateOrder}>
            <DialogHeader>
              <DialogTitle>Buat Permintaan Pemeriksaan Lab</DialogTitle>
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
                  <Label>Pilih dari Master Tindakan Lab (Opsional)</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={orderForm.procedure_id}
                    onChange={(e) =>
                      setOrderForm((p) => ({ ...p, procedure_id: e.target.value }))
                    }
                  >
                    <option value="">-- Input Manual --</option>
                    {labProcedures.map((lp) => (
                      <option key={lp.id} value={lp.id}>
                        {lp.name} ({formatCurrency(lp.tariff)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!orderForm.procedure_id && (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Nama Pemeriksaan *</Label>
                    <Input
                      required
                      placeholder="Darah Lengkap / Urinalisis"
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
                <Label>Catatan Klinis (Opsional)</Label>
                <Input
                  placeholder="Puasa 10 jam / cek rutin..."
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

      {/* Modal Input Hasil Lab */}
      <Dialog open={resultModal} onOpenChange={setResultModal}>
        <DialogContent onClose={() => setResultModal(false)}>
          <form onSubmit={handleSaveResult}>
            <DialogHeader>
              <DialogTitle>
                Hasil Laboratorium — {activeOrder?.order_number}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div className="text-xs text-muted-foreground">
                Pasien:{" "}
                <strong className="text-foreground">
                  {activeOrder?.patient?.full_name}
                </strong>{" "}
                • Pemeriksaan:{" "}
                <strong className="text-foreground">{activeOrder?.test_name}</strong>
              </div>
              <div className="space-y-1.5">
                <Label>Ringkasan Hasil Pemeriksaan *</Label>
                <textarea
                  rows={3}
                  required
                  placeholder="Hb 13.8 g/dL, Leukosit 7.200/uL, Trombosit 260.000/uL (Normal)"
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={resultForm.result_summary}
                  onChange={(e) =>
                    setResultForm((p) => ({ ...p, result_summary: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nilai Rujukan / Catatan Analis (Opsional)</Label>
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
