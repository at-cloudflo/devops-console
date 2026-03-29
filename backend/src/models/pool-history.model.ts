export interface PoolUtilisationPoint {
  ts: string;       // ISO date
  busy: number;
  idle: number;
  offline: number;
  total: number;
}

export interface PoolHistoryResponse {
  poolId: string;
  poolName: string;
  windowHours: number;
  points: PoolUtilisationPoint[];
}
