export interface AuthContext {
  userId?: string;
}

export interface AuthUserSummary {
  userId: string;
  memberCode: string;
  name: string;
  email: string | null;
}

export interface AuthSessionResult {
  accessToken: string;
  user: AuthUserSummary;
}
