import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Loader2,
  Pill,
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
import { medicineService } from "../../services/master.service";

const INITIAL_FORM = {
  code: "",
  name: "",
  unit: "tablet",
  stock: 0,
  min_stock: 10,
  unit_price: 2000,
  is_active: true,
};

export default function MedicinesPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("master-medicines", "create");
  const canUpdate = hasPermission("master-medicines", "update");
  const canDelete = hasPermission("master-medicines", "delete");

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await medicineService.list({
        search: search.trim() || undefined,
        low_stock: onlyLowStock ? "true" : undefined,
        per_page: 100,
      });
      setItems(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal memuat data obat." });
    } finally {
      setLoading(false);
    }
  }, [search, onlyLowStock]);

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
      unit: item.unit || "tablet",
      stock: item.stock ?? 0,
      min_stock: item.min_stock ?? 10,
      unit_price: item.unit_price ?? 0,
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
        unit: formData.unit.trim().toLowerCase(),
        stock: Number(formData.stock),
        min_stock: Number(formData.min_stock),
        unit_price: Number(formData.unit_price),
        is_active: Boolean(formData.is_active),
      };
      if (editing) {
        await medicineService.update(editing.id, payload);
        setFeedback({ type: "success", message: `Obat "${payload.name}" berhasil diperbarui.` });
      } else {
        await medicineService.create(payload);
        setFeedback({ type: "success", message: `Obat "${payload.name}" berhasil ditambahkan.` });
      }
      setDialogOpen(false);
      loadItems();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal menyimpan data obat." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (item) => {
    if (!window.confirm(`Nonaktifkan obat "${item.name}"?`)) return;
    try {
      await medicineService.remove(item.id);
      setFeedback({ type: "success", message: `Obat "${item.name}" berhasil dinonaktifkan.` });
      loadItems();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal menonaktifkan obat." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Pill className="h-6 w-6 text-primary" />
            Master Obat, Stok &amp; Harga
          </h1>
          <p className="text-sm text-muted-foreground">
            Pengelolaan inventaris farmasi dengan batasan stok non-negatif (
            <code className="font-mono text-xs">/api/medicines</code>)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadItems}>
            <RefreshCw className="h-4 w-4" /> Muat Ulang
          </Button>
          {canCreate && (
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" /> Tambah Obat
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
              <CardTitle className="text-base">Daftar Obat ({items.length})</CardTitle>
              <CardDescription>Pengurangan stok operasional terjadi atomik saat penyerahan resep oleh Farmasi</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-56">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari kode / nama obat..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={onlyLowStock} onCheckedChange={setOnlyLowStock} />
                <span>Stok Menipis</span>
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama Obat</TableHead>
                <TableHead>Satuan</TableHead>
                <TableHead>Stok / Min</TableHead>
                <TableHead>Harga Satuan</TableHead>
                <TableHead>Status</TableHead>
                {(canUpdate || canDelete) && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Memuat...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Belum ada data obat yang sesuai filter.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{item.code}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-sm">{item.name}</TableCell>
                    <TableCell className="text-xs capitalize text-muted-foreground">{item.unit}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm font-semibold">{item.stock}</span>
                        <span className="text-xs text-muted-foreground">/ {item.min_stock}</span>
                        {item.is_low_stock && (
                          <Badge variant="warning" className="gap-1 text-[10px]">
                            <AlertTriangle className="h-3 w-3" /> Menipis
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{formatCurrency(item.unit_price)}</TableCell>
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
              <DialogTitle>{editing ? "Edit Obat" : "Tambah Obat Baru"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Kode Obat</Label>
                  <Input required placeholder="OBT-PCM500" value={formData.code} onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Satuan</Label>
                  <Input required placeholder="tablet / kapsul / botol" value={formData.unit} onChange={(e) => setFormData((p) => ({ ...p, unit: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Nama Obat</Label>
                <Input required value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Stok</Label>
                  <Input type="number" min={0} required value={formData.stock} onChange={(e) => setFormData((p) => ({ ...p, stock: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Stok Minimum</Label>
                  <Input type="number" min={0} required value={formData.min_stock} onChange={(e) => setFormData((p) => ({ ...p, min_stock: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Harga Satuan (Rp)</Label>
                  <Input type="number" min={0} required value={formData.unit_price} onChange={(e) => setFormData((p) => ({ ...p, unit_price: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Status Aktif</span>
                <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData((p) => ({ ...p, is_active: v }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>Simpan Obat</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
