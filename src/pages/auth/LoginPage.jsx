import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Shield,
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
import { useAuth } from "../../context/AuthContext";

const DEMO_ACCOUNTS = [
  { label: "Administrator", role: "admin", email: "admin@example.com", password: "admin123" },
  { label: "Pendaftaran", role: "registration", email: "registration@example.com", password: "pendaftaran123" },
  { label: "Dokter", role: "doctor", email: "doctor@example.com", password: "dokter123" },
  { label: "Farmasi", role: "pharmacy", email: "pharmacy@example.com", password: "farmasi123" },
  { label: "Laboratorium", role: "laboratory", email: "laboratory@example.com", password: "lab123" },
  { label: "Kasir", role: "cashier", email: "cashier@example.com", password: "kasir123" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/dashboard";

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loginForm, setLoginForm] = useState({
    email: "admin@example.com",
    password: "admin123",
  });

  const handleQuickFill = (account) => {
    setError("");
    setLoginForm({ email: account.email, password: account.password });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login({
        email: loginForm.email.trim(),
        password: loginForm.password,
      });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(
        err?.message ||
          "Gagal masuk. Periksa kembali email dan kata sandi Anda."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-5">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Gagal Masuk</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="border-border/80 shadow-md">
          <form onSubmit={handleLoginSubmit}>
            <CardHeader className="pb-4 text-center">
              <CardTitle className="text-xl">Masuk SIMRS</CardTitle>
              <CardDescription>
                Masukkan email dan kata sandi akun Anda
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="nama@rumah-sakit.id"
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
                <Label htmlFor="password">Kata Sandi</Label>
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

            <CardFooter>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    Masuk
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="rounded-xl border bg-card/70 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Akun Demo</span>
            <span>Klik untuk isi otomatis</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {DEMO_ACCOUNTS.map((acc) => {
              const isSelected = loginForm.email === acc.email;
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickFill(acc)}
                  className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "hover:bg-accent/60"
                  }`}
                >
                  <span className="truncate">{acc.label}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1 shrink-0">
                    <Shield className="h-2.5 w-2.5 mr-0.5" />
                    {acc.role}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
