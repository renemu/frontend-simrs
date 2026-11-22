import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Shield,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { useAuth } from "../../context/AuthContext";

const SEEDER_ACCOUNTS = [
  {
    label: "Administrator",
    role: "superadmin / admin",
    email: "admin@example.com",
    password: "admin123",
    description: "Akses penuh CRUD ke seluruh modul & manajemen RBAC",
  },
  {
    label: "Regular User",
    role: "user",
    email: "user@example.com",
    password: "user123",
    description: "Akses standar sesuai permission role user",
  },
];

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/dashboard";

  const [tab, setTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Login state
  const [loginForm, setLoginForm] = useState({
    email: "admin@example.com",
    password: "admin123",
  });

  // Register state
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const handleQuickFill = (account) => {
    setTab("login");
    setError("");
    setLoginForm({
      email: account.email,
      password: account.password,
    });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setSubmitting(true);
    try {
      await login({
        email: loginForm.email.trim(),
        password: loginForm.password,
      });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err?.message || "Gagal melakukan autentikasi. Periksa kembali kredensial Anda.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setSubmitting(true);
    try {
      await register({
        name: registerForm.name.trim(),
        email: registerForm.email.trim(),
        phone: registerForm.phone.trim() || null,
        password: registerForm.password,
      });
      setSuccessMsg("Registrasi berhasil! Mengalihkan ke dashboard...");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err?.message || "Registrasi gagal. Periksa kembali data yang Anda masukkan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-2 text-left">
          <h2 className="text-2xl font-bold tracking-tight">
            Selamat Datang di SIMRS
          </h2>
          <p className="text-sm text-muted-foreground">
            Masuk menggunakan akun SIMRS Anda atau pilih akun seeder bawaan
            Backend Yii2 di bawah ini.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Autentikasi Gagal</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMsg && (
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Berhasil</AlertTitle>
            <AlertDescription>{successMsg}</AlertDescription>
          </Alert>
        )}

        <Tabs value={tab} onValueChange={(v) => { setTab(v); setError(""); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Masuk (Login)</TabsTrigger>
            <TabsTrigger value="register">Daftar Akun Baru</TabsTrigger>
          </TabsList>

          {/* LOGIN TAB */}
          <TabsContent value="login">
            <Card className="border-border/80 shadow-md">
              <form onSubmit={handleLoginSubmit}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Autentikasi JWT</CardTitle>
                  <CardDescription>
                    Terhubung ke endpoint{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                      POST /api/auth/login
                    </code>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Alamat Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        required
                        placeholder="admin@example.com"
                        className="pl-9"
                        value={loginForm.email}
                        onChange={(e) =>
                          setLoginForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Kata Sandi</Label>
                      <span className="text-xs text-muted-foreground">
                        Bcrypt $2y$ / $2b$
                      </span>
                    </div>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        className="pl-9 pr-10"
                        value={loginForm.password}
                        onChange={(e) =>
                          setLoginForm((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Memverifikasi Token...
                      </>
                    ) : (
                      <>
                        Masuk ke Dashboard
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* REGISTER TAB */}
          <TabsContent value="register">
            <Card className="border-border/80 shadow-md">
              <form onSubmit={handleRegisterSubmit}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Registrasi User</CardTitle>
                  <CardDescription>
                    Terhubung ke endpoint{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                      POST /api/auth/register
                    </code>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Nama Lengkap</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-name"
                        required
                        placeholder="dr. Andi Pratama"
                        className="pl-9"
                        value={registerForm.name}
                        onChange={(e) =>
                          setRegisterForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Alamat Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-email"
                        type="email"
                        required
                        placeholder="nama@rsud.go.id"
                        className="pl-9"
                        value={registerForm.email}
                        onChange={(e) =>
                          setRegisterForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-phone">No. Telepon (Opsional)</Label>
                    <Input
                      id="reg-phone"
                      placeholder="08123456789"
                      value={registerForm.phone}
                      onChange={(e) =>
                        setRegisterForm((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password">
                      Kata Sandi (Min. 6 karakter)
                    </Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-password"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        placeholder="Minimal 6 karakter"
                        className="pl-9"
                        value={registerForm.password}
                        onChange={(e) =>
                          setRegisterForm((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Memproses Registrasi...
                      </>
                    ) : (
                      <>
                        Daftar & Masuk
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Seeder Credentials Box (From backend-yii2 README.md) */}
        <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Akun Default Seeder (Backend Yii2)</span>
            </div>
            <Badge variant="outline" className="text-[10px]">
              Klik untuk isi otomatis
            </Badge>
          </div>

          <div className="grid gap-2">
            {SEEDER_ACCOUNTS.map((acc) => {
              const isSelected =
                loginForm.email === acc.email && tab === "login";
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickFill(acc)}
                  className={`flex items-start justify-between rounded-lg border p-2.5 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "bg-card hover:bg-accent/60"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{acc.label}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        <Shield className="h-2.5 w-2.5 mr-1 text-primary" />
                        {acc.role}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {acc.description}
                    </p>
                  </div>
                  <code className="text-[11px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded shrink-0">
                    {acc.email}
                  </code>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
