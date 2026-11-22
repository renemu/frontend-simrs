import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
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
import { formatDate } from "../../lib/utils";
import { patientService } from "../../services/master.service";

const INITIAL_FORM = {
  medical_record_number: "",
  national_id: "",
  full_name: "",
  birth_date: "",
  gender: "male",
  phone: "",
  address: "",
  blood_type: "",
  is_active: true,
};

export default function PatientsPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("master-patients", "create");
  const canUpdate = hasPermission("master-patients", "update");
  const canDelete = hasPermission("master-patients", "delete");

  const [patients, setPatients] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, per_page: 10, total_pages: 1 });
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const loadPatients = useCallback(
    async (targetPage = 1) => {
      setLoading(true);
      try {
        const res = await patientService.list({
          search: search.trim() || undefined,
          gender: genderFilter || undefined,
          is_active: statusFilter || undefined,
          page: targetPage,
          per_page: meta.per_page,
        });
        setPatients(Array.isArray(res?.data) ? res.data : []);
        if (res?.meta) setMeta(res.meta);
      } catch (err) {
        setFeedback({ type: "error", message: err?.message || "Gagal memuat data pasien." });
      } finally {
        setLoading(false);
      }
    },
    [search, genderFilter, statusFilter, meta.per_page]
  );

  useEffect(() => {
    loadPatients(1);
  }, [loadPatients]);

  const handleOpenCreate = () => {
    setEditing(null);
    setFormData(INITIAL_FORM);
    setDialogOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditing(item);
    setFormData({
      medical_record_number: item.medical_record_number || "",
      national_id: item.national_id || "",
      full_name: item.full_name || "",
      birth_date: item.birth_date || "",
      gender: item.gender || "male",
      phone: item.phone || "",
      address: item.address || "",
      blood_type: item.blood_type || "",
      is_active: Boolean(item.is_active),
    });
    setDialogOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      const payload = {
        national_id: formData.national_id.trim() || null,
        full_name: formData.full_name.trim(),
        birth_date: formData.birth_date,
        gender: formData.gender,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        blood_type: formData.blood_type || null,
        is_active: Boolean(formData.is_active),
      };
      if (!editing && formData.medical_record_number.trim()) {
        payload.medical_record_number = formData.medical_record_number.trim();
      }

      if (editing) {
        await patientService.update(editing.id, payload);
        setFeedback({ type: "success", message: `Data pasien "${payload.full_name}" berhasil diperbarui.` });
      } else {
        const res = await patientService.create(payload);
        const mrn = res?.data?.medical_record_number || "";
        setFeedback({
          type: "success",
          message: `Pasien baru "${payload.full_name}" berhasil didaftarkan (${mrn}).`,
        });
      }
      setDialogOpen(false);
      loadPatients(meta.page);
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal menyimpan data pasien." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (item) => {
    if (!window.confirm(`Nonaktifkan pasien "${item.full_name}" (${item.medical_record_number})?`)) return;
    try {
      await patientService.remove(item.id);
      setFeedback({ type: "success", message: `Pasien "${item.full_name}" berhasil dinonaktifkan.` });
      loadPatients(meta.page);
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal menonaktifkan pasien." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <User className="h-6 w-6 text-primary" />
            Master Data Pasien
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola identitas pasien dan Nomor Rekam Medis (No. RM)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadPatients(meta.page)}>
            <RefreshCw className="h-4 w-4" />
            Muat Ulang
          </Button>
          {canCreate && (
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              Tambah Pasien
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
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Daftar Pasien ({meta.total})</CardTitle>
              <CardDescription>
                Pencarian berdasarkan No. RM, NIK, nama lengkap, atau nomor telepon
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari No. RM, NIK, nama..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Semua Gender</option>
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Semua Status</option>
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. RM</TableHead>
                <TableHead>Nama &amp; NIK</TableHead>
                <TableHead>Tgl Lahir / Gender</TableHead>
                <TableHead>Kontak &amp; Alamat</TableHead>
                <TableHead>Status</TableHead>
                {(canUpdate || canDelete) && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Memuat data pasien...
                  </TableCell>
                </TableRow>
              ) : patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                    Belum ada data pasien yang sesuai filter.
                  </TableCell>
                </TableRow>
              ) : (
                patients.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {p.medical_record_number}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-sm">{p.full_name}</div>
                      <div className="text-xs font-mono text-muted-foreground">
                        NIK: {p.national_id || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{formatDate(p.birth_date)}</div>
                      <div className="text-muted-foreground">
                        {p.gender === "male" ? "Laki-laki" : "Perempuan"}
                        {p.blood_type ? ` • Gol. ${p.blood_type}` : ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{p.phone || "-"}</div>
                      <div className="truncate max-w-[200px]">{p.address || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? "success" : "secondary"}>
                        {p.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    {(canUpdate || canDelete) && (
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          {canUpdate && (
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(p)}>
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && p.is_active && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleDeactivate(p)}
                            >
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

          <div className="mt-4 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
            <span>
              Halaman <strong>{meta.page}</strong> dari <strong>{meta.total_pages || 1}</strong> (Total {meta.total})
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page <= 1 || loading}
                onClick={() => loadPatients(meta.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" /> Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page >= (meta.total_pages || 1) || loading}
                onClick={() => loadPatients(meta.page + 1)}
              >
                Selanjutnya <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)}>
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editing ? `Edit Pasien (${editing.medical_record_number})` : "Tambah Pasien Baru"}</DialogTitle>
              <DialogDescription>
                Nomor Rekam Medis digenerate otomatis jika dikosongkan dan tidak diubah setelah ditetapkan.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-2">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="p-mrn">No. RM (Opsional saat baru)</Label>
                  <Input
                    id="p-mrn"
                    disabled={Boolean(editing)}
                    placeholder="Auto: RM-YYYYMM-XXXX"
                    value={formData.medical_record_number}
                    onChange={(e) => setFormData((p) => ({ ...p, medical_record_number: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-nik">NIK (Unik)</Label>
                  <Input
                    id="p-nik"
                    placeholder="16 digit NIK"
                    value={formData.national_id}
                    onChange={(e) => setFormData((p) => ({ ...p, national_id: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-name">Nama Lengkap</Label>
                <Input
                  id="p-name"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))}
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="p-dob">Tanggal Lahir</Label>
                  <Input
                    id="p-dob"
                    type="date"
                    required
                    value={formData.birth_date}
                    onChange={(e) => setFormData((p) => ({ ...p, birth_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-gender">Jenis Kelamin</Label>
                  <select
                    id="p-gender"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={formData.gender}
                    onChange={(e) => setFormData((p) => ({ ...p, gender: e.target.value }))}
                  >
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-blood">Gol. Darah</Label>
                  <select
                    id="p-blood"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={formData.blood_type}
                    onChange={(e) => setFormData((p) => ({ ...p, blood_type: e.target.value }))}
                  >
                    <option value="">-</option>
                    {["A", "B", "AB", "O"].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="p-phone">No. Telepon</Label>
                  <Input
                    id="p-phone"
                    placeholder="0812..."
                    value={formData.phone}
                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-addr">Alamat</Label>
                  <Input
                    id="p-addr"
                    value={formData.address}
                    onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Status Pasien Aktif</span>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, is_active: v }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan Pasien
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
