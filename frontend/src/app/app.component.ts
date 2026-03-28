import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
})
export class AppComponent implements OnInit {
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    // Restore session on hard reload — will redirect to /login if not authenticated
    this.authService.init().subscribe();
  }
}
