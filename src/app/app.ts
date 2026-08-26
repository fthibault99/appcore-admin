import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminThemeService } from './core/theme/admin-theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  constructor() {
    inject(AdminThemeService);
  }
}
