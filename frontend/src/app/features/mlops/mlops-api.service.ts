import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClientService } from '../../core/http/api-client.service';
import { VertexJobDetail, VertexJobsResponse } from '../../models/mlops.model';
import { Alert } from '../../models/devops.model';
import { ApiResponse, PaginatedResponse } from '../../models/common.model';

@Injectable({ providedIn: 'root' })
export class MlopsApiService {
  private readonly api = inject(ApiClientService);

  getVertexJobs(params: {
    projectId?: string;
    region?: string;
    state?: string;
    search?: string;
    page?: number;
    limit?: number;
    refresh?: boolean;
  }): Promise<VertexJobsResponse> {
    return firstValueFrom(this.api.get<VertexJobsResponse>('/mlops/vertex/jobs', params));
  }

  getVertexJobById(id: string): Promise<ApiResponse<VertexJobDetail>> {
    return firstValueFrom(this.api.get<ApiResponse<VertexJobDetail>>(`/mlops/vertex/jobs/${id}`));
  }

  getAlerts(params?: { status?: string; severity?: string; search?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Alert>> {
    return firstValueFrom(this.api.get<PaginatedResponse<Alert>>('/mlops/alerts', params));
  }

  acknowledgeAlert(id: string): Promise<ApiResponse<Alert>> {
    return firstValueFrom(this.api.post<ApiResponse<Alert>>(`/mlops/alerts/${id}/acknowledge`));
  }
}
