import { Role } from './user.model';

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  route?: string;
  children?: MenuItem[];
  requiredRoles?: Role[];
  badge?: string;
}
