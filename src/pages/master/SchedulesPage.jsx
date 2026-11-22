import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useAuth } from "../../context/AuthContext";
import { departmentService, doctorService, scheduleService } from "../../services/master.service";

const DAYS = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
  { value: 0, label: "Minggu" },
];

const INITIAL_FORM = {
  doctor_id: "",
  department_id: "",
  day_of_week: 1,
  start_time: "08:00",
  end_time: "12:00",
  max_quota: 30,
  is_active: true,
};

export default function SchedulesPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("master-schedules", "create");
  const canUpdate = hasPermission("master-schedules", "update");
  const canDelete = hasPermission("master-schedules", "delete");

  const [schedules, setSchedules] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [dayFilter, setDayFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const loadLookups = useCallback(async () => {
    try {
      const [docRes, deptRes] = await Promise.all([
        doctorService.list({ per_page: 100 }).catch(() => ({ data: [] })),
        departmentService.list({ per_page: 100 }).catch(() => ({ data: [] })),
      ]);
      setDoctors(Array.isArray(docRes?.data) ? docRes.data : []);
      setDepartments(Array.isArray(deptRes?.data) ? deptRes.data : []);
    } catch {
      // ignore
    }
  }, []);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await scheduleService.list({
        day_of_week: dayFilter !== "" ? dayFilter : undefined,
        department_id: deptFilter || undefined,
        per_page: 100,
      });
      setSchedules(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal memuat jadwal praktik." });
    } finally {
      setLoading(false);
    }
  }, [dayFilter, deptFilter]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const handleOpenCreate = () => {
    const firstDoc = doctors[0];
    setEditing(null);
    setFormData({
      ...INITIAL_FORM,
      doctor_id: firstDoc?.id || "",
      department_id: firstDoc?.department_id || departments[0]?.id || "",
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditing(item);
    setFormData({
      doctor_id: item.doctor_id,
      department_id: item.department_id,
      day_of_week: item.day_of_week,
      start_time: item.start_time,
      end_time: item.end_time,
      max_quota: item.max_quota,
      is_active: Boolean(item.is_active),
    });
    setDialogOpen(true);
  };

  const handleDoctorChange = (doctorId) => {
    const found = doctors.find((d) => String(d.id) === String(doctorId));
    setFormData((p) => ({
      ...p,
      doctor_id: doctorId,
      department_id: found?.department_id || p.department_id,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      const payload = {
        doctor_id: Number(formData.doctor_id),
        department_id: Number(formData.department_id),
        day_of_week: Number(formData.day_of_week),
        start_time: formData.start_time,
        end_time: formData.end_time,
        max_quota: Number(formData.max_quota) || 30,
        is_active: Boolean(formData.is_active),
      };
      if (editing) {
        await scheduleService.update(editing.id, payload);
        setFeedback({ type: "success", message: "Jadwal praktik berhasil diperbarui." });
      } else {
        await scheduleService.create(payload);
        setFeedback({ type: "success", message: "Jadwal praktik baru berhasil ditambahkan." });
      }
      setDialogOpen(false);
      loadSchedules();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal menyimpan jadwal praktik." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (item) => {
    if (!window.confirm(`Nonaktifkan jadwal ${item.doctor?.full_name} (${item.day_label} ${item.start_time}-${item.end_time})?`)) return;
    try {
      await scheduleService.remove(item.id);
      setFeedback({ type: "success", message: "Jadwal praktik berhasil dinonaktifkan." });
      loadSchedules();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal menonaktifkan jadwal." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-primary" />
            Master Jadwal Praktik Dokter
          </h1>
          <p className="text-sm text-muted-foreground">
            Pengelolaan jadwal praktik dokter per hari dan poliklinik
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadSchedules}>
            <RefreshCw className="h-4 w-4" /> Muat Ulang
          </Button>
          {canCreate && (
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" /> Tambah Jadwal
            </Button>
          )}
        </div>
      </div>

      {feedback.message && (
        <Alert variant={feedback.type === "error" ? "destructive" : "success"}>
          {feedback.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Daftar Jadwal Praktik ({schedules.length})</CardTitle>
              <CardDescription>Menjadi acuan validasi jadwal pada pendaftaran kunjungan rawat jalan</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Semua Hari</option>
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Semua Poliklinik</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hari</TableHead>
                <TableHead>Jam Praktik</TableHead>
                <TableHead>Dokter</TableHead>
                <TableHead>Poliklinik</TableHead>
                <TableHead>Kuota</TableHead>
                <TableHead>Status</TableHead>
                {(canUpdate || canDelete) && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Memuat jadwal...
                  </TableCell>
                </TableRow>
              ) : schedules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Belum ada jadwal praktik.
                  </TableCell>
                </TableRow>
              ) : (
                schedules.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-semibold text-sm">{s.day_label}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {s.start_time} – {s.end_time}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{s.doctor?.full_name || `#${s.doctor_id}`}</div>
                      <div className="text-xs text-muted-foreground">{s.doctor?.specialization || ""}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{s.department?.name || `#${s.department_id}`}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{s.max_quota} pasien</TableCell>
                    <TableCell>
                      <Badge variant={s.is_active ? "success" : "secondary"}>
                        {s.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    {(canUpdate || canDelete) && (
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          {canUpdate && (
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(s)}>
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && s.is_active && (
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeactivate(s)}>
                              <Trash2 className="h-4 w-4" />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)}>
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Jadwal Praktik" : "Tambah Jadwal Praktik"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Dokter</Label>
                  <select
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={formData.doctor_id}
                    onChange={(e) => handleDoctorChange(e.target.value)}
                  >
                    <option value="">-- Pilih Dokter --</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>{d.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Poliklinik</Label>
                  <select
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={formData.department_id}
                    onChange={(e) => setFormData((p) => ({ ...p, department_id: e.target.value }))}
                  >
                    <option value="">-- Pilih Poli --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Hari</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={formData.day_of_week}
                    onChange={(e) => setFormData((p) => ({ ...p, day_of_week: e.target.value }))}
                  >
                    {DAYS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Mulai</Label>
                  <Input type="time" required value={formData.start_time} onChange={(e) => setFormData((p) => ({ ...p, start_time: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Selesai</Label>
                  <Input type="time" required value={formData.end_time} onChange={(e) => setFormData((p) => ({ ...p, end_time: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Kuota Maksimal Pasien</Label>
                <Input type="number" min={1} max={500} required value={formData.max_quota} onChange={(e) => setFormData((p) => ({ ...p, max_quota: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Jadwal Aktif</span>
                <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData((p) => ({ ...p, is_active: v }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>Simpan Jadwal</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
