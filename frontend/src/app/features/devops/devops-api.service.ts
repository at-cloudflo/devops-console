import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClientService } from '../../core/http/api-client.service';
import { PoolSummary, AgentDetail, QueueJob, PendingApproval, Alert } from '../../models/devops.model';
import { ApiResponse, PaginatedResponse } from '../../models/common.model';

@Injectable({ providedIn: 'root' })
export class DevopsApiService {
  private readonly api = inject(ApiClientService);

  getPools(params?: { search?: string; alertState?: string; page?: number; limit?: number; refresh?: boolean }): Promise<PaginatedResponse<PoolSummary>> {
    return firstValueFrom(this.api.get<PaginatedResponse<PoolSummary>>('/devops/pools', params));
  }

  getPool(id: string): Promise<ApiResponse<PoolSummary>> {
    return firstValueFrom(this.api.get<ApiResponse<PoolSummary>>(`/devops/pools/${id}`));
  }

  getAgents(params?: { poolId?: string; search?: string; status?: string; pool?: string; page?: number; limit?: number; refresh?: boolean }): Promise<PaginatedResponse<AgentDetail>> {
    return firstValueFrom(this.api.get<PaginatedResponse<AgentDetail>>('/devops/agents', params));
  }

  getAgentsByPool(poolId: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<AgentDetail>> {
    return firstValueFrom(this.api.get<PaginatedResponse<AgentDetail>>(`/devops/pools/${poolId}/agents`, params));
  }

  getQueue(params: { sinceHours?: number; project?: string; pool?: string; search?: string; status?: string; page?: number; limit?: number; refresh?: boolean }): Promise<PaginatedResponse<QueueJob>> {
    return firstValueFrom(this.api.get<PaginatedResponse<QueueJob>>('/devops/queue', params));
  }

  getApprovals(params?: { project?: string; search?: string; page?: number; limit?: number; refresh?: boolean }): Promise<PaginatedResponse<PendingApproval>> {
    return firstValueFrom(this.api.get<PaginatedResponse<PendingApproval>>('/devops/approvals', params));
  }

  getAlerts(params?: { status?: string; severity?: string; search?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Alert>> {
    return firstValueFrom(this.api.get<PaginatedResponse<Alert>>('/devops/alerts', params));
  }

  acknowledgeAlert(id: string): Promise<ApiResponse<Alert>> {
    return firstValueFrom(this.api.post<ApiResponse<Alert>>(`/devops/alerts/${id}/acknowledge`));
  }
}
