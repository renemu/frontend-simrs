import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  ListOrdered,
  Loader2,
  RefreshCw,
  Stethoscope,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useAuth } from "../../context/AuthContext";
import { getLocalTodayDate } from "../../lib/utils";
import { departmentService } from "../../services/master.service";
import { visitService } from "../../services/outpatient.service";

const STATUS_BADGE = {
  waiting: { label: "Menunggu", variant: "warning" },
  called: { label: "Dipanggil", variant: "default" },
  in_examination: { label: "Sedang Diperiksa", variant: "secondary" },
  completed: { label: "Selesai", variant: "success" },
  cancelled: { label: "Dibatalkan", variant: "destructive" },
};

export default function QueuesPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const canUpdateQueue = hasPermission("queues", "update");
  const canExamine = hasPermission("medical-records", "read");

  const [visits, setVisits] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [dateFilter, setDateFilter] = useState(() => getLocalTodayDate());
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const loadQueues = useCallback(async () => {
    setLoading(true);
    try {
      const res = await visitService.list({
        visit_date: dateFilter || undefined,
        department_id: deptFilter || undefined,
        queue_status: statusFilter || undefined,
        per_page: 100,
      });
      setVisits(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal memuat antrean poliklinik." });
    } finally {
      setLoading(false);
    }
  }, [dateFilter, deptFilter, statusFilter]);

  useEffect(() => {
    departmentService
      .list({ is_active: "true", per_page: 100 })
      .then((res) => setDepartments(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadQueues();
  }, [loadQueues]);

  const updateStatus = async (visit, nextStatus) => {
    setFeedback({ type: "", message: "" });
    try {
      await visitService.updateQueueStatus(visit.id, nextStatus);
      setFeedback({
        type: "success",
        message: `Antrean ${visit.queue_code} diperbarui menjadi "${STATUS_BADGE[nextStatus]?.label || nextStatus}".`,
      });
      loadQueues();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal mengubah status antrean." });
    }
  };

  const waitingCount = visits.filter((v) => v.queue_status === "waiting").length;
  const inExamCount = visits.filter((v) => v.queue_status === "in_examination" || v.queue_status === "called").length;
  const doneCount = visits.filter((v) => v.queue_status === "completed").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ListOrdered className="h-6 w-6 text-primary" />
            Antrean Poliklinik
          </h1>
          <p className="text-sm text-muted-foreground">
            Pemantauan nomor antrean harian, pemanggilan pasien, dan alur masuk ruang periksa
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadQueues}>
          <RefreshCw className="h-4 w-4" /> Muat Ulang
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Menunggu</CardDescription>
            <CardTitle className="text-2xl">{waitingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Dipanggil / Diperiksa</CardDescription>
            <CardTitle className="text-2xl">{inExamCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Selesai Diperiksa</CardDescription>
            <CardTitle className="text-2xl">{doneCount}</CardTitle>
          </CardHeader>
        </Card>
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
            <CardTitle className="text-base">Daftar Antrean ({visits.length})</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Input
                type="date"
                className="w-40"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Semua Poli</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Semua Status</option>
                <option value="waiting">Menunggu</option>
                <option value="called">Dipanggil</option>
                <option value="in_examination">Sedang Diperiksa</option>
                <option value="completed">Selesai</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Antrean</TableHead>
                <TableHead>Pasien</TableHead>
                <TableHead>Poli / Dokter</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Memuat antrean...
                  </TableCell>
                </TableRow>
              ) : visits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Tidak ada antrean untuk tanggal dan filter yang dipilih.
                  </TableCell>
                </TableRow>
              ) : (
                visits.map((v) => {
                  const badge = STATUS_BADGE[v.queue_status] || { label: v.queue_status, variant: "secondary" };
                  return (
                    <TableRow key={v.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono font-bold text-sm px-2.5 py-0.5">
                          {v.queue_code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-sm">{v.patient?.full_name}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {v.patient?.medical_record_number} • {v.visit_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{v.department?.name}</div>
                        <div className="text-xs text-muted-foreground">{v.doctor?.full_name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          {canUpdateQueue && v.queue_status === "waiting" && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(v, "called")}>
                              <BellRing className="h-3.5 w-3.5" /> Panggil
                            </Button>
                          )}
                          {canExamine && v.status !== "cancelled" && (
                            <Button
                              size="sm"
                              onClick={() => navigate(`/outpatient/medical-records?visitId=${v.id}`)}
                            >
                              <Stethoscope className="h-3.5 w-3.5" /> Periksa
                            </Button>
                          )}
                          {canUpdateQueue &&
                            (v.queue_status === "called" || v.queue_status === "in_examination") && (
                              <Button size="sm" variant="secondary" onClick={() => updateStatus(v, "completed")}>
                                Selesai
                              </Button>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
