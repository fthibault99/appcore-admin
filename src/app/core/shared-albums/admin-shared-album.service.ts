import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface SharedAlbumSummary {
  id: string;
  name: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SharedAlbumPage {
  content: SharedAlbumSummary[];
  totalElements: number;
  totalPages: number;
  number: number;
  first: boolean;
  last: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminSharedAlbumService {
  private readonly http = inject(HttpClient);

  list(page = 0, size = 25) {
    return this.http.get<SharedAlbumPage>(
      `${environment.apiBaseUrl}/api/admin/brick-collector/shared-albums`,
      { params: new HttpParams().set('page', page).set('size', size), withCredentials: true },
    );
  }
}
