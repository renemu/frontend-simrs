# SIMRS Frontend Web Application (React.js)

Antarmuka web Single Page Application (SPA) untuk **SIMRS Rawat Jalan (PT Inova Medika Solusindo)** yang dibangun dengan **React 19**, **React Router v7**, **Tailwind CSS**, komponen UI bergaya **shadcn/ui**, dan **Lucide React**.

Aplikasi ini menyajikan alur kerja rawat jalan terintegrasi mulai dari manajemen master data, pendaftaran & antrean pasien, pemeriksaan dokter/rekam medis, resep & penyerahan obat farmasi, pemeriksaan laboratorium, penagihan (billing) & pembayaran kasir, dashboard analitik, hingga manajemen pengguna, role, modul, dan audit log.

---

## Batas Arsitektur & Integrasi Backend

1. **Presentation Layer Only**: Frontend tidak dipercaya untuk menegakkan aturan bisnis atau keamanan secara mandiri. Penyembunyian menu dan `ProtectedRoute` hanya untuk kenyamanan UX; seluruh validasi dan enforcement RBAC tetap dijalankan server-side oleh backend.
2. **Integrasi Dual-Backend**:
   - **Core Backend (`backend-yii2`, `REACT_APP_API_URL`)**: Sumber kebenaran untuk autentikasi JWT, master data, pendaftaran, antrean, rekam medis, tindakan, resep/stok obat, order & hasil lab, invoice, pembayaran (idempotent), serta manajemen user/role/modul/audit log.
   - **Supporting Services (`backend-node`, `REACT_APP_NODE_API_URL`)**: Digunakan oleh `dashboardService.getSummary()` (`/node-api/dashboard/summary`) untuk agregasi metrik dashboard, dengan mekanisme *graceful fallback* ke Yii2 (`/api/dashboard/metrics`) apabila service Node.js sedang offline.
3. **Mode Reverse Proxy Produksi (Docker / Nginx)**: Saat dibangun melalui `Dockerfile`, `REACT_APP_API_URL` dan `REACT_APP_NODE_API_URL` disetel ke `/` sehingga Nginx (`nginx.conf`) melakukan reverse proxy `/api/` ke `backend-yii2:8080` dan `/node-api/` ke `backend-node:3001`.

---

## Fitur Utama

- **Autentikasi JWT & RBAC Dinamis**
  - Halaman login (`/login`) lengkap dengan tombol *Quick Fill* untuk 6 akun role demo (Administrator, Pendaftaran, Dokter, Farmasi, Laboratorium, Kasir).
  - Sinkronisasi profil, daftar permission CRUD, dan hierarki menu sidebar secara otomatis melalui `GET /api/auth/me`.
  - Penanganan pencabutan sesi instan (`401 Unauthorized` / `session_version` berubah) melalui custom event global `simrs:unauthorized`.
  - Proteksi rute berbasis `moduleCode` & `action` (`ProtectedRoute`) dengan tampilan `403 — Akses Ditolak` bila role tidak memiliki izin.
- **Dashboard Pelayanan Rawat Jalan (`/dashboard`)**
  - Filter periode tanggal (`from` s/d `to`), ringkasan KPI kunjungan, tindakan medis, pemakaian obat, status pendapatan, distribusi kunjungan per poliklinik, dan daftar pemakaian obat teratas.
- **Master Data (`/master/*`)**
  - Pengelolaan data **Pasien**, **Dokter**, **Jadwal Dokter**, **Tindakan & Tarif**, serta **Obat & Stok**.
- **Pelayanan Rawat Jalan (`/outpatient/*`)**
  - **Pendaftaran Kunjungan**: registrasi pasien ke poliklinik & dokter dengan nomor antrean atomik.
  - **Antrean Poliklinik**: pemantauan dan pembaruan status antrean pasien.
  - **Rekam Medis & Tindakan**: pencatatan keluhan, diagnosis, catatan pemeriksaan, serta penambahan/pembatalan tindakan medis.
  - **Resep & Farmasi**: pembuatan resep oleh dokter, penyerahan obat (dispensing) dengan pengurangan stok atomik, serta pemantauan riwayat mutasi stok obat.
  - **Laboratorium**: pembuatan order lab, pembaruan status pemeriksaan, dan penginputan hasil laboratorium.
- **Billing & Pembayaran Kasir (`/finance/*`)**
  - **Tagihan (Billings)**: pembuatan invoice kunjungan, revisi tagihan pasca-terbit, dan cetak dokumen invoice.
  - **Pembayaran (Payments)**: pencatatan pembayaran tunai/non-tunai (termasuk pembayaran parsial) dengan generator `Idempotency-Key` otomatis untuk mencegah transaksi duplikat saat retry jaringan.
- **Manajemen Akses & Preferensi (`/users/*`, `/settings/*`, `/profile`)**
  - CRUD **Pengguna** (soft delete), CRUD **Role & Permission Matrix**, tampilan read-only **Log Aktivitas (`user_logs`)**, CRUD **Modul Hierarkis**, serta pengaturan **Profil, Kata Sandi, Tema Aksen, & Dark Mode**.

