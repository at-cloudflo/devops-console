import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLinkActive } from '@angular/router';
import { MenuService } from '../../core/menu/menu.service';
import { MenuItem } from '../../models/menu.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLinkActive],
  template: `
    <nav class="sidebar">
      <!-- Brand -->
      <a class="sidebar-brand" routerLink="/dashboard">
        <div class="brand-icon">
          <i class="bi bi-terminal-fill"></i>
        </div>
        <div class="brand-text">
          DevOps Console
          <span>Internal Developer Portal</span>
        </div>
      </a>

      <!-- Nav items -->
      <div class="sidebar-nav">
        @for (item of menuItems(); track item.id) {
          @if (!item.children || item.children.length === 0) {
            <!-- Leaf item -->
            <div class="nav-item">
              <a
                class="nav-link"
                [routerLink]="item.route"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
              >
                <i class="bi" [ngClass]="item.icon"></i>
                <span class="nav-label">{{ item.label }}</span>
              </a>
            </div>
          } @else {
            <!-- Parent item with children -->
            <div class="nav-item" [class.open]="isOpen(item.id)">
              <a class="nav-link" (click)="toggle(item.id)" [class.active]="isGroupActive(item)" style="cursor:pointer">
                <i class="bi" [ngClass]="item.icon"></i>
                <span class="nav-label">{{ item.label }}</span>
                <i class="bi bi-chevron-right nav-arrow"></i>
              </a>
              @if (isOpen(item.id)) {
                <div class="nav-children">
                  @for (child of item.children; track child.id) {
                    <div class="nav-item">
                      <a
                        class="nav-link"
                        [routerLink]="child.route"
                        routerLinkActive="active"
                      >
                        <i class="bi" [ngClass]="child.icon"></i>
                        <span class="nav-label">{{ child.label }}</span>
                      </a>
                    </div>
                  }
                </div>
              }
            </div>
          }
        }
      </div>

      <div class="sidebar-footer">
        v1.0.0 &nbsp;·&nbsp; POC
      </div>
    </nav>
  `
})
export class SidebarComponent {
  private readonly menuService = inject(MenuService);
  readonly menuItems = this.menuService.menuItems;

  private readonly openItems = signal<Set<string>>(new Set());

  isOpen(id: string): boolean {
    return this.openItems().has(id);
  }

  toggle(id: string): void {
    this.openItems.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  isGroupActive(item: MenuItem): boolean {
    if (!item.children) return false;
    return item.children.some((c) => {
      if (!c.route) return false;
      return window.location.pathname.startsWith(c.route);
    });
  }
}
