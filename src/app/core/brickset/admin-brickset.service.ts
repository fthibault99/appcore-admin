import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminBricksetSetDetail, AdminBricksetUsageDay, BricksetSetPage } from './admin-brickset.models';

@Injectable({ providedIn: 'root' })
export class AdminBricksetService {
  private readonly http = inject(HttpClient);
  private readonly setsUrl = `${environment.apiBaseUrl}/api/admin/brickset/sets`;
  private readonly usageUrl = `${environment.apiBaseUrl}/api/admin/brickset/usage`;

  getSets(setNumber: string, page: number, size: number): Observable<BricksetSetPage> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (setNumber.trim()) params = params.set('setNumber', setNumber.trim());
    return this.http.get<BricksetSetPage>(this.setsUrl, { params, withCredentials: true });
  }

  getSet(id: number): Observable<AdminBricksetSetDetail> {
    return this.http.get<AdminBricksetSetDetail>(`${this.setsUrl}/${id}`, {
      withCredentials: true,
    });
  }

  getUsage(days = 30): Observable<AdminBricksetUsageDay[]> {
    return this.http.get<AdminBricksetUsageDay[]>(this.usageUrl, {
      params: new HttpParams().set('days', days),
      withCredentials: true,
    });
  }
}
