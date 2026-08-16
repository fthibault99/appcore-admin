import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminVoiceInboxService } from './admin-voice-inbox.service';

describe('AdminVoiceInboxService', () => {
  let service: AdminVoiceInboxService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminVoiceInboxService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends the audio as authenticated CSRF-protected multipart data', () => {
    service.transcribe(new Blob(['audio'], { type: 'audio/webm' }), 'voice.webm').subscribe((response) =>
      expect(response.text).toBe('Bonjour'),
    );
    const csrf = http.expectOne('http://localhost:8080/api/admin/auth/csrf');
    expect(csrf.request.withCredentials).toBe(true);
    csrf.flush('', { headers: { 'X-XSRF-TOKEN': 'csrf-token' } });

    const request = http.expectOne('http://localhost:8080/api/admin/openai/voice-inbox/transcriptions');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-token');
    expect(request.request.body instanceof FormData).toBe(true);
    expect((request.request.body as FormData).get('file')).toBeInstanceOf(Blob);
    request.flush({ text: 'Bonjour' });
  });

  it('sends only the transcript when organizing', () => {
    service.organize('Appeler Marc').subscribe((result) => expect(result.tasks).toEqual(['Appeler Marc']));
    http.expectOne('http://localhost:8080/api/admin/auth/csrf').flush('', { headers: { 'X-XSRF-TOKEN': 'csrf-token' } });
    const request = http.expectOne('http://localhost:8080/api/admin/openai/voice-inbox/organize');
    expect(request.request.body).toEqual({ text: 'Appeler Marc' });
    expect(request.request.withCredentials).toBe(true);
    request.flush({ title: 'Demain', summary: 'Une tâche', tasks: ['Appeler Marc'] });
  });
});
