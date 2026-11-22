import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Shield,
  ShieldCheck,
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
import { moduleService } from "../../services/module.service";
import { roleService } from "../../services/role.service";

export default function RolesPage() {
  const { hasPermission, refreshMe } = useAuth();
  const canCreate = hasPermission("users-roles", "create");
  const canUpdate = hasPermission("users-roles", "update");
  const canDelete = hasPermission("users-roles", "delete");

  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [permissionDraft, setPermissionDraft] = useState([]);

  const [loading, setLoading] = useState(true);
  const [savingPerms, setSavingPerms] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Role modal
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: "", display_name: "" });
  const [savingRole, setSavingRole] = useState(false);

  const buildCompletePermissions = useCallback((role, allModules) => {
    const existing = Array.isArray(role?.module_permission)
      ? role.module_permission
      : [];
    const map = {};
    existing.forEach((p) => {
      if (p.module_code) {
        map[p.module_code] = {
          module_code: p.module_code,
          create: Boolean(p.create),
          read: Boolean(p.read),
          update: Boolean(p.update),
          delete: Boolean(p.delete),
        };
      }
    });

    allModules.forEach((m) => {
      if (m.code && !map[m.code]) {
        map[m.code] = {
          module_code: m.code,
          create: false,
          read: false,
          update: false,
          delete: false,
        };
      }
    });

    return Object.values(map);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, modsRes] = await Promise.all([
        roleService.list(),
        moduleService.list().catch(() => ({ data: [] })),
      ]);

      const rolesList = Array.isArray(rolesRes?.data) ? rolesRes.data : [];
      const modsList = Array.isArray(modsRes?.data) ? modsRes.data : [];

      setRoles(rolesList);
      setModules(modsList);

      if (rolesList.length > 0) {
        const active =
          rolesList.find((r) => r.id === selectedRole?.id) || rolesList[0];
        setSelectedRole(active);
        setPermissionDraft(buildCompletePermissions(active, modsList));
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Gagal memuat data roles & permissions.",
      });
    } finally {
      setLoading(false);
    }
  }, [buildCompletePermissions, selectedRole?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setPermissionDraft(buildCompletePermissions(role, modules));
    setFeedback({ type: "", message: "" });
  };

  const handleTogglePerm = (moduleCode, action) => {
    if (!canUpdate) return;
    setPermissionDraft((prev) =>
      prev.map((item) =>
        item.module_code === moduleCode
          ? { ...item, [action]: !item[action] }
          : item
      )
    );
  };

  const handleToggleRowAll = (moduleCode, enable) => {
    if (!canUpdate) return;
    setPermissionDraft((prev) =>
      prev.map((item) =>
        item.module_code === moduleCode
          ? {
              ...item,
              create: enable,
              read: enable,
              update: enable,
              delete: enable,
            }
          : item
      )
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSavingPerms(true);
    setFeedback({ type: "", message: "" });
    try {
      await roleService.updatePermissions(selectedRole.id, permissionDraft);
      await refreshMe();
      await loadData();
      setFeedback({
        type: "success",
        message: `Module permissions untuk role "${
          selectedRole.display_name || selectedRole.name
        }" berhasil disimpan.`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Gagal memperbarui permissions role.",
      });
    } finally {
      setSavingPerms(false);
    }
  };

  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setRoleForm({ name: "", display_name: "" });
    setDialogOpen(true);
  };

  const handleOpenEditRole = (role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name || "",
      display_name: role.display_name || "",
    });
    setDialogOpen(true);
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    setSavingRole(true);
    setFeedback({ type: "", message: "" });
    try {
      if (editingRole) {
        await roleService.update(editingRole.id, {
          name: roleForm.name.trim(),
          display_name: roleForm.display_name.trim(),
        });
        setFeedback({
          type: "success",
          message: `Role "${roleForm.display_name}" berhasil diperbarui.`,
        });
      } else {
        await roleService.create({
          name: roleForm.name.trim(),
          display_name: roleForm.display_name.trim(),
        });
        setFeedback({
          type: "success",
          message: `Role baru "${roleForm.display_name}" berhasil dibuat.`,
        });
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Gagal menyimpan role.",
      });
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (
      !window.confirm(
        `Apakah Anda yakin ingin menghapus role "${
          role.display_name || role.name
        }"?`
      )
    ) {
      return;
    }
    try {
      await roleService.remove(role.id);
      setFeedback({
        type: "success",
        message: `Role "${role.name}" berhasil dihapus.`,
      });
      loadData();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Gagal menghapus role.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Roles & Module Permissions
          </h1>
          <p className="text-sm text-muted-foreground">
            Atur role pengguna dan matriks hak akses CRUD untuk setiap{" "}
            <code className="font-mono text-xs">module_code</code> (
            <code className="font-mono text-xs">/api/roles</code> — Module Code:{" "}
            <code className="font-mono text-xs">users-roles</code>)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          {canCreate && (
            <Button size="sm" onClick={handleOpenCreateRole}>
              <Plus className="h-4 w-4" />
              Tambah Role
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
        {/* Left 4 Cols: Roles List */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Daftar Role ({roles.length})</CardTitle>
            <CardDescription>
              Pilih role untuk melihat dan mengubah matriks izin modulnya
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                Memuat daftar role...
              </div>
            ) : (
              roles.map((r) => {
                const isSelected = selectedRole?.id === r.id;
                const permCount = Array.isArray(r.module_permission)
                  ? r.module_permission.filter((p) => p.read).length
                  : 0;
                return (
                  <div
                    key={r.id}
                    onClick={() => handleSelectRole(r)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "hover:bg-accent/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Shield className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm">
                            {r.display_name || r.name}
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {r.name}
                          </div>
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleOpenEditRole(r)}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canDelete && r.name !== "superadmin" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleDeleteRole(r)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Akses Baca (Read)</span>
                      <Badge variant="secondary">{permCount} Modul</Badge>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Right 8 Cols: Interactive Module CRUD Permission Matrix */}
        <Card className="lg:col-span-8">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">
                  Matriks Permission:{" "}
                  {selectedRole?.display_name || selectedRole?.name || "-"}
                </CardTitle>
                {selectedRole && (
                  <Badge variant="outline" className="font-mono text-xs">
                    ID #{selectedRole.id}
                  </Badge>
                )}
              </div>
              <CardDescription>
                Endpoint:{" "}
                <code className="font-mono text-xs">
                  PUT /api/roles/{selectedRole?.id || ":id"}/permissions
                </code>
              </CardDescription>
            </div>

            {canUpdate && selectedRole && (
              <Button
                size="sm"
                onClick={handleSavePermissions}
                disabled={savingPerms}
              >
                {savingPerms ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Simpan Permissions
                  </>
                )}
              </Button>
            )}
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module Code</TableHead>
                  <TableHead className="text-center">Create</TableHead>
                  <TableHead className="text-center">Read</TableHead>
                  <TableHead className="text-center">Update</TableHead>
                  <TableHead className="text-center">Delete</TableHead>
                  <TableHead className="text-right">Aksi Cepat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissionDraft.map((item) => {
                  const modInfo = modules.find(
                    (m) => m.code === item.module_code
                  );
                  const allEnabled =
                    item.create && item.read && item.update && item.delete;
                  return (
                    <TableRow key={item.module_code}>
                      <TableCell>
                        <div className="font-medium text-sm">
                          {modInfo?.name || item.module_code}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {item.module_code}
                        </div>
                      </TableCell>
                      {["create", "read", "update", "delete"].map((action) => (
                        <TableCell key={action} className="text-center">
                          <Switch
                            disabled={!canUpdate}
                            checked={Boolean(item[action])}
                            onCheckedChange={() =>
                              handleTogglePerm(item.module_code, action)
                            }
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() =>
                              handleToggleRowAll(item.module_code, !allEnabled)
                            }
                          >
                            {allEnabled ? "Cabut Semua" : "Izinkan Semua"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit Role Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)}>
          <form onSubmit={handleSaveRole}>
            <DialogHeader>
              <DialogTitle>
                {editingRole ? "Edit Role" : "Buat Role Baru"}
              </DialogTitle>
              <DialogDescription>
                Tentukan kode unik role dan nama tampilan untuk sistem RBAC
                SIMRS.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="r-name">Kode Role (slug)</Label>
                <Input
                  id="r-name"
                  required
                  placeholder="contoh: doctor, nurse, pharmacist"
                  value={roleForm.name}
                  onChange={(e) =>
                    setRoleForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="r-display">Nama Tampilan (Display Name)</Label>
                <Input
                  id="r-display"
                  required
                  placeholder="contoh: Dokter Spesialis"
                  value={roleForm.display_name}
                  onChange={(e) =>
                    setRoleForm((p) => ({ ...p, display_name: e.target.value }))
                  }
                />
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
              <Button type="submit" disabled={savingRole}>
                {savingRole ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Simpan Role
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
