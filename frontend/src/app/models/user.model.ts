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
