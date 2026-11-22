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
  UserPlus,
} from "lucide-react";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
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
import { formatDateTime, getInitials } from "../../lib/utils";
import { roleService } from "../../services/role.service";
import { userService } from "../../services/user.service";

const INITIAL_FORM = {
  name: "",
  email: "",
  phone: "",
  address: "",
  role_id: 2,
  is_active: true,
  password: "",
  theme: "default",
  sidebar_type: "floating",
};

export default function UsersPage() {
  const { user: currentUser, hasPermission } = useAuth();
  const canCreate = hasPermission("users-list", "create");
  const canUpdate = hasPermission("users-list", "update");
  const canDelete = hasPermission("users-list", "delete");

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    per_page: 10,
    total_pages: 1,
  });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const loadRoles = useCallback(async () => {
    try {
      const res = await roleService.list();
      if (Array.isArray(res?.data)) {
        setRoles(res.data);
      }
    } catch {
      // ignore if user lacks role list permission
    }
  }, []);

  const loadUsers = useCallback(
    async (targetPage = 1) => {
      setLoading(true);
      try {
        const res = await userService.list({
          search: search.trim() || undefined,
          role_id: roleFilter || undefined,
          is_active: statusFilter || undefined,
          include_deleted: includeDeleted ? "true" : undefined,
          page: targetPage,
          per_page: meta.per_page,
        });
        setUsers(Array.isArray(res?.data) ? res.data : []);
        if (res?.meta) {
          setMeta(res.meta);
        }
      } catch (err) {
        setFeedback({
          type: "error",
          message: err?.message || "Gagal memuat data pengguna.",
        });
      } finally {
        setLoading(false);
      }
    },
    [search, roleFilter, statusFilter, includeDeleted, meta.per_page]
  );

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    loadUsers(1);
  }, [loadUsers]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      ...INITIAL_FORM,
      role_id: roles[0]?.id || 2,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setFormData({
      name: u.name || "",
      email: u.email || "",
      phone: u.phone || "",
      address: u.address || "",
      role_id: u.role_id || 2,
      is_active: Boolean(u.is_active),
      password: "",
      theme: u.theme || "default",
      sidebar_type: u.sidebar_type || "floating",
    });
    setDialogOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        role_id: Number(formData.role_id),
        is_active: Boolean(formData.is_active),
        theme: formData.theme,
        sidebar_type: formData.sidebar_type,
      };
      if (formData.password) {
        payload.password = formData.password;
      }

      if (editingUser) {
        await userService.update(editingUser.id, payload);
        setFeedback({
          type: "success",
          message: `Data user ${payload.email} berhasil diperbarui.`,
        });
      } else {
        await userService.create(payload);
        setFeedback({
          type: "success",
          message: `User baru ${payload.email} berhasil ditambahkan.`,
        });
      }
      setDialogOpen(false);
      loadUsers(meta.page);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Gagal menyimpan data user.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (u) => {
    if (
      !window.confirm(
        `Apakah Anda yakin ingin menonaktifkan (soft delete) user "${u.email}"? Riwayat audit akan tetap dipertahankan.`
      )
    ) {
      return;
    }
    try {
      await userService.remove(u.id);
      setFeedback({
        type: "success",
        message: `User ${u.email} berhasil dinonaktifkan (soft delete).`,
      });
      loadUsers(meta.page);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Gagal menonaktifkan user.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Users</h1>
          <p className="text-sm text-muted-foreground">
            Kelola akun pengguna SIMRS, penugasan role, dan status aktif
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadUsers(meta.page)}
          >
            <RefreshCw className="h-4 w-4" />
            Muat Ulang
          </Button>
          {canCreate && (
            <Button size="sm" onClick={handleOpenCreate}>
              <UserPlus className="h-4 w-4" />
              Tambah User
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

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">
                Daftar Pengguna ({meta.total})
              </CardTitle>
              <CardDescription>
                Mendukung pencarian nama/email/telepon, filter role, dan soft
                delete
              </CardDescription>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama, email, telepon..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Semua Role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.display_name || r.name}
                  </option>
                ))}
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

              <label className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                <Switch
                  checked={includeDeleted}
                  onCheckedChange={setIncludeDeleted}
                />
                <span>Tampilkan Terhapus</span>
              </label>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">ID</TableHead>
                <TableHead>Pengguna</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Telepon / Alamat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Login Terakhir</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="inline-flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memuat daftar pengguna...
                    </div>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-28 text-center text-muted-foreground"
                  >
                    Tidak ada data pengguna yang sesuai filter.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow
                    key={u.id}
                    className={u.deleted_at ? "opacity-60 bg-destructive/5" : ""}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{u.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>
                            {getInitials(u.name || u.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-sm">
                            {u.name || "-"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {u.role?.display_name ||
                          u.role?.name ||
                          `Role #${u.role_id}`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{u.phone || "-"}</div>
                      <div className="truncate max-w-[180px]">
                        {u.address || ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.deleted_at ? (
                        <Badge variant="destructive">Deleted</Badge>
                      ) : u.is_active ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : (
                        <Badge variant="warning">Nonaktif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(u.last_login_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(u)}
                            title="Edit User"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && !u.deleted_at && u.id !== currentUser?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(u)}
                            title="Nonaktifkan (Soft Delete)"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Footer */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
            <div>
              Menampilkan halaman{" "}
              <strong className="text-foreground">{meta.page}</strong> dari{" "}
              <strong className="text-foreground">
                {meta.total_pages || 1}
              </strong>{" "}
              (Total {meta.total} user)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page <= 1 || loading}
                onClick={() => loadUsers(meta.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page >= (meta.total_pages || 1) || loading}
                onClick={() => loadUsers(meta.page + 1)}
              >
                Selanjutnya
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)}>
          <form onSubmit={handleSaveUser}>
            <DialogHeader>
              <DialogTitle>
                {editingUser
                  ? `Edit Pengguna #${editingUser.id}`
                  : "Tambah Pengguna Baru"}
              </DialogTitle>
              <DialogDescription>
                {editingUser
                  ? "Perbarui informasi profil, role, atau reset kata sandi pengguna."
                  : "Buat akun pengguna baru dan tentukan hak aksesnya."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="u-name">Nama Lengkap</Label>
                  <Input
                    id="u-name"
                    required
                    placeholder="Nama Lengkap"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="u-email">Email</Label>
                  <Input
                    id="u-email"
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, email: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="u-role">Role Akses</Label>
                  <select
                    id="u-role"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={formData.role_id}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, role_id: e.target.value }))
                    }
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.display_name || r.name} ({r.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="u-password">
                    {editingUser
                      ? "Password Baru (Kosongkan jika tetap)"
                      : "Password"}
                  </Label>
                  <Input
                    id="u-password"
                    type="password"
                    required={!editingUser}
                    minLength={6}
                    placeholder="Min. 6 karakter"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, password: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="u-phone">No. Telepon</Label>
                  <Input
                    id="u-phone"
                    placeholder="0812..."
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, phone: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="u-sidebar">Tipe Sidebar</Label>
                  <select
                    id="u-sidebar"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={formData.sidebar_type}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        sidebar_type: e.target.value,
                      }))
                    }
                  >
                    <option value="floating">Floating</option>
                    <option value="sidebar">Standard Sidebar</option>
                    <option value="inset">Inset</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="u-address">Alamat</Label>
                <Input
                  id="u-address"
                  placeholder="Alamat lengkap..."
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, address: e.target.value }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Status Akun Aktif</p>
                  <p className="text-xs text-muted-foreground">
                    Izinkan user ini login ke dalam sistem SIMRS
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((p) => ({ ...p, is_active: checked }))
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
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Simpan User
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