---

## Teknologi & Stack

| Komponen | Teknologi / Versi |
| :--- | :--- |
| Library UI | React `19.3.1`, React DOM `19.3.1` |
| Routing | React Router DOM `7.18.6` |
| Styling & Komponen | Tailwind CSS `3.4.19`, `class-variance-authority`, `clsx`, `tailwind-merge`, komponen bergaya shadcn/ui (`new-york`) |
| Ikon | `lucide-react` `1.77.0` |
| Build Tool | Create React App (`react-scripts` `5.0.1`) |
| Web Server (Docker) | Nginx `1.27-alpine` (SPA fallback + reverse proxy `/api/` & `/node-api/`) |

---

## Struktur Direktori Utama

```text
frontend/
├── public/                        # Aset statis & index.html
├── src/
│   ├── components/
│   │   ├── layout/                # AuthLayout, DashboardLayout, Header, Sidebar
│   │   └── ui/                    # Komponen UI reusable (alert, badge, button, card, dialog, input, table, tabs, dll.)
│   ├── context/
│   │   └── AuthContext.jsx        # State sesi JWT, user, permissions, menus, darkMode, tema, & health check API
│   ├── lib/
│   │   ├── icons.js               # Pemetaan ikon Lucide untuk menu modul dinamis
│   │   └── utils.js               # Helper className (cn), format mata uang, & tanggal lokal
│   ├── pages/
│   │   ├── auth/                  # LoginPage
│   │   ├── dashboard/             # DashboardPage
│   │   ├── master/                # PatientsPage, DoctorsPage, SchedulesPage, ProceduresPage, MedicinesPage
│   │   ├── outpatient/            # RegistrationsPage, QueuesPage, MedicalRecordsPage, PrescriptionsPage, LaboratoryPage
│   │   ├── finance/               # BillingsPage, PaymentsPage
│   │   ├── users/                 # UsersPage, RolesPage, ActivityLogsPage
│   │   ├── settings/              # SettingsPage, ModulesPage
│   │   └── NotFoundPage.jsx       # Halaman 404
│   ├── routes/
│   │   ├── AppRoutes.jsx          # Definisi seluruh rute & pemetaan moduleCode RBAC
│   │   ├── ProtectedRoute.jsx     # Guard autentikasi & otorisasi module_code
│   │   └── PublicRoute.jsx        # Guard rute publik (redirect jika sudah login)
│   ├── services/
│   │   ├── api.js                 # HTTP wrapper fetch (Bearer JWT, query params, ApiError, event 401)
│   │   ├── auth.service.js        # Endpoint /api/health & /api/auth/*
│   │   ├── master.service.js      # Endpoint CRUD master data (/api/patients, doctors, schedules, procedures, medicines)
│   │   ├── outpatient.service.js  # Endpoint /api/visits, medical-record, prescriptions, lab-orders, stock-movements
│   │   ├── finance.service.js     # Endpoint /api/invoices, /api/payments, & /node-api/dashboard/summary
│   │   ├── user.service.js        # Endpoint /api/users/*
│   │   ├── role.service.js        # Endpoint /api/roles/*
│   │   ├── module.service.js      # Endpoint /api/modules/*
│   │   └── userLog.service.js     # Endpoint /api/user-logs/*
│   ├── App.js                     # Root component (BrowserRouter + AuthProvider + AppRoutes)
│   └── index.js                   # Entrypoint React DOM
├── .env.example                   # Template variabel environment
├── components.json                # Konfigurasi gaya komponen shadcn/ui
├── tailwind.config.js             # Konfigurasi tema Tailwind CSS
├── Dockerfile                     # Multi-stage build (node:22-alpine -> nginx:1.27-alpine)
├── nginx.conf                     # Konfigurasi Nginx SPA & reverse proxy ke backend-yii2 / backend-node
└── package.json                   # Dependensi & npm scripts
```

---

## Persyaratan Sistem

- **Node.js** `>= 18` (disarankan **Node.js 22**, sesuai `Dockerfile`)
- **npm** `>= 9`
- **Backend Utama (`backend-yii2`)** aktif pada `http://localhost:8080`
- **Backend Pendukung (`backend-node`)** aktif pada `http://localhost:3001` *(opsional untuk dashboard karena memiliki fallback ke Yii2, namun disarankan aktif agar alur `FR-10` berjalan penuh)*

---

## Instalasi & Konfigurasi

### 1. Menjalankan Secara Lokal (Development)

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Konfigurasi Environment (`.env`)**
   Salin `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```

   Contoh isi `.env` untuk development lokal:
   ```env
   REACT_APP_API_URL=http://localhost:8080
   REACT_APP_NODE_API_URL=http://localhost:3001
   ```

   | Variabel | Default (Dev) | Default (Docker) | Deskripsi |
   | :--- | :--- | :--- | :--- |
   | `REACT_APP_API_URL` | `http://localhost:8080` | `/` | Base URL untuk Core API Yii2 (`/api/*`) |
   | `REACT_APP_NODE_API_URL` | `http://localhost:3001` | `/` | Base URL untuk Supporting Services Node.js (`/node-api/*`) |

