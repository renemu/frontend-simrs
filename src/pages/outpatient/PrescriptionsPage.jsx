import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  History,
  Info,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency, formatDateTime } from "../../lib/utils";
import { medicineService } from "../../services/master.service";
import { prescriptionService, visitService } from "../../services/outpatient.service";

export default function PrescriptionsPage() {
  const { user, hasPermission } = useAuth();
  const canCreate = hasPermission("prescriptions", "create");
  const canDispense = hasPermission("prescriptions", "update");

  const [activeTab, setActiveTab] = useState("prescriptions");
  const [prescriptions, setPrescriptions] = useState([]);
  const [movements, setMovements] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Create Prescription Modal (for Doctor role)
  const [createOpen, setCreateOpen] = useState(false);
  const [visits, setVisits] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [visitId, setVisitId] = useState("");
  const [rxNotes, setRxNotes] = useState("");
  const [rxItems, setRxItems] = useState([
    { medicine_id: "", dosage: "500mg", frequency: "3x1 sesudah makan", quantity: 10 },
  ]);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rxRes, movRes] = await Promise.all([
        prescriptionService.list({
          status: statusFilter || undefined,
          search: search.trim() || undefined,
          per_page: 50,
        }),
        prescriptionService.stockMovements({ per_page: 30 }).catch(() => ({ data: [] })),
      ]);
      setPrescriptions(Array.isArray(rxRes?.data) ? rxRes.data : []);
      setMovements(Array.isArray(movRes?.data) ? movRes.data : []);
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal memuat data farmasi." });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = async () => {
    setCreateOpen(true);
    try {
      const [vRes, mRes] = await Promise.all([
        visitService.list({ per_page: 50 }).catch(() => ({ data: [] })),
        medicineService.list({ is_active: "true", per_page: 100 }).catch(() => ({ data: [] })),
      ]);
      const vList = (Array.isArray(vRes?.data) ? vRes.data : []).filter(
        (v) => v.status !== "cancelled"
      );
      setVisits(vList);
      setMedicines(Array.isArray(mRes?.data) ? mRes.data : []);
      if (vList.length > 0 && !visitId) {
        setVisitId(String(vList[0].id));
      }
    } catch {
      // ignore
    }
  };

  const handleCreateRx = async (e) => {
    e.preventDefault();
    const validItems = rxItems
      .filter((i) => i.medicine_id)
      .map((i) => ({
        medicine_id: Number(i.medicine_id),
        dosage: i.dosage.trim(),
        frequency: i.frequency.trim(),
        quantity: Number(i.quantity) || 1,
      }));
    if (!visitId || validItems.length === 0) {
      setFeedback({ type: "error", message: "Pilih kunjungan dan minimal satu obat." });
      return;
    }
    setSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      await prescriptionService.createForVisit(Number(visitId), {
        notes: rxNotes.trim() || null,
        items: validItems,
      });
      setCreateOpen(false);
      setRxNotes("");
      setRxItems([{ medicine_id: "", dosage: "500mg", frequency: "3x1 sesudah makan", quantity: 10 }]);
      setFeedback({
        type: "success",
        message: "Resep baru berhasil dibuat dan siap diproses Petugas Farmasi.",
      });
      loadData();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal membuat resep." });
    } finally {
      setSaving(false);
    }
  };

  const handleDispense = async (rx) => {
    if (
      !window.confirm(
        `Proses & serahkan obat untuk resep ${rx.prescription_number} (${rx.patient?.full_name})? Stok obat akan dikurangi secara atomik.`
      )
    ) {
      return;
    }
    setBusyId(rx.id);
    setFeedback({ type: "", message: "" });
    try {
      await prescriptionService.dispense(rx.id);
      setFeedback({
        type: "success",
        message: `Resep ${rx.prescription_number} berhasil diserahkan dan stok obat telah diperbarui.`,
      });
      loadData();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Gagal memproses penyerahan obat.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleCancelRx = async (rx) => {
    if (!window.confirm(`Batalkan resep ${rx.prescription_number}?`)) return;
    setBusyId(rx.id);
    try {
      await prescriptionService.cancel(rx.id);
      setFeedback({ type: "success", message: `Resep ${rx.prescription_number} dibatalkan.` });
      loadData();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal membatalkan resep." });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <PackageCheck className="h-6 w-6 text-primary" />
            Resep &amp; Pelayanan Farmasi
          </h1>
          <p className="text-sm text-muted-foreground">
            Validasi stok real-time, penyerahan obat atomik, dan audit trail pergerakan stok
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4" /> Muat Ulang
          </Button>
          {canCreate && (
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="h-4 w-4" /> Buat Resep
            </Button>
          )}
        </div>
      </div>

      {!canDispense && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Anda masuk sebagai{" "}
            <strong>{user?.role?.display_name || user?.role?.name}</strong>.
            {canCreate
              ? " Anda dapat membuat resep baru. Penyerahan obat (pengurangan stok) dilakukan oleh Petugas Farmasi (pharmacy@example.com)."
              : " Mode Lihat Saja. Pembuatan resep dilakukan oleh Dokter (doctor@example.com) dan penyerahan obat dilakukan oleh Petugas Farmasi (pharmacy@example.com)."}
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="prescriptions" className="gap-1.5">
            <PackageCheck className="h-4 w-4" /> Daftar Resep ({prescriptions.length})
          </TabsTrigger>
          <TabsTrigger value="movements" className="gap-1.5">
            <History className="h-4 w-4" /> Mutasi Stok ({movements.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prescriptions">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Antrean Resep Farmasi</CardTitle>
                  <CardDescription>
                    Stok obat berkurang otomatis saat tombol Serahkan Obat berhasil
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative w-52">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari No. resep / pasien..."
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
                    <option value="pending">Pending (Menunggu Farmasi)</option>
                    <option value="dispensed">Dispensed (Diserahkan)</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Memuat resep...
                </div>
              ) : prescriptions.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Belum ada resep untuk filter ini.
                </div>
              ) : (
                prescriptions.map((rx) => (
                  <div key={rx.id} className="rounded-xl border p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold">
                            {rx.prescription_number}
                          </span>
                          <Badge
                            variant={
                              rx.status === "dispensed"
                                ? "success"
                                : rx.status === "cancelled"
                                ? "destructive"
                                : "warning"
                            }
                          >
                            {rx.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Pasien:{" "}
                          <strong className="text-foreground">
                            {rx.patient?.full_name}
                          </strong>{" "}
                          ({rx.patient?.medical_record_number}) • Dokter:{" "}
                          {rx.doctor?.full_name}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold mr-1">
                          {formatCurrency(rx.total_amount)}
                        </span>
                        {canDispense && rx.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              disabled={busyId === rx.id}
                              onClick={() => handleDispense(rx)}
                            >
                              {busyId === rx.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <PackageCheck className="h-4 w-4" />
                              )}
                              Serahkan Obat
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              disabled={busyId === rx.id}
                              onClick={() => handleCancelRx(rx)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Obat</TableHead>
                          <TableHead>Dosis &amp; Frekuensi</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Stok Saat Ini</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(rx.items || []).map((item) => {
                          const low =
                            rx.status === "pending" &&
                            item.current_stock !== null &&
                            item.current_stock < item.quantity;
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium text-sm">
                                {item.medicine_name_snapshot}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {item.dosage} — {item.frequency}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {item.quantity} {item.unit_snapshot}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={low ? "destructive" : "secondary"}
                                  className="font-mono text-xs"
                                >
                                  {item.current_stock ?? "-"} {low ? "(Kurang!)" : ""}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs">
                                {formatCurrency(item.line_total)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Riwayat Mutasi Stok Obat</CardTitle>
              <CardDescription>
                Jejak audit setiap pengurangan stok dari penyerahan resep
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Obat</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Delta</TableHead>
                    <TableHead>Stok (Sebelum → Sesudah)</TableHead>
                    <TableHead>Petugas / Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-8"
                      >
                        Belum ada catatan mutasi stok.
                      </TableCell>
                    </TableRow>
                  ) : (
                    movements.map((mv) => (
                      <TableRow key={mv.id}>
                        <TableCell className="text-xs">
                          {formatDateTime(mv.created_at)}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {mv.medicine?.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {mv.movement_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-rose-600">
                          {mv.quantity_delta > 0
                            ? `+${mv.quantity_delta}`
                            : mv.quantity_delta}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {mv.stock_before} → {mv.stock_after}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {mv.actor?.name || "-"} • {mv.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Buat Resep Baru (Dokter) */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreateRx}>
            <DialogHeader>
              <DialogTitle>Buat Resep Obat Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div className="space-y-1.5">
                <Label>Kunjungan Pasien</Label>
                <select
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={visitId}
                  onChange={(e) => setVisitId(e.target.value)}
                >
                  <option value="">-- Pilih Kunjungan --</option>
                  {visits.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.visit_number} — {v.patient?.full_name} ({v.department?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Daftar Obat</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setRxItems((prev) => [
                        ...prev,
                        { medicine_id: "", dosage: "500mg", frequency: "3x1", quantity: 10 },
                      ])
                    }
                  >
                    <Plus className="h-3.5 w-3.5" /> Baris Obat
                  </Button>
                </div>
                {rxItems.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                    <select
                      required
                      className="col-span-5 flex h-9 rounded-md border border-input bg-background px-2 text-xs"
                      value={row.medicine_id}
                      onChange={(e) =>
                        setRxItems((prev) =>
                          prev.map((it, i) =>
                            i === idx ? { ...it, medicine_id: e.target.value } : it
                          )
                        )
                      }
                    >
                      <option value="">-- Obat --</option>
                      {medicines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} (Stok: {m.stock})
                        </option>
                      ))}
                    </select>
                    <Input
                      className="col-span-2 text-xs"
                      placeholder="Dosis"
                      required
                      value={row.dosage}
                      onChange={(e) =>
                        setRxItems((prev) =>
                          prev.map((it, i) =>
                            i === idx ? { ...it, dosage: e.target.value } : it
                          )
                        )
                      }
                    />
                    <Input
                      className="col-span-3 text-xs"
                      placeholder="Frekuensi"
                      required
                      value={row.frequency}
                      onChange={(e) =>
                        setRxItems((prev) =>
                          prev.map((it, i) =>
                            i === idx ? { ...it, frequency: e.target.value } : it
                          )
                        )
                      }
                    />
                    <div className="col-span-2 flex gap-1">
                      <Input
                        type="number"
                        min={1}
                        className="text-xs"
                        value={row.quantity}
                        onChange={(e) =>
                          setRxItems((prev) =>
                            prev.map((it, i) =>
                              i === idx ? { ...it, quantity: e.target.value } : it
                            )
                          )
                        }
                      />
                      {rxItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive shrink-0"
                          onClick={() =>
                            setRxItems((prev) => prev.filter((_, i) => i !== idx))
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label>Catatan (Opsional)</Label>
                <Input
                  placeholder="Diminum sesudah makan..."
                  value={rxNotes}
                  onChange={(e) => setRxNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                Simpan Resep
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
