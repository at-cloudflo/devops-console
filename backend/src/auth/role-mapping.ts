import { Role } from '../models/user.model';

/**
 * Maps Entra ID group names to portal roles.
 * In production, this mapping would be loaded from config or the Entra ID app manifest.
 * For the POC, it is hardcoded here to simulate the backend-owned role assignment.
 */
export const GROUP_ROLE_MAP: Record<string, Role[]> = {
  'entra-portal-admin': [
    'portal.admin',
    'devops.read',
    'devops.approval.read',
    'devops.approval.write',
    'mlops.read',
    'config.admin',
  ],
  'entra-devops-read': ['devops.read'],
  'entra-devops-approver': ['devops.approval.read', 'devops.approval.write'],
  'entra-mlops-read': ['mlops.read'],
  'entra-config-admin': ['config.admin'],
};

export function resolveRoles(groups: string[]): Role[] {
  const rolesSet = new Set<Role>();
  for (const group of groups) {
    const mapped = GROUP_ROLE_MAP[group] ?? [];
    mapped.forEach((r) => rolesSet.add(r));
  }
  return Array.from(rolesSet);
}

export function getInitials(displayName: string): string {
  return displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
