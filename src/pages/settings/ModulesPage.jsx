import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  FolderTree,
  ListTree,
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
import { DynamicIcon, ICON_MAP } from "../../lib/icons";
import { moduleService } from "../../services/module.service";

const INITIAL_MODULE = {
  name: "",
  code: "",
  icon: "LayoutDashboardIcon",
  path: "",
  parent_id: "",
  sort_order: 1,
  type: 1,
  create: false,
  read: true,
  update: false,
  delete: false,
};

export default function ModulesPage() {
  const { hasPermission, refreshMe } = useAuth();
  const canCreate = hasPermission("settings-modules", "create");
  const canUpdate = hasPermission("settings-modules", "update");
  const canDelete = hasPermission("settings-modules", "delete");

  const [modules, setModules] = useState([]);
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMod, setEditingMod] = useState(null);
  const [formData, setFormData] = useState(INITIAL_MODULE);
  const [saving, setSaving] = useState(false);

  const loadModules = useCallback(async () => {
    setLoading(true);
    try {
      const [flatRes, treeRes] = await Promise.all([
        moduleService.list(),
        moduleService.getTree(),
      ]);
      setModules(Array.isArray(flatRes?.data) ? flatRes.data : []);
      setTree(Array.isArray(treeRes?.data) ? treeRes.data : []);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Gagal memuat data modul.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const handleOpenCreate = () => {
    setEditingMod(null);
    setFormData(INITIAL_MODULE);
    setDialogOpen(true);
  };

  const handleOpenEdit = (mod) => {
    setEditingMod(mod);
    setFormData({
      name: mod.name || "",
      code: mod.code || "",
      icon: mod.icon || "LayoutDashboardIcon",
      path: mod.path || "",
      parent_id: mod.parent_id ?? "",
      sort_order: mod.sort_order ?? 1,
      type: mod.type ?? 1,
      create: Boolean(mod.create),
      read: Boolean(mod.read),
      update: Boolean(mod.update),
      delete: Boolean(mod.delete),
    });
    setDialogOpen(true);
  };

  const handleSaveModule = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim() || null,
        icon: formData.icon.trim() || null,
        path: formData.path.trim() || null,
        parent_id:
          formData.parent_id === "" || formData.parent_id === null
            ? null
            : Number(formData.parent_id),
        sort_order: Number(formData.sort_order) || 0,
        type: Number(formData.type) || 0,
        create: Boolean(formData.create),
        read: Boolean(formData.read),
        update: Boolean(formData.update),
        delete: Boolean(formData.delete),
      };

      if (editingMod) {
        await moduleService.update(editingMod.id, payload);
        setFeedback({
          type: "success",
          message: `Modul "${payload.name}" berhasil diperbarui.`,
        });
      } else {
        await moduleService.create(payload);
        setFeedback({
          type: "success",
          message: `Modul baru "${payload.name}" berhasil ditambahkan.`,
        });
      }
      setDialogOpen(false);
      await loadModules();
      await refreshMe();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Gagal menyimpan modul.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModule = async (mod) => {
    if (
      !window.confirm(`Apakah Anda yakin ingin menghapus modul "${mod.name}"?`)
    ) {
      return;
    }
    try {
      await moduleService.remove(mod.id);
      setFeedback({
        type: "success",
        message: `Modul "${mod.name}" berhasil dihapus.`,
      });
      await loadModules();
      await refreshMe();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Gagal menghapus modul.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Manajemen Modul & Hierarki Menu
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola struktur pohon menu sidebar dan kode modul RBAC (
            <code className="font-mono text-xs">/api/modules</code> &{" "}
            <code className="font-mono text-xs">/api/modules/tree</code>)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadModules}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          {canCreate && (
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              Tambah Modul
            </Button>
          )}
        </div>
      </div>

      {feedback.message && (
        <Alert
          variant={feedback.type === "error" ? "destructive" : "success"}
        >
          {feedback.type === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left 5 Cols: Hierarchical Tree Preview from GET /api/modules/tree */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-primary" />
              Struktur Hierarki Pohon Menu
            </CardTitle>
            <CardDescription>
              Visualisasi <code className="font-mono text-xs">parent_id</code>{" "}
              &rarr; <code className="font-mono text-xs">children</code> dari
              Backend Yii2
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                Memuat pohon modul...
              </div>
            ) : (
              tree.map((node) => (
                <div
                  key={node.id}
                  className="rounded-xl border bg-muted/20 p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <DynamicIcon name={node.icon} className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{node.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {node.code} • {node.path || "(group)"}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline">Order: {node.sort_order}</Badge>
                  </div>

                  {Array.isArray(node.children) && node.children.length > 0 && (
                    <div className="ml-4 space-y-1.5 border-l-2 border-primary/20 pl-3 pt-1">
                      {node.children.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <DynamicIcon
                              name={child.icon}
                              className="h-3.5 w-3.5 text-muted-foreground"
                            />
                            <span className="font-medium">{child.name}</span>
                            <code className="text-[11px] text-muted-foreground">
                              ({child.code})
                            </code>
                          </div>
                          <span className="font-mono text-[11px] text-primary">
                            {child.path}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right 7 Cols: Flat Modules Table */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ListTree className="h-4 w-4 text-primary" />
              Daftar Seluruh Modul ({modules.length})
            </CardTitle>
            <CardDescription>
              Klik ikon edit untuk mengubah nama, path, icon, atau urutan menu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nama Modul</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((mod) => (
                  <TableRow key={mod.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{mod.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <DynamicIcon
                          name={mod.icon}
                          className="h-4 w-4 text-primary shrink-0"
                        />
                        <span className="font-medium text-sm">{mod.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {mod.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {mod.path || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {mod.parent_id ? `#${mod.parent_id}` : "Root"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(mod)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDeleteModule(mod)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit Module Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)}>
          <form onSubmit={handleSaveModule}>
            <DialogHeader>
              <DialogTitle>
                {editingMod ? `Edit Modul #${editingMod.id}` : "Tambah Modul Baru"}
              </DialogTitle>
              <DialogDescription>
                Konfigurasi modul dan posisi menu di dalam hierarki navigasi
                SIMRS.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="m-name">Nama Menu / Modul</Label>
                  <Input
                    id="m-name"
                    required
                    placeholder="Contoh: Rawat Jalan"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-code">Module Code (Unik)</Label>
                  <Input
                    id="m-code"
                    required
                    placeholder="Contoh: outpatient-care"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, code: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="m-path">Route Path</Label>
                  <Input
                    id="m-path"
                    placeholder="/outpatient"
                    value={formData.path}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, path: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-icon">Ikon Lucide</Label>
                  <select
                    id="m-icon"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={formData.icon}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, icon: e.target.value }))
                    }
                  >
                    {Object.keys(ICON_MAP)
                      .filter((k) => k.endsWith("Icon"))
                      .map((iconName) => (
                        <option key={iconName} value={iconName}>
                          {iconName}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="m-parent">Parent Modul</Label>
                  <select
                    id="m-parent"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={formData.parent_id}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, parent_id: e.target.value }))
                    }
                  >
                    <option value="">-- Root (Menu Utama) --</option>
                    {modules
                      .filter((m) => !editingMod || m.id !== editingMod.id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          #{m.id} - {m.name} ({m.code})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-order">Urutan (Sort Order)</Label>
                  <Input
                    id="m-order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, sort_order: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Modul"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
