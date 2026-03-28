import path from 'path';
import fs from 'fs';
import { MockUser, UserProfile, LoginRequest } from '../models/user.model';
import { resolveRoles, getInitials } from './role-mapping';

let mockUsers: MockUser[] | null = null;

function loadUsers(): MockUser[] {
  if (mockUsers) return mockUsers;
  const filePath = path.join(__dirname, '../data/mock-users.json');
  mockUsers = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as MockUser[];
  return mockUsers;
}

export function authenticate(req: LoginRequest): UserProfile | null {
  const users = loadUsers();
  const user = users.find(
    (u) => u.username === req.username && u.password === req.password
  );
  if (!user) return null;
  return buildProfile(user);
}

export function getUserById(id: string): UserProfile | null {
  const users = loadUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return null;
  return buildProfile(user);
}

function buildProfile(user: MockUser): UserProfile {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    groups: user.groups,
    roles: resolveRoles(user.groups),
    avatarInitials: getInitials(user.displayName),
  };
}
