export interface AuthContext {
  userId?: string;
}

export type AuthRole =
  | "member"
  | "admin"
  | "super_admin"
  | "system"
  | "worker";

export interface AuthUserSummary {
  userId: string;
  memberCode: string;
  name: string;
  email: string | null;
  phone: string | null;
  isAdmin: boolean;
  adminRole?: string | null;
  matrixAutoOrderEnabled?: boolean;
  matrixReentryEnabled: boolean;
}

export interface LineBindingSummary {
  userId: string;
  memberCode: string;
  lineUserId: string;
  displayName: string | null;
  pictureUrl: string | null;
  statusMessage: string | null;
  source: string | null;
  boundAt: string;
  lastSyncedAt: string;
}

export interface AuthSessionResult {
  accessToken: string;
  user: AuthUserSummary;
}
