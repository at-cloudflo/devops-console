import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiClientService } from '../http/api-client.service';
import { MenuItem } from '../../models/menu.model';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly api = inject(ApiClientService);
  readonly menuItems = signal<MenuItem[]>([]);

  loadMenu(): Observable<{ menu: MenuItem[] }> {
    return this.api.get<{ menu: MenuItem[] }>('/menu').pipe(
      tap((res) => this.menuItems.set(res.menu))
    );
  }
}
