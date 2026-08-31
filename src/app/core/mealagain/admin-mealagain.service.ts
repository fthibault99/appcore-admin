import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  MealAgainAccount,
  MealAgainAccountDetail,
  MealAgainEnvironment,
  MealAgainPage,
  MealAgainPurchase,
  MealAgainUsage,
} from './admin-mealagain.models';

@Injectable({ providedIn: 'root' })
export class AdminMealAgainService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/admin/mealagain/users`;
  getAccounts(userId: string, page = 0) {
    let params = new HttpParams().set('page', page).set('size', 25);
    if (userId.trim()) params = params.set('userId', userId.trim());
    return this.http.get<MealAgainPage<MealAgainAccount>>(this.url, {
      params,
      withCredentials: true,
    });
  }
  getAccount(userId: string) {
    return this.http.get<MealAgainAccountDetail>(`${this.url}/${encodeURIComponent(userId)}`, {
      withCredentials: true,
    });
  }
  getPurchases(userId: string, filter: MealAgainEnvironment | '', page = 0) {
    return this.http.get<MealAgainPage<MealAgainPurchase>>(
      `${this.url}/${encodeURIComponent(userId)}/purchase-history`,
      { params: this.params(filter, page), withCredentials: true },
    );
  }
  getUsages(userId: string, filter: MealAgainEnvironment | '', page = 0) {
    return this.http.get<MealAgainPage<MealAgainUsage>>(
      `${this.url}/${encodeURIComponent(userId)}/usage-history`,
      { params: this.params(filter, page), withCredentials: true },
    );
  }
  private params(filter: MealAgainEnvironment | '', page: number) {
    const params = new HttpParams().set('page', page).set('size', 25);
    return filter ? params.set('environment', filter) : params;
  }
}
