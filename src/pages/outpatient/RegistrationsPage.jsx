import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardPlus,
  Loader2,
  Plus,
  RefreshCw,
  Search,
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
  DialogDescription,
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
import { formatDate, getLocalTodayDate } from "../../lib/utils";
import {
  departmentService,
  patientService,
  scheduleService,
} from "../../services/master.service";
import { visitService } from "../../services/outpatient.service";

const STATUS_BADGE = {
  waiting: { label: "Menunggu", variant: "warning" },
  called: { label: "Dipanggil", variant: "default" },
  in_examination: { label: "Diperiksa", variant: "secondary" },
  completed: { label: "Selesai", variant: "success" },
  cancelled: { label: "Dibatalkan", variant: "destructive" },
};

export default function RegistrationsPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("registrations", "create");
  const canUpdate = hasPermission("registrations", "update");

  const [visits, setVisits] = useState([]);
  const [patients, setPatients] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [dateFilter, setDateFilter] = useState(() => getLocalTodayDate());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    patient_id: "",
    department_id: "",
    schedule_id: "",
    visit_date: getLocalTodayDate(),
    notes: "",
  }));

  const loadVisits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await visitService.list({
        visit_date: dateFilter || undefined,
        search: search.trim() || undefined,
        per_page: 50,
      });
      setVisits(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal memuat data pendaftaran." });
    } finally {
      setLoading(false);
    }
  }, [dateFilter, search]);

  const loadMasterLookups = useCallback(async () => {
    try {
      const [patRes, deptRes, schRes] = await Promise.all([
        patientService.list({ is_active: "true", per_page: 100 }).catch(() => ({ data: [] })),
        departmentService.list({ is_active: "true", per_page: 100 }).catch(() => ({ data: [] })),
        scheduleService.list({ is_active: "true", per_page: 100 }).catch(() => ({ data: [] })),
      ]);
      setPatients(Array.isArray(patRes?.data) ? patRes.data : []);
      setDepartments(Array.isArray(deptRes?.data) ? deptRes.data : []);
      setSchedules(Array.isArray(schRes?.data) ? schRes.data : []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  useEffect(() => {
    loadMasterLookups();
  }, [loadMasterLookups]);

  // Filter active schedules matching selected department & day_of_week of visit_date
  const matchingSchedules = useMemo(() => {
    if (!form.department_id || !form.visit_date) return [];
    const dayOfWeek = new Date(`${form.visit_date}T00:00:00`).getDay();
    return schedules.filter(
      (s) =>
        String(s.department_id) === String(form.department_id) &&
        Number(s.day_of_week) === dayOfWeek
    );
  }, [schedules, form.department_id, form.visit_date]);

  const handleOpenCreate = () => {
    setForm({
      patient_id: patients[0]?.id || "",
      department_id: departments[0]?.id || "",
      schedule_id: "",
      visit_date: dateFilter || getLocalTodayDate(),
      notes: "",
    });
    setDialogOpen(true);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const selectedSchedule = matchingSchedules.find(
      (s) => String(s.id) === String(form.schedule_id)
    );
    if (!selectedSchedule) {
      setFeedback({
        type: "error",
        message: "Pilih jadwal praktik dokter yang valid untuk tanggal kunjungan tersebut.",
      });
      return;
    }

    setSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      const res = await visitService.create({
        patient_id: Number(form.patient_id),
        department_id: Number(form.department_id),
        doctor_id: Number(selectedSchedule.doctor_id),
        schedule_id: Number(selectedSchedule.id),
        visit_date: form.visit_date,
        notes: form.notes.trim() || null,
      });
      const created = res?.data;
      setFeedback({
        type: "success",
        message: `Pendaftaran berhasil: ${created?.visit_number} — Nomor Antrean ${created?.queue_code}.`,
      });
      setDialogOpen(false);
      loadVisits();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Gagal mendaftarkan kunjungan pasien.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelVisit = async (v) => {
    if (!window.confirm(`Batalkan kunjungan ${v.visit_number} (${v.patient?.full_name})?`)) return;
    try {
      await visitService.cancel(v.id);
      setFeedback({ type: "success", message: `Kunjungan ${v.visit_number} dibatalkan.` });
      loadVisits();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal membatalkan kunjungan." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardPlus className="h-6 w-6 text-primary" />
            Pendaftaran Kunjungan Rawat Jalan
          </h1>
          <p className="text-sm text-muted-foreground">
            Registrasi pasien sesuai jadwal praktik dokter dengan generasi nomor antrean otomatis
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadVisits}>
            <RefreshCw className="h-4 w-4" /> Muat Ulang
          </Button>
          {canCreate && (
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" /> Daftar Kunjungan
            </Button>
          )}
        </div>
      </div>

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
              <CardTitle className="text-base">Daftar Kunjungan ({visits.length})</CardTitle>
              <CardDescription>Anti-duplikasi untuk pasien, poli, dan tanggal kunjungan yang sama</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                type="date"
                className="w-40"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
              <div className="relative w-56">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari No. kunjungan / RM / nama..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Antrean</TableHead>
                <TableHead>No. Kunjungan &amp; Tanggal</TableHead>
                <TableHead>Pasien</TableHead>
                <TableHead>Poli &amp; Dokter</TableHead>
                <TableHead>Status Antrean</TableHead>
                {canUpdate && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Memuat kunjungan...
                  </TableCell>
                </TableRow>
              ) : visits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Belum ada pendaftaran kunjungan untuk filter ini.
                  </TableCell>
                </TableRow>
              ) : (
                visits.map((v) => {
                  const badge = STATUS_BADGE[v.queue_status] || { label: v.queue_status, variant: "secondary" };
                  return (
                    <TableRow key={v.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono font-bold text-xs">
                          {v.queue_code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs font-semibold">{v.visit_number}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(v.visit_date)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{v.patient?.full_name}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {v.patient?.medical_record_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{v.department?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {v.doctor?.full_name} ({v.schedule?.start_time}–{v.schedule?.end_time})
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      {canUpdate && (
                        <TableCell className="text-right">
                          {v.status !== "completed" && v.status !== "cancelled" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive text-xs"
                              onClick={() => handleCancelVisit(v)}
                            >
                              <XCircle className="h-3.5 w-3.5" /> Batal
                            </Button>
                          )}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)}>
          <form onSubmit={handleRegister}>
            <DialogHeader>
              <DialogTitle>Daftar Kunjungan Rawat Jalan</DialogTitle>
              <DialogDescription>
                Jadwal dokter difilter otomatis sesuai hari dari tanggal kunjungan.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-3">
              <div className="space-y-1.5">
                <Label>Pasien (No. RM — Nama)</Label>
                <select
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={form.patient_id}
                  onChange={(e) => setForm((p) => ({ ...p, patient_id: e.target.value }))}
                >
                  <option value="">-- Pilih Pasien --</option>
                  {patients.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.medical_record_number} — {pt.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tanggal Kunjungan</Label>
                  <Input
                    type="date"
                    required
                    value={form.visit_date}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, visit_date: e.target.value, schedule_id: "" }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Poliklinik</Label>
                  <select
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={form.department_id}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, department_id: e.target.value, schedule_id: "" }))
                    }
                  >
                    <option value="">-- Pilih Poli --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Dokter &amp; Jadwal Praktik Tersedia</Label>
                <select
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={form.schedule_id}
                  onChange={(e) => setForm((p) => ({ ...p, schedule_id: e.target.value }))}
                >
                  <option value="">
                    {matchingSchedules.length > 0
                      ? "-- Pilih Jadwal Dokter --"
                      : "Tidak ada jadwal praktik pada hari tersebut"}
                  </option>
                  {matchingSchedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.doctor?.full_name} ({s.day_label}, {s.start_time}–{s.end_time}, kuota {s.max_quota})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Catatan Pendaftaran (Opsional)</Label>
                <Input
                  placeholder="Keluhan singkat / catatan loket..."
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving || matchingSchedules.length === 0}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Daftarkan &amp; Ambil Antrean
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
