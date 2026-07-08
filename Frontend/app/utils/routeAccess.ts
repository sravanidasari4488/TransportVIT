export function normalizeRouteId(routeId?: string | null): string {
  return String(routeId || "").trim().toUpperCase();
}

export function routesMatch(assigned?: string | null, screenRouteId?: string | null): boolean {
  const a = normalizeRouteId(assigned);
  const b = normalizeRouteId(screenRouteId);
  if (!a || !b) return false;
  return a === b;
}

export function isStaffRole(role?: string | null): boolean {
  return role === "admin" || role === "faculty";
}

export function getStudentAssignedRoute(
  user?: { role?: string; busRoute?: string | null } | null,
  selectedRouteId?: string | null
): string | null {
  if (!user || isStaffRole(user.role)) return null;
  const raw = user.busRoute || selectedRouteId;
  if (raw == null || String(raw).trim() === "") return null;
  const normalized = normalizeRouteId(raw);
  return normalized.length > 0 ? normalized : null;
}
