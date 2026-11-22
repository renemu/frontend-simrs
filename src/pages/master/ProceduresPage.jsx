import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
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
import { formatCurrency } from "../../lib/utils";
import { procedureService } from "../../services/master.service";

const CATEGORIES = [
  { value: "consultation", label: "Konsultasi" },
  { value: "action", label: "Tindakan Medis" },
  { value: "diagnostic", label: "Diagnostik" },
  { value: "laboratory", label: "Laboratorium" },
];

const INITIAL_FORM = {
  code: "",
  name: "",
  category: "action",
  tariff: 50000,
  description: "",
  is_active: true,
};

export default function ProceduresPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("master-procedures", "create");
  const canUpdate = hasPermission("master-procedures", "update");
  const canDelete = hasPermission("master-procedures", "delete");

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await procedureService.list({
        search: search.trim() || undefined,
        category: categoryFilter || undefined,
        per_page: 100,
      });
      setItems(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal memuat daftar tindakan medis." });
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleOpenCreate = () => {
    setEditing(null);
    setFormData(INITIAL_FORM);
    setDialogOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditing(item);
    setFormData({
      code: item.code || "",
      name: item.name || "",
      category: item.category || "action",
      tariff: item.tariff ?? 0,
      description: item.description || "",
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
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        category: formData.category,
        tariff: Number(formData.tariff) || 0,
        description: formData.description.trim() || null,
        is_active: Boolean(formData.is_active),
      };
      if (editing) {
        await procedureService.update(editing.id, payload);
        setFeedback({ type: "success", message: `Tindakan "${payload.name}" berhasil diperbarui.` });
      } else {
        await procedureService.create(payload);
        setFeedback({ type: "success", message: `Tindakan "${payload.name}" berhasil ditambahkan.` });
      }
      setDialogOpen(false);
      loadItems();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal menyimpan tindakan medis." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (item) => {
    if (!window.confirm(`Nonaktifkan tindakan "${item.name}"?`)) return;
    try {
      await procedureService.remove(item.id);
      setFeedback({ type: "success", message: `Tindakan "${item.name}" berhasil dinonaktifkan.` });
      loadItems();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal menonaktifkan tindakan." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Master Tindakan &amp; Tarif Medis
          </h1>
          <p className="text-sm text-muted-foreground">
            Katalog tindakan medis, diagnostik, dan laboratorium beserta tarif dasar (
            <code className="font-mono text-xs">/api/procedures</code>)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadItems}>
            <RefreshCw className="h-4 w-4" /> Muat Ulang
          </Button>
          {canCreate && (
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" /> Tambah Tindakan
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
              <CardTitle className="text-base">Daftar Tindakan ({items.length})</CardTitle>
              <CardDescription>Tarif akan di-snapshot saat tindakan dicatat pada kunjungan pasien</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative w-56">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari kode / nama..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Semua Kategori</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama Tindakan</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Tarif</TableHead>
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
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Belum ada data tindakan.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{item.code}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.description || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{item.category}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium">{formatCurrency(item.tariff)}</TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? "success" : "secondary"}>
                        {item.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    {(canUpdate || canDelete) && (
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          {canUpdate && (
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)}>
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && item.is_active && (
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeactivate(item)}>
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
              <DialogTitle>{editing ? "Edit Tindakan Medis" : "Tambah Tindakan Medis"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Kode Tindakan</Label>
                  <Input required placeholder="TND-INFUS" value={formData.code} onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Kategori</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={formData.category}
                    onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Nama Tindakan</Label>
                <Input required value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tarif (Rp)</Label>
                <Input type="number" min={0} required value={formData.tariff} onChange={(e) => setFormData((p) => ({ ...p, tariff: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Deskripsi</Label>
                <Input value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Status Aktif</span>
                <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData((p) => ({ ...p, is_active: v }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>Simpan Tindakan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
