import { Request, Response } from 'express';
import { Role } from '../models/user.model';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  route?: string;
  children?: MenuItem[];
  requiredRoles?: Role[];
  badge?: string;
}

const FULL_MENU: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'bi-grid-1x2-fill',
    route: '/dashboard',
    requiredRoles: [],
  },
  {
    id: 'devops',
    label: 'DevOps Infra',
    icon: 'bi-hdd-stack-fill',
    requiredRoles: ['devops.read'],
    children: [
      { id: 'devops-pools', label: 'Agent Pools', icon: 'bi-collection-fill', route: '/devops/pools', requiredRoles: ['devops.read'] },
      { id: 'devops-agents', label: 'Agents', icon: 'bi-cpu-fill', route: '/devops/agents', requiredRoles: ['devops.read'] },
      { id: 'devops-queue', label: 'Queue', icon: 'bi-list-task', route: '/devops/queue', requiredRoles: ['devops.read'] },
      { id: 'devops-approvals', label: 'Pending Approvals', icon: 'bi-check2-square', route: '/devops/approvals', requiredRoles: ['devops.approval.read'] },
      { id: 'devops-alerts', label: 'Alerts', icon: 'bi-bell-fill', route: '/devops/alerts', requiredRoles: ['devops.read'] },
    ],
  },
  {
    id: 'mlops',
    label: 'MLOps',
    icon: 'bi-diagram-3-fill',
    requiredRoles: ['mlops.read'],
    children: [
      { id: 'mlops-vertex', label: 'Vertex Jobs', icon: 'bi-activity', route: '/mlops/vertex-jobs', requiredRoles: ['mlops.read'] },
      { id: 'mlops-alerts', label: 'Alerts', icon: 'bi-bell-fill', route: '/mlops/alerts', requiredRoles: ['mlops.read'] },
    ],
  },
  {
    id: 'config',
    label: 'Configuration',
    icon: 'bi-gear-fill',
    route: '/config',
    requiredRoles: ['config.admin'],
  },
  {
    id: 'about',
    label: 'About',
    icon: 'bi-info-circle-fill',
    route: '/about',
    requiredRoles: [],
  },
];

function filterMenu(items: MenuItem[], userRoles: string[]): MenuItem[] {
  return items
    .filter((item) => {
      if (!item.requiredRoles || item.requiredRoles.length === 0) return true;
      return item.requiredRoles.some((r) => userRoles.includes(r));
    })
    .map((item) => {
      if (!item.children) return item;
      const filteredChildren = filterMenu(item.children, userRoles);
      return { ...item, children: filteredChildren };
    })
    .filter((item) => !item.children || item.children.length > 0 || item.route);
}

export function getMenu(req: Request, res: Response): void {
  const userRoles: string[] = req.session?.user?.roles ?? [];
  const menu = filterMenu(FULL_MENU, userRoles);
  res.json({ menu });
}
