import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { ApiClientService } from '../../core/http/api-client.service';
import { PoolSummary, AgentDetail, QueueJob, PendingApproval, Alert } from '../../models/devops.model';
import { ApiResponse } from '../../models/common.model';

@Injectable({ providedIn: 'root' })
export class DevopsApiService {
  private readonly api = inject(ApiClientService);

  getPools(refresh = false): Promise<ApiResponse<PoolSummary[]>> {
    return firstValueFrom(
      this.api.get<ApiResponse<PoolSummary[]>>('/devops/pools', { refresh })
    );
  }

  getPool(id: string): Promise<ApiResponse<PoolSummary>> {
    return firstValueFrom(this.api.get<ApiResponse<PoolSummary>>(`/devops/pools/${id}`));
  }

  getAgents(poolId?: string, refresh = false): Promise<ApiResponse<AgentDetail[]>> {
    return firstValueFrom(
      this.api.get<ApiResponse<AgentDetail[]>>('/devops/agents', { poolId, refresh })
    );
  }

  getAgentsByPool(poolId: string): Promise<ApiResponse<AgentDetail[]>> {
    return firstValueFrom(
      this.api.get<ApiResponse<AgentDetail[]>>(`/devops/pools/${poolId}/agents`)
    );
  }

  getQueue(params: {
    sinceHours?: number;
    project?: string;
    pool?: string;
    refresh?: boolean;
  }): Promise<ApiResponse<QueueJob[]>> {
    return firstValueFrom(
      this.api.get<ApiResponse<QueueJob[]>>('/devops/queue', params)
    );
  }

  getApprovals(project?: string, refresh = false): Promise<ApiResponse<PendingApproval[]>> {
    return firstValueFrom(
      this.api.get<ApiResponse<PendingApproval[]>>('/devops/approvals', { project, refresh })
    );
  }

  getAlerts(status?: string): Promise<ApiResponse<Alert[]>> {
    return firstValueFrom(
      this.api.get<ApiResponse<Alert[]>>('/devops/alerts', { status })
    );
  }

  acknowledgeAlert(id: string): Promise<ApiResponse<Alert>> {
    return firstValueFrom(
      this.api.post<ApiResponse<Alert>>(`/devops/alerts/${id}/acknowledge`)
    );
  }
}
