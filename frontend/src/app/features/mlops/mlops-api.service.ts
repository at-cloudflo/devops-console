import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClientService } from '../../core/http/api-client.service';
import { VertexJob, VertexJobDetail, VertexJobsResponse } from '../../models/mlops.model';
import { ApiResponse } from '../../models/common.model';

@Injectable({ providedIn: 'root' })
export class MlopsApiService {
  private readonly api = inject(ApiClientService);

  getVertexJobs(params: {
    projectId?: string;
    region?: string;
    state?: string;
    search?: string;
    refresh?: boolean;
  }): Promise<VertexJobsResponse> {
    return firstValueFrom(this.api.get<VertexJobsResponse>('/mlops/vertex/jobs', params));
  }

  getVertexJobById(id: string): Promise<ApiResponse<VertexJobDetail>> {
    return firstValueFrom(this.api.get<ApiResponse<VertexJobDetail>>(`/mlops/vertex/jobs/${id}`));
  }
}
