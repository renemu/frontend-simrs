import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency } from "../../lib/utils";
import { departmentService, doctorService } from "../../services/master.service";

const EMPTY_DOCTOR = {
  department_id: "",
  sip_number: "",
  full_name: "",
  specialization: "",
  phone: "",
  consultation_fee: 50000,
  is_active: true,
};

const EMPTY_DEPT = {
  code: "",
  name: "",
  registration_fee: 35000,
  description: "",
  is_active: true,
};

export default function DoctorsPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("master-doctors", "create");
  const canUpdate = hasPermission("master-doctors", "update");
  const canDelete = hasPermission("master-doctors", "delete");

  const [tab, setTab] = useState("doctors");
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Doctor modal
  const [docModal, setDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [docForm, setDocForm] = useState(EMPTY_DOCTOR);

  // Department modal
  const [deptModal, setDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState(EMPTY_DEPT);
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [deptRes, docRes] = await Promise.all([
        departmentService.list({ per_page: 100 }),
        doctorService.list({
          search: search.trim() || undefined,
          department_id: deptFilter || undefined,
          per_page: 100,
        }),
      ]);
      setDepartments(Array.isArray(deptRes?.data) ? deptRes.data : []);
      setDoctors(Array.isArray(docRes?.data) ? docRes.data : []);
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal memuat data dokter & poliklinik." });
    } finally {
      setLoading(false);
    }
  }, [search, deptFilter]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openCreateDoctor = () => {
    setEditingDoc(null);
    setDocForm({ ...EMPTY_DOCTOR, department_id: departments[0]?.id || "" });
    setDocModal(true);
  };

  const openEditDoctor = (d) => {
    setEditingDoc(d);
    setDocForm({
      department_id: d.department_id || "",
      sip_number: d.sip_number || "",
      full_name: d.full_name || "",
      specialization: d.specialization || "",
      phone: d.phone || "",
      consultation_fee: d.consultation_fee ?? 0,
      is_active: Boolean(d.is_active),
    });
    setDocModal(true);
  };

  const saveDoctor = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      const payload = {
        department_id: Number(docForm.department_id),
        sip_number: docForm.sip_number.trim(),
        full_name: docForm.full_name.trim(),
        specialization: docForm.specialization.trim() || null,
        phone: docForm.phone.trim() || null,
        consultation_fee: Number(docForm.consultation_fee) || 0,
        is_active: Boolean(docForm.is_active),
      };
      if (editingDoc) {
        await doctorService.update(editingDoc.id, payload);
        setFeedback({ type: "success", message: `Dokter "${payload.full_name}" berhasil diperbarui.` });
      } else {
        await doctorService.create(payload);
        setFeedback({ type: "success", message: `Dokter "${payload.full_name}" berhasil ditambahkan.` });
      }
      setDocModal(false);
      loadAll();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal menyimpan data dokter." });
    } finally {
      setSaving(false);
    }
  };

  const deactivateDoctor = async (d) => {
    if (!window.confirm(`Nonaktifkan dokter "${d.full_name}"?`)) return;
    try {
      await doctorService.remove(d.id);
      setFeedback({ type: "success", message: `Dokter "${d.full_name}" berhasil dinonaktifkan.` });
      loadAll();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal menonaktifkan dokter." });
    }
  };

  const openCreateDept = () => {
    setEditingDept(null);
    setDeptForm(EMPTY_DEPT);
    setDeptModal(true);
  };

  const openEditDept = (dept) => {
    setEditingDept(dept);
    setDeptForm({
      code: dept.code || "",
      name: dept.name || "",
      registration_fee: dept.registration_fee ?? 0,
      description: dept.description || "",
      is_active: Boolean(dept.is_active),
    });
    setDeptModal(true);
  };

  const saveDept = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      const payload = {
        code: deptForm.code.trim().toUpperCase(),
        name: deptForm.name.trim(),
        registration_fee: Number(deptForm.registration_fee) || 0,
        description: deptForm.description.trim() || null,
        is_active: Boolean(deptForm.is_active),
      };
      if (editingDept) {
        await departmentService.update(editingDept.id, payload);
        setFeedback({ type: "success", message: `Poliklinik "${payload.name}" berhasil diperbarui.` });
      } else {
        await departmentService.create(payload);
        setFeedback({ type: "success", message: `Poliklinik "${payload.name}" berhasil ditambahkan.` });
      }
      setDeptModal(false);
      loadAll();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal menyimpan data poliklinik." });
    } finally {
      setSaving(false);
    }
  };

  const deactivateDept = async (dept) => {
    if (!window.confirm(`Nonaktifkan poliklinik "${dept.name}"?`)) return;
    try {
      await departmentService.remove(dept.id);
      setFeedback({ type: "success", message: `Poliklinik "${dept.name}" berhasil dinonaktifkan.` });
      loadAll();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal menonaktifkan poliklinik." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            Master Dokter &amp; Poliklinik
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola dokter/tenaga medis dan departemen/poliklinik rawat jalan (
            <code className="font-mono text-xs">/api/doctors</code> &amp;{" "}
            <code className="font-mono text-xs">/api/departments</code>)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadAll}>
            <RefreshCw className="h-4 w-4" />
            Muat Ulang
          </Button>
          {canCreate && tab === "doctors" && (
            <Button size="sm" onClick={openCreateDoctor}>
              <Plus className="h-4 w-4" /> Tambah Dokter
            </Button>
          )}
          {canCreate && tab === "departments" && (
            <Button size="sm" onClick={openCreateDept}>
              <Plus className="h-4 w-4" /> Tambah Poliklinik
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

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="doctors" className="gap-1.5">
            <Stethoscope className="h-4 w-4" /> Dokter ({doctors.length})
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-1.5">
            <Building2 className="h-4 w-4" /> Poliklinik ({departments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="doctors">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Daftar Dokter</CardTitle>
                  <CardDescription>Filter berdasarkan nama, SIP, spesialisasi, atau poliklinik</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative w-56">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari dokter / SIP..."
                      className="pl-9"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
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
                    <TableHead>Nama Dokter &amp; SIP</TableHead>
                    <TableHead>Poliklinik</TableHead>
                    <TableHead>Spesialisasi</TableHead>
                    <TableHead>Tarif Konsultasi</TableHead>
                    <TableHead>Status</TableHead>
                    {(canUpdate || canDelete) && <TableHead className="text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Memuat...
                      </TableCell>
                    </TableRow>
                  ) : doctors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Tidak ada data dokter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    doctors.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <div className="font-semibold text-sm">{d.full_name}</div>
                          <div className="font-mono text-xs text-muted-foreground">{d.sip_number}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{d.department?.name || `#${d.department_id}`}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{d.specialization || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{formatCurrency(d.consultation_fee)}</TableCell>
                        <TableCell>
                          <Badge variant={d.is_active ? "success" : "secondary"}>
                            {d.is_active ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </TableCell>
                        {(canUpdate || canDelete) && (
                          <TableCell className="text-right">
                            <div className="inline-flex gap-1">
                              {canUpdate && (
                                <Button variant="ghost" size="icon" onClick={() => openEditDoctor(d)}>
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && d.is_active && (
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deactivateDoctor(d)}>
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
        </TabsContent>

        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daftar Poliklinik / Departemen</CardTitle>
              <CardDescription>Setiap poliklinik memiliki kode unik dan biaya pendaftaran dasar</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama Poliklinik</TableHead>
                    <TableHead>Biaya Pendaftaran</TableHead>
                    <TableHead>Status</TableHead>
                    {(canUpdate || canDelete) && <TableHead className="text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">{dept.code}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-sm">{dept.name}</div>
                        <div className="text-xs text-muted-foreground">{dept.description || "-"}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{formatCurrency(dept.registration_fee)}</TableCell>
                      <TableCell>
                        <Badge variant={dept.is_active ? "success" : "secondary"}>
                          {dept.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      {(canUpdate || canDelete) && (
                        <TableCell className="text-right">
                          <div className="inline-flex gap-1">
                            {canUpdate && (
                              <Button variant="ghost" size="icon" onClick={() => openEditDept(dept)}>
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && dept.is_active && (
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deactivateDept(dept)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Doctor Dialog */}
      <Dialog open={docModal} onOpenChange={setDocModal}>
        <DialogContent onClose={() => setDocModal(false)}>
          <form onSubmit={saveDoctor}>
            <DialogHeader>
              <DialogTitle>{editingDoc ? "Edit Dokter" : "Tambah Dokter"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nama Lengkap</Label>
                  <Input required value={docForm.full_name} onChange={(e) => setDocForm((p) => ({ ...p, full_name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Nomor SIP</Label>
                  <Input required value={docForm.sip_number} onChange={(e) => setDocForm((p) => ({ ...p, sip_number: e.target.value }))} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Poliklinik</Label>
                  <select
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={docForm.department_id}
                    onChange={(e) => setDocForm((p) => ({ ...p, department_id: e.target.value }))}
                  >
                    <option value="">-- Pilih Poli --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Spesialisasi</Label>
                  <Input value={docForm.specialization} onChange={(e) => setDocForm((p) => ({ ...p, specialization: e.target.value }))} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Telepon</Label>
                  <Input value={docForm.phone} onChange={(e) => setDocForm((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tarif Konsultasi (Rp)</Label>
                  <Input type="number" min={0} required value={docForm.consultation_fee} onChange={(e) => setDocForm((p) => ({ ...p, consultation_fee: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Status Aktif</span>
                <Switch checked={docForm.is_active} onCheckedChange={(v) => setDocForm((p) => ({ ...p, is_active: v }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDocModal(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>Simpan Dokter</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Department Dialog */}
      <Dialog open={deptModal} onOpenChange={setDeptModal}>
        <DialogContent onClose={() => setDeptModal(false)}>
          <form onSubmit={saveDept}>
            <DialogHeader>
              <DialogTitle>{editingDept ? "Edit Poliklinik" : "Tambah Poliklinik"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Kode Poli</Label>
                  <Input required placeholder="POLI-MATA" value={deptForm.code} onChange={(e) => setDeptForm((p) => ({ ...p, code: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Biaya Pendaftaran (Rp)</Label>
                  <Input type="number" min={0} required value={deptForm.registration_fee} onChange={(e) => setDeptForm((p) => ({ ...p, registration_fee: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Nama Poliklinik</Label>
                <Input required value={deptForm.name} onChange={(e) => setDeptForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Deskripsi</Label>
                <Input value={deptForm.description} onChange={(e) => setDeptForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Status Aktif</span>
                <Switch checked={deptForm.is_active} onCheckedChange={(v) => setDeptForm((p) => ({ ...p, is_active: v }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeptModal(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>Simpan Poliklinik</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
