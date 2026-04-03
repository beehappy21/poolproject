export interface AuthContext {
  userId?: string;
}

export interface AuthUserSummary {
  userId: string;
  memberCode: string;
  name: string;
  email: string | null;
  phone: string | null;
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
