import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Dashboard } from '../../models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly dashboardUrl = `${environment.apiBaseUrl}/api/admin/dashboard`;

  getDashboard(): Observable<Dashboard> {
    return this.http.get<Dashboard>(this.dashboardUrl, { withCredentials: true });
  }
}
