import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  RecipeDiscoveryRequest,
  RecipeDiscoveryResult,
  RecipeDiscoveryState,
  RecipeDiscoveryStreamEvent,
} from './recipe-discovery.models';

export class AdminRecipeDiscoveryRequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

@Injectable({ providedIn: 'root' })
export class AdminRecipeDiscoveryService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/admin/openai/recipe-discovery/stream`;
  private readonly csrfUrl = `${environment.apiBaseUrl}/api/admin/auth/csrf`;

  stream(request: RecipeDiscoveryRequest): Observable<RecipeDiscoveryStreamEvent> {
    return new Observable((subscriber) => {
      const abortController = new AbortController();
      void this.consume(request, abortController.signal, (event) => subscriber.next(event))
        .then(() => subscriber.complete())
        .catch((error: unknown) => { if (!subscriber.closed) subscriber.error(error); });
      return () => abortController.abort();
    });
  }

  private async consume(request: RecipeDiscoveryRequest, signal: AbortSignal,
    emit: (event: RecipeDiscoveryStreamEvent) => void): Promise<void> {
    const csrfToken = await firstValueFrom(this.getCsrfToken());
    const response = await fetch(this.url, {
      method: 'POST', credentials: 'include', signal,
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', 'X-XSRF-TOKEN': csrfToken },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new AdminRecipeDiscoveryRequestError(response.status,
      `Recipe discovery request failed with HTTP ${response.status}.`);
    if (!response.body) throw new Error('The recipe discovery stream is unavailable.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let terminalEvent = false;
    while (true) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        const event = parseRecipeDiscoverySseFrame(frame);
        if (event) { emit(event); terminalEvent ||= event.type === 'result' || event.type === 'error'; }
      }
      if (chunk.done) break;
    }
    if (buffer.trim()) {
      const event = parseRecipeDiscoverySseFrame(buffer);
      if (event) { emit(event); terminalEvent ||= event.type === 'result' || event.type === 'error'; }
    }
    if (!terminalEvent) throw new Error('The recipe discovery stream ended before a result.');
  }

  private getCsrfToken(): Observable<string> {
    return this.http.get(this.csrfUrl, { observe: 'response', responseType: 'text', withCredentials: true })
      .pipe(map((response) => {
        const token = response.headers.get('X-XSRF-TOKEN');
        if (!token) throw new Error('The AppCore CSRF token is missing.');
        return token;
      }));
  }
}

export function parseRecipeDiscoverySseFrame(frame: string): RecipeDiscoveryStreamEvent | null {
  const lines = frame.split(/\r?\n/);
  const eventName = lines.find((line) => line.startsWith('event:'))?.slice(6).trim();
  const data = lines.filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart()).join('\n');
  if (!eventName || !data) return null;
  if (eventName === 'progress') return {
    type: 'progress', state: (JSON.parse(data) as { state: RecipeDiscoveryState }).state,
  };
  if (eventName === 'result') return { type: 'result', result: JSON.parse(data) as RecipeDiscoveryResult };
  if (eventName === 'error') {
    const error = JSON.parse(data) as { code: string; message: string };
    return { type: 'error', ...error };
  }
  return null;
}
