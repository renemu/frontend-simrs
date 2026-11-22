import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  AlertCircle,
  AppWindow,
  Bell,
  CheckCircle2,
  Loader2,
  Moon,
  Palette,
  Save,
  ShieldCheck,
  Sun,
  User as UserIcon,
} from "lucide-react";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { useAuth } from "../../context/AuthContext";
import { formatDateTime } from "../../lib/utils";

const THEME_OPTIONS = [
  { id: "default", label: "Royal Blue (Default)", color: "bg-blue-600" },
  { id: "emerald", label: "Clinical Emerald", color: "bg-emerald-600" },
  { id: "violet", label: "Modern Violet", color: "bg-violet-600" },
  { id: "teal", label: "Hospital Teal", color: "bg-teal-600" },
];

const SIDEBAR_TYPES = [
  {
    id: "floating",
    label: "Floating Sidebar",
    desc: "Sidebar melayang dengan sudut membulat modern",
  },
  {
    id: "sidebar",
    label: "Standard Bordered",
    desc: "Sidebar penuh di sisi kiri dengan garis batas vertikal",
  },
  {
    id: "inset",
    label: "Inset Compact",
    desc: "Tata letak sidebar rapat terintegrasi dengan area konten",
  },
];

export default function SettingsPage() {
  const {
    user,
    darkMode,
    setDarkMode,
    updateProfile,
  } = useAuth();
  const location = useLocation();

  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || "",
    password: "",
    theme: user?.theme || "default",
    sidebar_type: user?.sidebar_type || "floating",
  });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      const payload = {
        name: profileForm.name.trim(),
        phone: profileForm.phone.trim() || null,
        address: profileForm.address.trim() || null,
        theme: profileForm.theme,
        sidebar_type: profileForm.sidebar_type,
      };
      if (profileForm.password) {
        payload.password = profileForm.password;
      }
      await updateProfile(payload);
      setProfileForm((p) => ({ ...p, password: "" }));
      setFeedback({
        type: "success",
        message: "Profil, tema, dan preferensi tampilan berhasil disimpan.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err?.message || "Gagal memperbarui profil.",
      });
    } finally {
      setSaving(false);
    }
  };

  const isLogsView = location.pathname.includes("/logs");
  const isNotificationView = location.pathname.includes("/notification");

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          {isLogsView
            ? "Sesi & Keamanan Akun"
            : isNotificationView
            ? "Pusat Notifikasi SIMRS"
            : "Pengaturan Profil & Tampilan"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Kelola informasi profil pengguna, tema warna, dan preferensi tata
          letak aplikasi
        </p>
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

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
        {/* Left 7 Cols: Profile & Appearance Form */}
        <Card className="lg:col-span-7 min-w-0">
          <form onSubmit={handleSaveProfile}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-primary" />
                Profil Pengguna &amp; Preferensi Tampilan
              </CardTitle>
              <CardDescription>
                Perubahan profil, tema, dan gaya sidebar akan langsung
                diterapkan pada akun Anda
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="p-name">Nama Lengkap</Label>
                  <Input
                    id="p-name"
                    value={profileForm.name}
                    onChange={(e) =>
                      setProfileForm((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={user?.email || ""} disabled />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="p-phone">Nomor Telepon</Label>
                  <Input
                    id="p-phone"
                    placeholder="0812..."
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm((p) => ({ ...p, phone: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-pass">
                    Ganti Password (Opsional, Min. 6 karakter)
                  </Label>
                  <Input
                    id="p-pass"
                    type="password"
                    minLength={6}
                    placeholder="Kosongkan jika tidak diubah"
                    value={profileForm.password}
                    onChange={(e) =>
                      setProfileForm((p) => ({
                        ...p,
                        password: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-addr">Alamat</Label>
                <Input
                  id="p-addr"
                  placeholder="Alamat lengkap..."
                  value={profileForm.address}
                  onChange={(e) =>
                    setProfileForm((p) => ({ ...p, address: e.target.value }))
                  }
                />
              </div>

              {/* Theme Color Picker */}
              <div className="space-y-2.5 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  <Label>Warna Tema Utama</Label>
                </div>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {THEME_OPTIONS.map((t) => {
                    const active = profileForm.theme === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          setProfileForm((p) => ({ ...p, theme: t.id }))
                        }
                        className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                          active
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "hover:bg-accent/50"
                        }`}
                      >
                        <span
                          className={`h-5 w-5 rounded-full shrink-0 ${t.color} shadow-xs`}
                        />
                        <span className="text-xs font-medium">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sidebar Layout Style */}
              <div className="space-y-2.5 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <AppWindow className="h-4 w-4 text-primary" />
                  <Label>Gaya Tata Letak Sidebar</Label>
                </div>
                <div className="grid gap-2">
                  {SIDEBAR_TYPES.map((st) => {
                    const active = profileForm.sidebar_type === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() =>
                          setProfileForm((p) => ({
                            ...p,
                            sidebar_type: st.id,
                          }))
                        }
                        className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-left transition-all ${
                          active
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "hover:bg-accent/50"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold">
                            {st.label}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {st.desc}
                          </div>
                        </div>
                        <Badge variant={active ? "default" : "outline"} className="shrink-0">
                          {active ? "Aktif" : "Pilih"}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dark Mode Switch */}
              <div className="flex items-center justify-between gap-3 rounded-xl border p-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  {darkMode ? (
                    <Moon className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <Sun className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Mode Tampilan Gelap</div>
                    <div className="text-xs text-muted-foreground">
                      Aktifkan tema gelap ramah mata untuk shift malam RS
                    </div>
                  </div>
                </div>
                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
              </div>
            </CardContent>

            <CardFooter className="justify-end">
              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Simpan Pengaturan
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Right 5 Cols: Account & Active Session Info */}
        <div className="lg:col-span-5 space-y-6 min-w-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {isNotificationView ? (
                  <Bell className="h-4 w-4 text-primary" />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-primary" />
                )}
                Informasi Akun &amp; Sesi
              </CardTitle>
              <CardDescription>
                Ringkasan status akun dan riwayat login terakhir Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2 py-1.5 border-b">
                <span className="text-muted-foreground">Nama Pengguna</span>
                <span className="font-medium truncate">{user?.name || "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-2 py-1.5 border-b">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium truncate">{user?.email || "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-2 py-1.5 border-b">
                <span className="text-muted-foreground">Peran (Role)</span>
                <Badge variant="secondary">
                  {user?.role?.display_name || user?.role?.name || "-"}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2 py-1.5 border-b">
                <span className="text-muted-foreground">Status Sesi</span>
                <Badge variant="success">Aktif</Badge>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 mt-2">
                <p className="text-muted-foreground">
                  Login Terakhir:{" "}
                  <span className="text-foreground font-medium">
                    {formatDateTime(user?.last_login_at)}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Profil Diperbarui:{" "}
                  <span className="text-foreground font-medium">
                    {formatDateTime(user?.updated_at)}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