3. **Jalankan Development Server**
   ```bash
   npm start
   ```
   Aplikasi dapat diakses pada `http://localhost:3000`.

### 2. Build Produksi

```bash
npm run build
```
Hasil bundle statis teroptimasi akan dibuat di direktori `build/`.

### 3. Menjalankan via Docker Compose (Root Repository)

Dari direktori root `simrs-apps/`:
```bash
docker compose up -d --build
```
Secara default di `docker-compose.yml`, container `simrs-frontend` mempublikasikan port `80` ke host port `${FRONTEND_PORT:-3001}` (dapat diakses melalui `http://localhost:3001` atau sesuai variabel `FRONTEND_PORT` di `.env` root), sekaligus bertindak sebagai reverse proxy untuk `/api/` dan `/node-api/`.

---

## Daftar Rute & Pemetaan Modul RBAC

| Rute | `module_code` | Halaman | Grup |
| :--- | :--- | :--- | :--- |
| `/login` | *(publik)* | `LoginPage` | Autentikasi |
| `/dashboard` | `dashboard` | `DashboardPage` | Dashboard |
| `/profile` | *(semua user login)* | `SettingsPage` | Profil Mandiri |
| `/master/patients` | `master-patients` | `PatientsPage` | Master Data |
| `/master/doctors` | `master-doctors` | `DoctorsPage` | Master Data |
| `/master/schedules` | `master-schedules` | `SchedulesPage` | Master Data |
| `/master/procedures` | `master-procedures` | `ProceduresPage` | Master Data |
| `/master/medicines` | `master-medicines` | `MedicinesPage` | Master Data |
| `/outpatient/registrations` | `registrations` | `RegistrationsPage` | Rawat Jalan |
| `/outpatient/queues` | `queues` | `QueuesPage` | Rawat Jalan |
| `/outpatient/medical-records` | `medical-records` | `MedicalRecordsPage` | Rawat Jalan |
| `/outpatient/prescriptions` | `prescriptions` | `PrescriptionsPage` | Rawat Jalan |
| `/outpatient/laboratory` | `laboratory` | `LaboratoryPage` | Rawat Jalan |
| `/finance/billings` | `billings` | `BillingsPage` | Billing & Kasir |
| `/finance/payments` | `payments` | `PaymentsPage` | Billing & Kasir |
| `/users` | `users-list` | `UsersPage` | Manajemen Akses |
| `/users/roles` | `users-roles` | `RolesPage` | Manajemen Akses |
| `/users/logs` | `users-logs` | `ActivityLogsPage` | Manajemen Akses |
| `/settings`, `/settings/apps` | `settings-apps` | `SettingsPage` | Pengaturan |
| `/settings/modules` | `settings-modules` | `ModulesPage` | Pengaturan |

---

## Akun Demo Default (Data Dummy Lokal)

Akun berikut dihasilkan oleh seeder `backend-yii2` (`./yii db/fresh-seed`) dan tersedia sebagai tombol *Quick Fill* pada halaman `/login`:

| Role | Slug | Email | Password |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin@example.com` | `admin123` |
| **Petugas Pendaftaran** | `registration` | `registration@example.com` | `pendaftaran123` |
| **Dokter** | `doctor` | `doctor@example.com` | `dokter123` |
| **Petugas Farmasi** | `pharmacy` | `pharmacy@example.com` | `farmasi123` |
| **Petugas Laboratorium** | `laboratory` | `laboratory@example.com` | `lab123` |
| **Kasir** | `cashier` | `cashier@example.com` | `kasir123` |

> **Catatan:** Seluruh akun dan data pasien/transaksi pada aplikasi ini adalah data dummy untuk keperluan demonstrasi assessment, bukan data klinis nyata.

---

## Skrip NPM Tersedia

| Perintah | Deskripsi |
| :--- | :--- |
| `npm start` | Menjalankan server development CRA pada `http://localhost:3000` dengan hot reload |
| `npm run build` | Mem-build bundle produksi ke direktori `build/` |
| `npm test` | Menjalankan Jest test runner dalam mode interaktif |

---

## Batasan & Catatan Implementasi (Known Gaps)

- **JavaScript vs TypeScript**: Implementasi frontend saat ini menggunakan JavaScript (`.js`/`.jsx`, dengan `"tsx": false` pada `components.json`). Migrasi ke TypeScript merupakan target stack sesuai `AGENTS.md` dan dicatat sebagai known gap proyek.
- **Unit Test Frontend**: File `src/App.test.js` saat ini masih berupa template bawaan Create React App. Verifikasi alur end-to-end dilakukan langsung terhadap API aktif dan koleksi Postman di `../docs/04-api/postman/`.
- **Penyimpanan Token**: Token JWT disimpan di `localStorage` (`simrs_jwt_token`) untuk kesederhanaan demo lokal; untuk deployment produksi nyata disarankan mempertimbangkan `HttpOnly` cookie dengan proteksi CSRF.
