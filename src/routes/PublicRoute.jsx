import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Prevents authenticated users from seeing `/login` again; redirects them to `/dashboard`.
 */
export function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
