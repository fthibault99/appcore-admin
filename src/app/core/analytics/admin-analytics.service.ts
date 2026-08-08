import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AnalyticsEventDetail,
  AnalyticsEventFilters,
  AnalyticsEventFilterOptions,
  AnalyticsEventSummary,
  PageResponse,
} from './analytics-event.models';

@Injectable({ providedIn: 'root' })
export class AdminAnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly eventsUrl = `${environment.apiBaseUrl}/api/admin/analytics/events`;

  getEvents(filters: AnalyticsEventFilters): Observable<PageResponse<AnalyticsEventSummary>> {
    let params = new HttpParams();
    for (const [name, value] of Object.entries(filters)) {
      if (
        value !== undefined &&
        value !== null &&
        (typeof value !== 'string' || value.trim() !== '')
      ) {
        params = params.set(name, String(value));
      }
    }
    return this.http.get<PageResponse<AnalyticsEventSummary>>(this.eventsUrl, {
      params,
      withCredentials: true,
    });
  }

  getEvent(eventId: string): Observable<AnalyticsEventDetail> {
    return this.http.get<AnalyticsEventDetail>(`${this.eventsUrl}/${encodeURIComponent(eventId)}`, {
      withCredentials: true,
    });
  }

  getEventFilterOptions(): Observable<AnalyticsEventFilterOptions> {
    return this.http.get<AnalyticsEventFilterOptions>(
      `${environment.apiBaseUrl}/api/admin/analytics/event-filter-options`,
      { withCredentials: true },
    );
  }
}
