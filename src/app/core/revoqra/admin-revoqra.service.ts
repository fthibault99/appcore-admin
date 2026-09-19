import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BillingEvent,
  BillingEventDetail,
  RevoqraCreditGrant,
  RevoqraCreditTransaction,
  RevoqraEntitlement,
  RevoqraPage,
  RevoqraResearchProfile,
  RevoqraUser,
} from './admin-revoqra.models';
@Injectable({ providedIn: 'root' })
export class AdminRevoqraService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/admin/revoqra`;
  getUsers(email = '', providerSubscriptionId = '', page = 0) {
    let params = new HttpParams().set('page', page).set('size', 25);
    if (email.trim()) params = params.set('email', email.trim());
    if (providerSubscriptionId.trim())
      params = params.set('providerSubscriptionId', providerSubscriptionId.trim());
    return this.http.get<RevoqraPage<RevoqraUser>>(`${this.base}/users`, {
      params,
      withCredentials: true,
    });
  }
  deleteUser(id: string) {
    return this.withCsrf((headers) =>
      this.http.delete<void>(`${this.base}/users/${encodeURIComponent(id)}`, {
        headers,
        withCredentials: true,
      }),
    );
  }
  updateAccountType(id: string, accountType: 'STANDARD' | 'INTERNAL') {
    return this.withCsrf((headers) =>
      this.http.put<RevoqraUser>(
        `${this.base}/users/${encodeURIComponent(id)}/account-type`,
        { accountType },
        { headers, withCredentials: true },
      ),
    );
  }
  getEvents(eventType = '', processed: boolean | null = null, page = 0) {
    let params = new HttpParams().set('page', page).set('size', 25);
    if (eventType.trim()) params = params.set('eventType', eventType.trim());
    if (processed !== null) params = params.set('processed', processed);
    return this.http.get<RevoqraPage<BillingEvent>>(`${this.base}/billing-events`, {
      params,
      withCredentials: true,
    });
  }
  getEvent(id: string) {
    return this.http.get<BillingEventDetail>(
      `${this.base}/billing-events/${encodeURIComponent(id)}`,
      { withCredentials: true },
    );
  }
  deleteEvent(id: string) {
    return this.withCsrf((headers) =>
      this.http.delete<void>(`${this.base}/billing-events/${encodeURIComponent(id)}`, {
        headers,
        withCredentials: true,
      }),
    );
  }
  getEntitlements() {
    return this.http.get<RevoqraEntitlement[]>(`${this.base}/entitlements`, {
      withCredentials: true,
    });
  }
  updateEntitlement(plan: string, value: Omit<RevoqraEntitlement, 'plan'>) {
    return this.http
      .get(`${environment.apiBaseUrl}/api/admin/auth/csrf`, {
        observe: 'response',
        responseType: 'text',
        withCredentials: true,
      })
      .pipe(
        switchMap((response) => {
          const token = response.headers.get('X-XSRF-TOKEN');
          if (!token) throw new Error('CSRF token missing');
          return this.http.put<RevoqraEntitlement>(
            `${this.base}/entitlements/${encodeURIComponent(plan)}`,
            value,
            { headers: new HttpHeaders({ 'X-XSRF-TOKEN': token }), withCredentials: true },
          );
        }),
      );
  }
  getProfiles() {
    return this.http.get<RevoqraResearchProfile[]>(`${this.base}/research-profiles`, {
      withCredentials: true,
    });
  }
  updateProfile(profile: string, value: Omit<RevoqraResearchProfile, 'profile' | 'updatedAt'>) {
    return this.withCsrf((headers) =>
      this.http.put<RevoqraResearchProfile>(
        `${this.base}/research-profiles/${encodeURIComponent(profile)}`,
        value,
        { headers, withCredentials: true },
      ),
    );
  }
  getCreditGrants(userId: string) {
    return this.http.get<RevoqraCreditGrant[]>(
      `${this.base}/users/${encodeURIComponent(userId)}/credit-grants`,
      { withCredentials: true },
    );
  }
  getCreditTransactions(userId: string, page = 0) {
    const params = new HttpParams().set('page', page).set('size', 50);
    return this.http.get<RevoqraPage<RevoqraCreditTransaction>>(
      `${this.base}/users/${encodeURIComponent(userId)}/credit-transactions`,
      { params, withCredentials: true },
    );
  }
  grantCredits(
    userId: string,
    value: {
      amount: number;
      source: 'ADMIN' | 'PROMOTION';
      description: string;
      expiresAt: string | null;
    },
  ) {
    return this.withCsrf((headers) =>
      this.http.post<RevoqraCreditGrant>(
        `${this.base}/users/${encodeURIComponent(userId)}/credit-grants`,
        value,
        { headers, withCredentials: true },
      ),
    );
  }
  private withCsrf<T>(request: (headers: HttpHeaders) => import('rxjs').Observable<T>) {
    return this.http
      .get(`${environment.apiBaseUrl}/api/admin/auth/csrf`, {
        observe: 'response',
        responseType: 'text',
        withCredentials: true,
      })
      .pipe(
        switchMap((response) => {
          const token = response.headers.get('X-XSRF-TOKEN');
          if (!token) throw new Error('CSRF token missing');
          return request(new HttpHeaders({ 'X-XSRF-TOKEN': token }));
        }),
      );
  }
}
