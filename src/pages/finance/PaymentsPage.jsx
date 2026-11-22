import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Info,
  Loader2,
  Printer,
  RefreshCw,
  ShieldCheck,
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
import { formatCurrency, formatDateTime } from "../../lib/utils";
import { billingService, paymentService } from "../../services/finance.service";
import { printInvoiceDocument } from "./BillingsPage";

function generateIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `pay-${crypto.randomUUID()}`;
  }
  return `pay-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function PaymentsPage() {
  const { user, hasPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const canPay = hasPermission("payments", "create");

  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(
    () => searchParams.get("invoiceId") || ""
  );
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentChannel, setPaymentChannel] = useState("Tunai");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey);
  const [lastSubmitted, setLastSubmitted] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, payRes] = await Promise.all([
        billingService.list({ status: "issued", per_page: 50 }),
        paymentService.list({ per_page: 50 }),
      ]);
      const invList = Array.isArray(invRes?.data) ? invRes.data : [];
      setInvoices(invList);
      setPayments(Array.isArray(payRes?.data) ? payRes.data : []);
      setSelectedInvoiceId((prev) => {
        if (prev) return prev;
        const firstUnpaid = invList.find((i) => i.payment_status !== "paid");
        return firstUnpaid ? String(firstUnpaid.id) : invList[0] ? String(invList[0].id) : "";
      });
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal memuat data pembayaran." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeInvoice = invoices.find((i) => String(i.id) === String(selectedInvoiceId)) || null;

  const handleMethodChange = (method) => {
    setPaymentMethod(method);
    setPaymentChannel(method === "cash" ? "Tunai" : "QRIS Simulasi");
  };

  const submitPayment = async (useKey, customAmount) => {
    if (!activeInvoice) return;
    setSubmitting(true);
    setFeedback({ type: "", message: "" });
    try {
      const payload = {
        payment_method: paymentMethod,
        payment_channel: paymentChannel,
        amount: Number(customAmount),
        notes: notes.trim() || null,
      };
      const res = await paymentService.record(activeInvoice.id, payload, useKey);
      const isReplay = Boolean(res?.idempotent_replay);
      setLastSubmitted({ invoiceId: activeInvoice.id, key: useKey, amount: Number(customAmount) });

      if (isReplay) {
        setFeedback({
          type: "success",
          message: `Proteksi Idempotency aktif: request retry dengan key "${useKey}" mengembalikan pembayaran asli tanpa menduplikasi data.`,
        });
      } else {
        setFeedback({
          type: "success",
          message: `Pembayaran ${res?.data?.payment?.payment_reference} sebesar ${formatCurrency(payload.amount)} berhasil dicatat.`,
        });
        setAmount("");
        setNotes("");
        setIdempotencyKey(generateIdempotencyKey());
      }
      loadData();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal mencatat pembayaran." });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    await submitPayment(idempotencyKey, amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Pembayaran &amp; Bukti Kwitansi
          </h1>
          <p className="text-sm text-muted-foreground">
            Pembayaran tunai/non-tunai simulasi, pembayaran parsial bertahap, dan proteksi anti-duplikasi (Idempotency-Key)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4" /> Muat Ulang
        </Button>
      </div>

      {!canPay && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Anda masuk sebagai <strong>{user?.role?.display_name || user?.role?.name}</strong> (Mode Lihat Saja). Pencatatan pembayaran hanya diizinkan bagi akun <strong>Kasir</strong> (<code className="font-mono text-xs">cashier@example.com</code>).
          </AlertDescription>
        </Alert>
      )}

      {feedback.message && (
        <Alert variant={feedback.type === "error" ? "destructive" : "success"}>
          {feedback.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left 5 cols: Payment Form */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="text-base">Catat Pembayaran</CardTitle>
            <CardDescription>Mendukung pembayaran bertahap (parsial) maupun pelunasan penuh</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Pilih Invoice Aktif</Label>
                <select
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={selectedInvoiceId}
                  onChange={(e) => {
                    setSelectedInvoiceId(e.target.value);
                    setIdempotencyKey(generateIdempotencyKey());
                  }}
                >
                  <option value="">-- Pilih Invoice --</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} — {inv.patient?.full_name} (Sisa: {formatCurrency(inv.balance_amount)})
                    </option>
                  ))}
                </select>
              </div>

              {activeInvoice && (
                <div className="rounded-xl border bg-muted/30 p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Tagihan</span>
                    <span className="font-mono font-semibold">{formatCurrency(activeInvoice.total_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sudah Dibayar</span>
                    <span className="font-mono text-emerald-600">{formatCurrency(activeInvoice.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1.5 text-sm font-bold">
                    <span>Sisa Tagihan</span>
                    <span className="font-mono">{formatCurrency(activeInvoice.balance_amount)}</span>
                  </div>
                  <div className="pt-1 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => printInvoiceDocument(activeInvoice)}
                    >
                      <Printer className="h-3.5 w-3.5" /> Cetak Kwitansi
                    </Button>
                  </div>
                </div>
              )}

              {canPay && activeInvoice && activeInvoice.balance_amount > 0 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Metode</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={paymentMethod}
                        onChange={(e) => handleMethodChange(e.target.value)}
                      >
                        <option value="cash">Tunai (Cash)</option>
                        <option value="non_cash">Non-Tunai (Simulasi)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Kanal Pembayaran</Label>
                      {paymentMethod === "cash" ? (
                        <Input value={paymentChannel} onChange={(e) => setPaymentChannel(e.target.value)} />
                      ) : (
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                          value={paymentChannel}
                          onChange={(e) => setPaymentChannel(e.target.value)}
                        >
                          <option value="QRIS Simulasi">QRIS Simulasi</option>
                          <option value="Transfer Bank Simulasi">Transfer Bank Simulasi</option>
                          <option value="Kartu Debit Simulasi">Kartu Debit Simulasi</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>Nominal Pembayaran (Rp)</Label>
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => setAmount(String(activeInvoice.balance_amount))}
                      >
                        Isi Lunas ({formatCurrency(activeInvoice.balance_amount)})
                      </button>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      max={activeInvoice.balance_amount}
                      required
                      placeholder="Masukkan nominal bayar (parsial / penuh)"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Catatan (Opsional)</Label>
                    <Input
                      placeholder="Pembayaran tahap 1 / pelunasan..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <div className="rounded-lg border bg-muted/20 p-2.5 text-[11px] text-muted-foreground flex items-center justify-between gap-2">
                    <span className="truncate font-mono">
                      <ShieldCheck className="h-3.5 w-3.5 inline mr-1 text-emerald-600" />
                      Key: {idempotencyKey}
                    </span>
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Simpan Pembayaran
                  </Button>
                </>
              )}

              {canPay && lastSubmitted && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  disabled={submitting}
                  onClick={() => submitPayment(lastSubmitted.key, lastSubmitted.amount)}
                >
                  Simulasi Retry Jaringan (Uji Anti-Duplikasi Idempotency-Key)
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Right 7 cols: Payment History */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="text-base">Riwayat Pembayaran ({payments.length})</CardTitle>
            <CardDescription>Setiap transaksi memiliki referensi unik dan tidak menimpa pembayaran sebelumnya</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referensi &amp; Waktu</TableHead>
                  <TableHead>Invoice / Pasien</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Memuat...
                    </TableCell>
                  </TableRow>
                ) : payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Belum ada riwayat pembayaran.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-mono text-xs font-semibold">{p.payment_reference}</div>
                        <div className="text-[11px] text-muted-foreground">{formatDateTime(p.paid_at)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{p.patient_name || "-"}</div>
                        <div className="font-mono text-xs text-muted-foreground">{p.invoice_number}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {p.payment_channel || p.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-emerald-600">
                        {formatCurrency(p.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
