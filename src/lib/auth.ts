import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "repairtrack-secret-key-2026";

export interface TokenUser {
  id: string;
  email: string;
  role: string;       // "superadmin" | "admin" | "tech"
  branchId: string | null;
}

export function getUserFromToken(request: Request): TokenUser | null {
  const auth = request.headers.get("Authorization");
  if (!auth) return null;
  try {
    const token = auth.replace("Bearer ", "");
    return jwt.verify(token, JWT_SECRET) as TokenUser;
  } catch {
    return null;
  }
}

export function requireAuth(request: Request): TokenUser {
  const user = getUserFromToken(request);
  if (!user) throw new Error("NO_AUTH");
  return user;
}

export function getBranchFilter(user: TokenUser, headerBranchId?: string | null): string | null {
  // superadmin can filter by any branch via header, or see all if none specified
  if (user.role === "superadmin") {
    return headerBranchId || null; // null = all branches
  }
  // admin and tech always scoped to their branch
  return user.branchId;
}

export function getEffectiveBranchId(request: Request, user: TokenUser): string | null {
  if (user.role === "superadmin") {
    // superadmin passes branchId via x-branch-id header
    return request.headers.get("x-branch-id") || null;
  }
  return user.branchId;
}

export { JWT_SECRET };
