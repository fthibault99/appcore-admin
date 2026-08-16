import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AudioTranscriptionResponse, VoiceInboxResult } from './voice-inbox.models';

@Injectable({ providedIn: 'root' })
export class AdminVoiceInboxService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/admin/openai/voice-inbox`;
  private readonly csrfUrl = `${environment.apiBaseUrl}/api/admin/auth/csrf`;

  transcribe(audio: Blob, fileName: string): Observable<AudioTranscriptionResponse> {
    const body = new FormData();
    body.append('file', audio, fileName);
    return this.csrfHeaders().pipe(switchMap((headers) =>
      this.http.post<AudioTranscriptionResponse>(`${this.baseUrl}/transcriptions`, body, {
        headers,
        withCredentials: true,
      }),
    ));
  }

  organize(text: string): Observable<VoiceInboxResult> {
    return this.csrfHeaders().pipe(switchMap((headers) =>
      this.http.post<VoiceInboxResult>(`${this.baseUrl}/organize`, { text }, {
        headers,
        withCredentials: true,
      }),
    ));
  }

  private csrfHeaders(): Observable<HttpHeaders> {
    return this.http.get(this.csrfUrl, {
      observe: 'response', responseType: 'text', withCredentials: true,
    }).pipe(map((response) => {
      const token = response.headers.get('X-XSRF-TOKEN');
      if (!token) throw new Error('The AppCore CSRF token is missing.');
      return new HttpHeaders({ 'X-XSRF-TOKEN': token });
    }));
  }
}
