import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClientService } from '../../core/http/api-client.service';
import { SystemConfig } from '../../models/config.model';
import { ApiResponse } from '../../models/common.model';

@Injectable({ providedIn: 'root' })
export class ConfigApiService {
  private readonly api = inject(ApiClientService);

  getConfig(): Promise<ApiResponse<SystemConfig>> {
    return firstValueFrom(this.api.get<ApiResponse<SystemConfig>>('/config'));
  }

  updateConfig(config: Partial<SystemConfig>): Promise<{ success: boolean; data: SystemConfig }> {
    return firstValueFrom(
      this.api.put<{ success: boolean; data: SystemConfig }>('/config', config)
    );
  }

  resetConfig(): Promise<{ success: boolean; data: SystemConfig }> {
    return firstValueFrom(
      this.api.post<{ success: boolean; data: SystemConfig }>('/config/reset')
    );
  }
}
