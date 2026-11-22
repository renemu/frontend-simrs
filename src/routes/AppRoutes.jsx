import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import LoginPage from "../pages/auth/LoginPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import NotFoundPage from "../pages/NotFoundPage";
import ModulesPage from "../pages/settings/ModulesPage";
import SettingsPage from "../pages/settings/SettingsPage";
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

      {/* Protected Dashboard & Module Routes matching backend-yii2 modules table */}
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

        {/* Users Management Group */}
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
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Settings Group */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute moduleCode="settings">
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/appearance"
          element={
            <ProtectedRoute moduleCode="settings-appearance">
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
          path="/settings/integration"
          element={
            <ProtectedRoute moduleCode="settings-integration">
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

        {/* Notification Route */}
        <Route
          path="/notification"
          element={
            <ProtectedRoute moduleCode="notification">
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback inside dashboard */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
