import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DishRecreationResult, DishRecreationStreamEvent, DishRecreationState } from './dish-recreation.models';

export class AdminDishRecreationRequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

@Injectable({ providedIn: 'root' })
export class AdminDishRecreationService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/admin/openai/dish-recreation/stream`;
  private readonly csrfUrl = `${environment.apiBaseUrl}/api/admin/auth/csrf`;

  stream(form: FormData): Observable<DishRecreationStreamEvent> {
    return new Observable((subscriber) => {
      const abortController = new AbortController();
      void this.consume(form, abortController.signal, (event) => subscriber.next(event))
        .then(() => subscriber.complete())
        .catch((error: unknown) => { if (!subscriber.closed) subscriber.error(error); });
      return () => abortController.abort();
    });
  }

  private async consume(form: FormData, signal: AbortSignal,
    emit: (event: DishRecreationStreamEvent) => void): Promise<void> {
    const csrfToken = await firstValueFrom(this.getCsrfToken());
    const response = await fetch(this.url, {
      method: 'POST', credentials: 'include', signal,
      headers: { 'X-XSRF-TOKEN': csrfToken }, body: form,
    });
    if (!response.ok) throw new AdminDishRecreationRequestError(response.status,
      `Dish recreation request failed with HTTP ${response.status}.`);
    if (!response.body) throw new Error('The dish recreation stream is unavailable.');

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
        const event = parseDishRecreationSseFrame(frame);
        if (event) { emit(event); terminalEvent ||= event.type === 'result' || event.type === 'error'; }
      }
      if (chunk.done) break;
    }
    if (buffer.trim()) {
      const event = parseDishRecreationSseFrame(buffer);
      if (event) { emit(event); terminalEvent ||= event.type === 'result' || event.type === 'error'; }
    }
    if (!terminalEvent) throw new Error('The dish recreation stream ended before a result.');
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

export function parseDishRecreationSseFrame(frame: string): DishRecreationStreamEvent | null {
  const lines = frame.split(/\r?\n/);
  const eventName = lines.find((line) => line.startsWith('event:'))?.slice(6).trim();
  const data = lines.filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart()).join('\n');
  if (!eventName || !data) return null;
  if (eventName === 'progress') return { type: 'progress', state: (JSON.parse(data) as { state: DishRecreationState }).state };
  if (eventName === 'result') return { type: 'result', result: JSON.parse(data) as DishRecreationResult };
  if (eventName === 'error') {
    const error = JSON.parse(data) as { code: string; message: string };
    return { type: 'error', ...error };
  }
  return null;
}
