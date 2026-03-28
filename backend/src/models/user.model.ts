export type Role =
  | 'portal.admin'
  | 'devops.read'
  | 'devops.approval.read'
  | 'devops.approval.write'
  | 'mlops.read'
  | 'config.admin';

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  groups: string[];
  roles: Role[];
  avatarInitials: string;
}

export interface MockUser {
  id: string;
  username: string;
  password: string; // Plain text for POC only
  displayName: string;
  email: string;
  groups: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: UserProfile;
  message?: string;
}

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    userId: string;
    user: UserProfile;
  }
}
