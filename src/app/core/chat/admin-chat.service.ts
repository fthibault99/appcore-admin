import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminChatMessage, AdminChatResponse, AdminChatStreamEvent } from './admin-chat.models';

export class AdminChatRequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class AdminChatService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/admin/openai/chat/stream`;
  private readonly csrfUrl = `${environment.apiBaseUrl}/api/admin/auth/csrf`;

  stream(prompt: string, conversation: readonly AdminChatMessage[] = []): Observable<AdminChatStreamEvent> {
    return new Observable((subscriber) => {
      const abortController = new AbortController();
      void this.consume(prompt.trim(), conversation, abortController.signal, (event) => subscriber.next(event))
        .then(() => subscriber.complete())
        .catch((error: unknown) => {
          if (!subscriber.closed) subscriber.error(error);
        });
      return () => abortController.abort();
    });
  }

  private async consume(
    prompt: string,
    conversation: readonly AdminChatMessage[],
    signal: AbortSignal,
    emit: (event: AdminChatStreamEvent) => void,
  ): Promise<void> {
    const csrfToken = await firstValueFrom(this.getCsrfToken());
    const response = await fetch(this.url, {
      method: 'POST',
      credentials: 'include',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': csrfToken,
      },
      body: JSON.stringify({ prompt, conversation }),
    });
    if (!response.ok) {
      throw new AdminChatRequestError(response.status, `Chat request failed with HTTP ${response.status}.`);
    }
    if (!response.body) throw new Error('The chat stream is unavailable.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let completed = false;
    while (true) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        const event = parseAdminChatSseFrame(frame);
        if (event) {
          emit(event);
          completed ||= event.type === 'completed';
        }
      }
      if (chunk.done) break;
    }
    if (buffer.trim()) {
      const event = parseAdminChatSseFrame(buffer);
      if (event) {
        emit(event);
        completed ||= event.type === 'completed';
      }
    }
    if (!completed) throw new Error('The chat stream ended before completion.');
  }

  private getCsrfToken(): Observable<string> {
    return this.http.get(this.csrfUrl, {
      observe: 'response',
      responseType: 'text',
      withCredentials: true,
    }).pipe(map((response) => {
      const token = response.headers.get('X-XSRF-TOKEN');
      if (!token) throw new Error('The AppCore CSRF token is missing.');
      return token;
    }));
  }
}

export function parseAdminChatSseFrame(frame: string): AdminChatStreamEvent | null {
  const lines = frame.split(/\r?\n/);
  const eventName = lines.find((line) => line.startsWith('event:'))?.slice(6).trim();
  const data = lines.filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n');
  if (!eventName || !data) return null;
  if (eventName === 'delta') return { type: 'delta', text: (JSON.parse(data) as { text: string }).text };
  if (eventName === 'completed') return { type: 'completed', response: JSON.parse(data) as AdminChatResponse };
  return null;
}
