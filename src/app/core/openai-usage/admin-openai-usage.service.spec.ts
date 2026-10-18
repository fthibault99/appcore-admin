import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminOpenAIUsageService } from './admin-openai-usage.service';

describe('AdminOpenAIUsageService periods', () => {
  it('sends dates and credentials to all usage endpoints', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(AdminOpenAIUsageService);
    const http = TestBed.inject(HttpTestingController);
    const from = '2026-08-01T00:00:00.000Z';
    const to = '2026-08-02T00:00:00.000Z';
    service.getStatistics(from, to).subscribe();
    service.getSummary(from, to).subscribe();
    service.getUsage('recipe', 'SUCCESS', 0, 25, from, to).subscribe();
    for (const path of ['statistics', 'summary', '']) {
      const request = http.expectOne(req => req.url.endsWith('/usage' + (path ? '/' + path : '')));
      expect(request.request.params.get('from')).toBe(from);
      expect(request.request.params.get('to')).toBe(to);
      expect(request.request.withCredentials).toBe(true);
      request.flush(path === '' ? { content: [] } : {});
    }
    http.verify();
  });
});
