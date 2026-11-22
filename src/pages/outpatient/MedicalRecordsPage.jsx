import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FileHeart,
  FlaskConical,
  Info,
  Loader2,
  Pill,
  Plus,
  RefreshCw,
  Save,
  Trash2,
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
import { formatCurrency, formatDate } from "../../lib/utils";
import { medicineService, procedureService } from "../../services/master.service";
import {
  labOrderService,
  medicalRecordService,
  prescriptionService,
  visitService,
} from "../../services/outpatient.service";

const EMPTY_EMR = {
  chief_complaint: "",
  anamnesis: "",
  blood_pressure: "",
  heart_rate: "",
  temperature: "",
  respiratory_rate: "",
  weight_kg: "",
  height_cm: "",
  physical_exam: "",
  primary_diagnosis: "",
  secondary_diagnoses: "",
  clinical_notes: "",
};

export default function MedicalRecordsPage() {
  const { user, hasPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const canEditEmr =
    hasPermission("medical-records", "create") ||
    hasPermission("medical-records", "update");
  const canCreateRx = hasPermission("prescriptions", "create");
  const canCreateLab = hasPermission("laboratory", "create");
  const canUpdateQueue = hasPermission("queues", "update");

  const [activeTab, setActiveTab] = useState("emr");
  const [visits, setVisits] = useState([]);
  const [selectedVisitId, setSelectedVisitId] = useState(
    () => searchParams.get("visitId") || ""
  );
  const [visitDetail, setVisitDetail] = useState(null);
  const [proceduresMaster, setProceduresMaster] = useState([]);
  const [medicinesMaster, setMedicinesMaster] = useState([]);

  const [emrForm, setEmrForm] = useState(EMPTY_EMR);
  const [procForm, setProcForm] = useState({ procedure_id: "", quantity: 1, notes: "" });
  const [rxNotes, setRxNotes] = useState("");
  const [rxItems, setRxItems] = useState([
    { medicine_id: "", dosage: "500mg", frequency: "3x1 sesudah makan", quantity: 10 },
  ]);
  const [labForm, setLabForm] = useState({ procedure_id: "", test_name: "", notes: "" });

  const [loadingVisits, setLoadingVisits] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Sync URL ?visitId= changes
  useEffect(() => {
    const paramId = searchParams.get("visitId");
    if (paramId && paramId !== selectedVisitId) {
      setSelectedVisitId(paramId);
    }
  }, [searchParams, selectedVisitId]);

  const loadVisits = useCallback(async () => {
    setLoadingVisits(true);
    try {
      const res = await visitService.list({ per_page: 50 });
      const list = Array.isArray(res?.data) ? res.data : [];
      setVisits(list);
      setSelectedVisitId((prev) => {
        if (prev) return prev;
        return list.length > 0 ? String(list[0].id) : "";
      });
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal memuat daftar kunjungan." });
    } finally {
      setLoadingVisits(false);
    }
  }, []);

  const loadVisitDetail = useCallback(async (visitId) => {
    if (!visitId) return;
    setLoadingDetail(true);
    try {
      const res = await visitService.getById(visitId);
      const data = res?.data || null;
      setVisitDetail(data);
      const mr = data?.medical_record;
      if (mr) {
        const vs = mr.vital_signs || {};
        setEmrForm({
          chief_complaint: mr.chief_complaint || "",
          anamnesis: mr.anamnesis || "",
          blood_pressure: vs.blood_pressure || "",
          heart_rate: vs.heart_rate || "",
          temperature: vs.temperature || "",
          respiratory_rate: vs.respiratory_rate || "",
          weight_kg: vs.weight_kg || "",
          height_cm: vs.height_cm || "",
          physical_exam: mr.physical_exam || "",
          primary_diagnosis: mr.primary_diagnosis || "",
          secondary_diagnoses: mr.secondary_diagnoses || "",
          clinical_notes: mr.clinical_notes || "",
        });
      } else {
        setEmrForm(EMPTY_EMR);
      }
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal memuat detail kunjungan." });
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  useEffect(() => {
    procedureService
      .list({ is_active: "true", per_page: 100 })
      .then((res) => setProceduresMaster(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {});
    medicineService
      .list({ is_active: "true", per_page: 100 })
      .then((res) => setMedicinesMaster(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedVisitId) {
      loadVisitDetail(selectedVisitId);
    }
  }, [selectedVisitId, loadVisitDetail]);

  const selectVisit = (id) => {
    const strId = String(id);
    setSelectedVisitId(strId);
    setSearchParams({ visitId: strId });
    setFeedback({ type: "", message: "" });
  };

  const handleSaveEmr = async (e) => {
    e.preventDefault();
    if (!selectedVisitId) return;
    setSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      await medicalRecordService.upsert(selectedVisitId, {
        chief_complaint: emrForm.chief_complaint.trim(),
        anamnesis: emrForm.anamnesis.trim() || null,
        vital_signs: {
          blood_pressure: emrForm.blood_pressure.trim() || null,
          heart_rate: emrForm.heart_rate.trim() || null,
          temperature: emrForm.temperature.trim() || null,
          respiratory_rate: emrForm.respiratory_rate.trim() || null,
          weight_kg: emrForm.weight_kg.trim() || null,
          height_cm: emrForm.height_cm.trim() || null,
        },
        physical_exam: emrForm.physical_exam.trim() || null,
        primary_diagnosis: emrForm.primary_diagnosis.trim(),
        secondary_diagnoses: emrForm.secondary_diagnoses.trim() || null,
        clinical_notes: emrForm.clinical_notes.trim() || null,
      });
      setFeedback({ type: "success", message: "Rekam medis pasien berhasil disimpan." });
      loadVisitDetail(selectedVisitId);
      loadVisits();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal menyimpan rekam medis." });
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteExam = async () => {
    if (!visitDetail) return;
    setSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      await visitService.updateQueueStatus(visitDetail.id, "completed");
      setFeedback({
        type: "success",
        message: `Pemeriksaan kunjungan ${visitDetail.visit_number} ditandai selesai.`,
      });
      loadVisitDetail(selectedVisitId);
      loadVisits();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal menyelesaikan pemeriksaan." });
    } finally {
      setSaving(false);
    }
  };

  const handleAddProcedure = async (e) => {
    e.preventDefault();
    if (!selectedVisitId || !procForm.procedure_id) return;
    setSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      await medicalRecordService.addProcedure(selectedVisitId, {
        procedure_id: Number(procForm.procedure_id),
        quantity: Number(procForm.quantity) || 1,
        notes: procForm.notes.trim() || null,
      });
      setProcForm({ procedure_id: "", quantity: 1, notes: "" });
      setFeedback({ type: "success", message: "Tindakan medis berhasil dicatat pada kunjungan." });
      loadVisitDetail(selectedVisitId);
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal menambah tindakan medis." });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelProcedure = async (vpId) => {
    if (!window.confirm("Batalkan tindakan ini?")) return;
    try {
      await medicalRecordService.cancelProcedure(vpId);
      setFeedback({ type: "success", message: "Status tindakan diubah menjadi dibatalkan." });
      loadVisitDetail(selectedVisitId);
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal membatalkan tindakan." });
    }
  };

  const handleAddRxRow = () => {
    setRxItems((prev) => [
      ...prev,
      { medicine_id: "", dosage: "500mg", frequency: "3x1 sesudah makan", quantity: 10 },
    ]);
  };

  const handleCreatePrescription = async (e) => {
    e.preventDefault();
    const validItems = rxItems
      .filter((i) => i.medicine_id)
      .map((i) => ({
        medicine_id: Number(i.medicine_id),
        dosage: i.dosage.trim(),
        frequency: i.frequency.trim(),
        quantity: Number(i.quantity) || 1,
      }));
    if (validItems.length === 0) {
      setFeedback({ type: "error", message: "Pilih minimal satu obat pada resep." });
      return;
    }
    setSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      await prescriptionService.createForVisit(selectedVisitId, {
        notes: rxNotes.trim() || null,
        items: validItems,
      });
      setRxNotes("");
      setRxItems([{ medicine_id: "", dosage: "500mg", frequency: "3x1 sesudah makan", quantity: 10 }]);
      setFeedback({
        type: "success",
        message: "Resep berhasil dibuat dan diteruskan ke Instalasi Farmasi (stok dikurangi saat penyerahan).",
      });
      loadVisitDetail(selectedVisitId);
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal membuat resep." });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLabOrder = async (e) => {
    e.preventDefault();
    if (!selectedVisitId) return;
    setSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      await labOrderService.createForVisit(selectedVisitId, {
        procedure_id: labForm.procedure_id ? Number(labForm.procedure_id) : undefined,
        test_name: labForm.procedure_id ? undefined : labForm.test_name.trim(),
        notes: labForm.notes.trim() || null,
      });
      setLabForm({ procedure_id: "", test_name: "", notes: "" });
      setFeedback({ type: "success", message: "Permintaan pemeriksaan laboratorium berhasil dikirim." });
      loadVisitDetail(selectedVisitId);
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal mengirim permintaan lab." });
    } finally {
      setSaving(false);
    }
  };

  const labProcedures = proceduresMaster.filter((p) => p.category === "laboratory");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileHeart className="h-6 w-6 text-primary" />
            Pemeriksaan &amp; Rekam Medis Elektronik
          </h1>
          <p className="text-sm text-muted-foreground">
            Pencatatan anamnesis, tanda vital, diagnosis, tindakan medis, resep obat, dan permintaan lab
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            loadVisits();
            if (selectedVisitId) loadVisitDetail(selectedVisitId);
          }}
        >
          <RefreshCw className="h-4 w-4" /> Muat Ulang
        </Button>
      </div>

      {!canEditEmr && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Anda masuk sebagai{" "}
            <strong>{user?.role?.display_name || user?.role?.name}</strong>{" "}
            (mode <strong>Lihat Saja / Read-Only</strong>). Pengisian Rekam Medis,
            Tindakan Medis, Resep, dan Permintaan Lab dilakukan oleh akun{" "}
            <strong>Dokter</strong> (<code className="font-mono text-xs">doctor@example.com</code>).
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

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left 4 cols: Visits list */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Daftar Kunjungan ({visits.length})</CardTitle>
            <CardDescription>Pilih pasien untuk membuka rekam medis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[640px] overflow-y-auto">
            {loadingVisits ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Memuat...
              </div>
            ) : visits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Belum ada kunjungan terdaftar.
              </p>
            ) : (
              visits.map((v) => {
                const active = String(v.id) === String(selectedVisitId);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => selectVisit(v.id)}
                    className={`w-full rounded-xl border p-3 text-left transition-all ${
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "hover:bg-accent/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="font-mono text-[11px]">
                        {v.queue_code}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {v.queue_status}
                      </Badge>
                    </div>
                    <div className="font-semibold text-sm mt-1.5">{v.patient?.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {v.patient?.medical_record_number} • {v.department?.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {formatDate(v.visit_date)} • {v.doctor?.full_name}
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Right 8 cols: Clinical workbench */}
        <div className="lg:col-span-8 space-y-4">
          {!visitDetail || loadingDetail ? (
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                {loadingDetail ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Memuat data klinis...
                  </>
                ) : (
                  "Pilih kunjungan di sebelah kiri untuk membuka rekam medis."
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">
                        {visitDetail.patient?.full_name}{" "}
                        <span className="font-mono text-xs text-muted-foreground font-normal">
                          ({visitDetail.patient?.medical_record_number})
                        </span>
                      </CardTitle>
                      <CardDescription>
                        {visitDetail.visit_number} • {visitDetail.department?.name} •{" "}
                        {visitDetail.doctor?.full_name}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {visitDetail.medical_record && (
                        <Badge variant="outline" className="font-mono text-xs">
                          EMR v{visitDetail.medical_record.version}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="capitalize">
                        {visitDetail.queue_status}
                      </Badge>
                      {canUpdateQueue &&
                        visitDetail.queue_status !== "completed" &&
                        visitDetail.status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={saving}
                            onClick={handleCompleteExam}
                          >
                            Selesaikan Periksa
                          </Button>
                        )}
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="emr" className="gap-1.5 text-xs">
                    <FileHeart className="h-3.5 w-3.5" /> Rekam Medis
                  </TabsTrigger>
                  <TabsTrigger value="procedures" className="gap-1.5 text-xs">
                    <ClipboardList className="h-3.5 w-3.5" /> Tindakan (
                    {visitDetail.procedures?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="prescriptions" className="gap-1.5 text-xs">
                    <Pill className="h-3.5 w-3.5" /> Resep (
                    {visitDetail.prescriptions?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="lab" className="gap-1.5 text-xs">
                    <FlaskConical className="h-3.5 w-3.5" /> Lab (
                    {visitDetail.lab_orders?.length || 0})
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: EMR */}
                <TabsContent value="emr">
                  <Card>
                    <form onSubmit={handleSaveEmr}>
                      <CardContent className="pt-5 space-y-4">
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label>Keluhan Utama *</Label>
                            <Input
                              required
                              disabled={!canEditEmr}
                              placeholder="Demam 3 hari, batuk berdahak..."
                              value={emrForm.chief_complaint}
                              onChange={(e) =>
                                setEmrForm((p) => ({ ...p, chief_complaint: e.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Diagnosis Primer *</Label>
                            <Input
                              required
                              disabled={!canEditEmr}
                              placeholder="ISPA Akut (J06.9)"
                              value={emrForm.primary_diagnosis}
                              onChange={(e) =>
                                setEmrForm((p) => ({ ...p, primary_diagnosis: e.target.value }))
                              }
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                          <div className="space-y-1">
                            <Label className="text-xs">TD (mmHg)</Label>
                            <Input
                              disabled={!canEditEmr}
                              placeholder="120/80"
                              value={emrForm.blood_pressure}
                              onChange={(e) =>
                                setEmrForm((p) => ({ ...p, blood_pressure: e.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Nadi (/mnt)</Label>
                            <Input
                              disabled={!canEditEmr}
                              placeholder="82"
                              value={emrForm.heart_rate}
                              onChange={(e) =>
                                setEmrForm((p) => ({ ...p, heart_rate: e.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Suhu (°C)</Label>
                            <Input
                              disabled={!canEditEmr}
                              placeholder="37.2"
                              value={emrForm.temperature}
                              onChange={(e) =>
                                setEmrForm((p) => ({ ...p, temperature: e.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">RR (/mnt)</Label>
                            <Input
                              disabled={!canEditEmr}
                              placeholder="18"
                              value={emrForm.respiratory_rate}
                              onChange={(e) =>
                                setEmrForm((p) => ({ ...p, respiratory_rate: e.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">BB (kg)</Label>
                            <Input
                              disabled={!canEditEmr}
                              placeholder="65"
                              value={emrForm.weight_kg}
                              onChange={(e) =>
                                setEmrForm((p) => ({ ...p, weight_kg: e.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">TB (cm)</Label>
                            <Input
                              disabled={!canEditEmr}
                              placeholder="170"
                              value={emrForm.height_cm}
                              onChange={(e) =>
                                setEmrForm((p) => ({ ...p, height_cm: e.target.value }))
                              }
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label>Anamnesis</Label>
                          <textarea
                            rows={2}
                            disabled={!canEditEmr}
                            placeholder="Riwayat penyakit sekarang, riwayat alergi..."
                            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                            value={emrForm.anamnesis}
                            onChange={(e) =>
                              setEmrForm((p) => ({ ...p, anamnesis: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Pemeriksaan Fisik</Label>
                          <textarea
                            rows={2}
                            disabled={!canEditEmr}
                            placeholder="Hasil pemeriksaan fisik..."
                            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                            value={emrForm.physical_exam}
                            onChange={(e) =>
                              setEmrForm((p) => ({ ...p, physical_exam: e.target.value }))
                            }
                          />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label>Diagnosis Sekunder</Label>
                            <Input
                              disabled={!canEditEmr}
                              placeholder="Opsional..."
                              value={emrForm.secondary_diagnoses}
                              onChange={(e) =>
                                setEmrForm((p) => ({
                                  ...p,
                                  secondary_diagnoses: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Catatan Klinis</Label>
                            <Input
                              disabled={!canEditEmr}
                              placeholder="Anjuran / kontrol ulang..."
                              value={emrForm.clinical_notes}
                              onChange={(e) =>
                                setEmrForm((p) => ({ ...p, clinical_notes: e.target.value }))
                              }
                            />
                          </div>
                        </div>

                        {canEditEmr && (
                          <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={saving}>
                              {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                              Simpan Rekam Medis
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </form>
                  </Card>
                </TabsContent>

                {/* TAB 2: PROCEDURES */}
                <TabsContent value="procedures">
                  <Card>
                    <CardContent className="pt-5 space-y-4">
                      {canEditEmr && (
                        <form
                          onSubmit={handleAddProcedure}
                          className="grid sm:grid-cols-12 gap-2 items-end"
                        >
                          <div className="sm:col-span-6 space-y-1">
                            <Label className="text-xs">Tindakan Medis</Label>
                            <select
                              required
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                              value={procForm.procedure_id}
                              onChange={(e) =>
                                setProcForm((p) => ({ ...p, procedure_id: e.target.value }))
                              }
                            >
                              <option value="">-- Pilih Tindakan --</option>
                              {proceduresMaster.map((pr) => (
                                <option key={pr.id} value={pr.id}>
                                  {pr.name} — {formatCurrency(pr.tariff)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="sm:col-span-2 space-y-1">
                            <Label className="text-xs">Qty</Label>
                            <Input
                              type="number"
                              min={1}
                              value={procForm.quantity}
                              onChange={(e) =>
                                setProcForm((p) => ({ ...p, quantity: e.target.value }))
                              }
                            />
                          </div>
                          <div className="sm:col-span-4">
                            <Button type="submit" className="w-full" disabled={saving}>
                              <Plus className="h-4 w-4" /> Tambah Tindakan
                            </Button>
                          </div>
                        </form>
                      )}

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tindakan</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Tarif Snapshot</TableHead>
                            <TableHead>Status</TableHead>
                            {canEditEmr && <TableHead className="text-right">Aksi</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(visitDetail.procedures || []).length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="text-center text-muted-foreground py-6"
                              >
                                Belum ada tindakan medis tercatat.
                              </TableCell>
                            </TableRow>
                          ) : (
                            (visitDetail.procedures || []).map((vp) => (
                              <TableRow key={vp.id}>
                                <TableCell className="font-medium text-sm">
                                  {vp.procedure_name_snapshot}
                                </TableCell>
                                <TableCell>{vp.quantity}</TableCell>
                                <TableCell className="font-mono text-xs">
                                  {formatCurrency(vp.line_total)}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      vp.status === "active" ? "success" : "destructive"
                                    }
                                  >
                                    {vp.status}
                                  </Badge>
                                </TableCell>
                                {canEditEmr && (
                                  <TableCell className="text-right">
                                    {vp.status === "active" && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive text-xs"
                                        onClick={() => handleCancelProcedure(vp.id)}
                                      >
                                        Batal
                                      </Button>
                                    )}
                                  </TableCell>
                                )}
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TAB 3: PRESCRIPTIONS */}
                <TabsContent value="prescriptions">
                  <Card>
                    <CardContent className="pt-5 space-y-4">
                      {canCreateRx && (
                        <form
                          onSubmit={handleCreatePrescription}
                          className="space-y-3 rounded-xl border p-4 bg-muted/20"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">Buat Resep Baru</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleAddRxRow}
                            >
                              <Plus className="h-3.5 w-3.5" /> Tambah Baris Obat
                            </Button>
                          </div>
                          {rxItems.map((row, idx) => (
                            <div
                              key={idx}
                              className="grid sm:grid-cols-12 gap-2 items-center"
                            >
                              <select
                                required
                                className="sm:col-span-5 flex h-9 rounded-md border border-input bg-background px-2 text-xs"
                                value={row.medicine_id}
                                onChange={(e) =>
                                  setRxItems((prev) =>
                                    prev.map((it, i) =>
                                      i === idx ? { ...it, medicine_id: e.target.value } : it
                                    )
                                  )
                                }
                              >
                                <option value="">-- Pilih Obat --</option>
                                {medicinesMaster.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name} (Stok: {m.stock} {m.unit})
                                  </option>
                                ))}
                              </select>
                              <Input
                                className="sm:col-span-2 text-xs"
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
                                className="sm:col-span-3 text-xs"
                                placeholder="Aturan pakai"
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
                              <div className="sm:col-span-2 flex gap-1">
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
                          <div className="flex gap-2">
                            <Input
                              placeholder="Catatan resep (opsional)"
                              value={rxNotes}
                              onChange={(e) => setRxNotes(e.target.value)}
                            />
                            <Button type="submit" disabled={saving}>
                              Kirim ke Farmasi
                            </Button>
                          </div>
                        </form>
                      )}

                      <div className="space-y-3">
                        {(visitDetail.prescriptions || []).length === 0 ? (
                          <p className="text-center text-sm text-muted-foreground py-6">
                            Belum ada resep obat untuk kunjungan ini.
                          </p>
                        ) : (
                          (visitDetail.prescriptions || []).map((rx) => (
                            <div key={rx.id} className="rounded-xl border p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-semibold">
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
                              <ul className="text-xs space-y-1 text-muted-foreground">
                                {(rx.items || []).map((it) => (
                                  <li key={it.id}>
                                    •{" "}
                                    <strong className="text-foreground">
                                      {it.medicine_name_snapshot}
                                    </strong>{" "}
                                    — {it.quantity} {it.unit_snapshot} ({it.dosage},{" "}
                                    {it.frequency})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TAB 4: LAB ORDERS & RESULTS */}
                <TabsContent value="lab">
                  <Card>
                    <CardContent className="pt-5 space-y-4">
                      {canCreateLab && (
                        <form
                          onSubmit={handleCreateLabOrder}
                          className="grid sm:grid-cols-12 gap-2 items-end rounded-xl border p-4 bg-muted/20"
                        >
                          <div className="sm:col-span-5 space-y-1">
                            <Label className="text-xs">Pemeriksaan Lab (Master)</Label>
                            <select
                              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                              value={labForm.procedure_id}
                              onChange={(e) =>
                                setLabForm((p) => ({ ...p, procedure_id: e.target.value }))
                              }
                            >
                              <option value="">-- Custom / Pilih dari Master Lab --</option>
                              {labProcedures.map((lp) => (
                                <option key={lp.id} value={lp.id}>
                                  {lp.name} ({formatCurrency(lp.tariff)})
                                </option>
                              ))}
                            </select>
                          </div>
                          {!labForm.procedure_id && (
                            <div className="sm:col-span-4 space-y-1">
                              <Label className="text-xs">Nama Pemeriksaan</Label>
                              <Input
                                required
                                placeholder="Cek Urin Lengkap..."
                                value={labForm.test_name}
                                onChange={(e) =>
                                  setLabForm((p) => ({ ...p, test_name: e.target.value }))
                                }
                              />
                            </div>
                          )}
                          <div
                            className={
                              labForm.procedure_id
                                ? "sm:col-span-4 space-y-1"
                                : "sm:col-span-3 space-y-1"
                            }
                          >
                            <Label className="text-xs">Catatan Klinis</Label>
                            <Input
                              value={labForm.notes}
                              onChange={(e) =>
                                setLabForm((p) => ({ ...p, notes: e.target.value }))
                              }
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <Button type="submit" className="w-full" disabled={saving}>
                              <Plus className="h-4 w-4" /> Order Lab
                            </Button>
                          </div>
                        </form>
                      )}

                      <div className="space-y-3">
                        {(visitDetail.lab_orders || []).length === 0 ? (
                          <p className="text-center text-sm text-muted-foreground py-6">
                            Belum ada permintaan pemeriksaan laboratorium.
                          </p>
                        ) : (
                          (visitDetail.lab_orders || []).map((lo) => (
                            <div key={lo.id} className="rounded-xl border p-3.5 space-y-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-mono text-xs text-muted-foreground mr-2">
                                    {lo.order_number}
                                  </span>
                                  <strong className="text-sm">{lo.test_name}</strong>
                                </div>
                                <Badge
                                  variant={
                                    lo.status === "completed" ? "success" : "warning"
                                  }
                                >
                                  {lo.status}
                                </Badge>
                              </div>
                              {lo.result ? (
                                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs">
                                  <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                                    Hasil Laboratorium:
                                  </div>
                                  <p className="mt-0.5">{lo.result.result_summary}</p>
                                  {lo.result.reference_notes && (
                                    <p className="text-muted-foreground mt-1">
                                      Catatan: {lo.result.reference_notes}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  Menunggu hasil dari Petugas Laboratorium.
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
