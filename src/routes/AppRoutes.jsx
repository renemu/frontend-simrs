import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import LoginPage from "../pages/auth/LoginPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import BillingsPage from "../pages/finance/BillingsPage";
import PaymentsPage from "../pages/finance/PaymentsPage";
import DoctorsPage from "../pages/master/DoctorsPage";
import MedicinesPage from "../pages/master/MedicinesPage";
import PatientsPage from "../pages/master/PatientsPage";
import ProceduresPage from "../pages/master/ProceduresPage";
import SchedulesPage from "../pages/master/SchedulesPage";
import LaboratoryPage from "../pages/outpatient/LaboratoryPage";
import MedicalRecordsPage from "../pages/outpatient/MedicalRecordsPage";
import PrescriptionsPage from "../pages/outpatient/PrescriptionsPage";
import QueuesPage from "../pages/outpatient/QueuesPage";
import RegistrationsPage from "../pages/outpatient/RegistrationsPage";
import NotFoundPage from "../pages/NotFoundPage";
import ModulesPage from "../pages/settings/ModulesPage";
import SettingsPage from "../pages/settings/SettingsPage";
import ActivityLogsPage from "../pages/users/ActivityLogsPage";
import RolesPage from "../pages/users/RolesPage";
import UsersPage from "../pages/users/UsersPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicRoute } from "./PublicRoute";

export function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Public Auth Route */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Protected Dashboard & SIMRS Module Routes matching backend-yii2 modules table */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute moduleCode="dashboard">
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Self-service Profile & UI Preferences (accessible to all authenticated roles) */}
        <Route path="/profile" element={<SettingsPage />} />

        {/* Master Data Group (FR-01 — Batch 2 Implemented) */}
        <Route
          path="/master/patients"
          element={
            <ProtectedRoute moduleCode="master-patients">
              <PatientsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/master/doctors"
          element={
            <ProtectedRoute moduleCode="master-doctors">
              <DoctorsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/master/schedules"
          element={
            <ProtectedRoute moduleCode="master-schedules">
              <SchedulesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/master/procedures"
          element={
            <ProtectedRoute moduleCode="master-procedures">
              <ProceduresPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/master/medicines"
          element={
            <ProtectedRoute moduleCode="master-medicines">
              <MedicinesPage />
            </ProtectedRoute>
          }
        />

        {/* Outpatient Clinical Flow Group (FR-02 to FR-06 — Batch 3 Implemented) */}
        <Route
          path="/outpatient/registrations"
          element={
            <ProtectedRoute moduleCode="registrations">
              <RegistrationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/outpatient/queues"
          element={
            <ProtectedRoute moduleCode="queues">
              <QueuesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/outpatient/medical-records"
          element={
            <ProtectedRoute moduleCode="medical-records">
              <MedicalRecordsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/outpatient/prescriptions"
          element={
            <ProtectedRoute moduleCode="prescriptions">
              <PrescriptionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/outpatient/laboratory"
          element={
            <ProtectedRoute moduleCode="laboratory">
              <LaboratoryPage />
            </ProtectedRoute>
          }
        />

        {/* Finance Group (FR-07 — Batch 4 Implemented) */}
        <Route
          path="/finance/billings"
          element={
            <ProtectedRoute moduleCode="billings">
              <BillingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance/payments"
          element={
            <ProtectedRoute moduleCode="payments">
              <PaymentsPage />
            </ProtectedRoute>
          }
        />

        {/* Users Management Group (FR-09) */}
        <Route
          path="/users"
          element={
            <ProtectedRoute moduleCode="users-list">
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/roles"
          element={
            <ProtectedRoute moduleCode="users-roles">
              <RolesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/logs"
          element={
            <ProtectedRoute moduleCode="users-logs">
              <ActivityLogsPage />
            </ProtectedRoute>
          }
        />

        {/* Settings Group */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute moduleCode="settings-apps">
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/apps"
          element={
            <ProtectedRoute moduleCode="settings-apps">
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/modules"
          element={
            <ProtectedRoute moduleCode="settings-modules">
              <ModulesPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback inside dashboard */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
