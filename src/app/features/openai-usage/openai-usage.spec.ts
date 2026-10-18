import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminOpenAIUsageService } from '../../core/openai-usage/admin-openai-usage.service';
import { OpenAIUsageComponent } from './openai-usage';

describe('OpenAIUsageComponent', () => {
  let fixture: ComponentFixture<OpenAIUsageComponent>;
  let service: { getUsage: ReturnType<typeof vi.fn>; getSummary: ReturnType<typeof vi.fn>; getStatistics: ReturnType<typeof vi.fn> };
  beforeEach(async () => {
    service = {
      getUsage: vi.fn(() => of({ content: [], totalElements: 0, totalPages: 0, number: 0, first: true, last: true })),
      getSummary: vi.fn(() => of({ from: '2026-08-01T00:00:00Z', to: '2026-08-02T00:00:00Z', totalRequests: 3, failedRequests: 1, totalTokens: 50, averageDurationMs: 500, estimatedCostUsd: 0.02 })),
      getStatistics: vi.fn(() => of({ from: '2026-08-01T00:00:00Z', to: '2026-08-02T00:00:00Z', rows: [
        { feature: 'recipe', model: 'a', totalRequests: 3, successfulRequests: 2, totalDurationMs: 1500, averageDurationMs: 500, pricedRequests: 1, estimatedCostUsd: 0.02 },
        { feature: 'inactive', model: 'b', totalRequests: 0, successfulRequests: 0, totalDurationMs: 0, averageDurationMs: 0, pricedRequests: 0, estimatedCostUsd: 0 },
      ] })),
    };
    await TestBed.configureTestingModule({ imports: [OpenAIUsageComponent], providers: [provideRouter([]), { provide: AdminOpenAIUsageService, useValue: service }] }).compileComponents();
    fixture = TestBed.createComponent(OpenAIUsageComponent);
  });

  it('uses the same UTC period for statistics, summary and history and renders partial costs', () => {
    fixture.componentInstance.period.setValue({ from: '2026-08-01T09:00', to: '2026-08-02T17:00' });
    fixture.detectChanges();
    const from = new Date('2026-08-01T09:00').toISOString();
    const to = new Date('2026-08-02T17:00').toISOString();
    expect(service.getStatistics).toHaveBeenCalledWith(from, to);
    expect(service.getSummary).toHaveBeenCalledWith(from, to);
    expect(service.getUsage).toHaveBeenCalledWith('', '', 0, 25, from, to);
    expect(fixture.nativeElement.querySelectorAll('.statistics-row')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Cost is partial: 2 executions');
    expect(fixture.nativeElement.textContent).toContain('inactive');
    expect(fixture.componentInstance.features()).toEqual(['recipe', 'inactive']);
  });

  it('rejects reversed periods without fetching', () => {
    fixture.componentInstance.period.setValue({ from: '2026-08-03T09:00', to: '2026-08-02T17:00' });
    fixture.detectChanges();
    expect(service.getStatistics).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Enter valid dates');
  });

  it('keeps feature and status filters specific to request history', () => {
    fixture.detectChanges();
    fixture.componentInstance.filters.setValue({ feature: 'recipe', status: 'SUCCESS' });
    fixture.componentInstance.search();
    const [from, to] = service.getStatistics.mock.calls.at(-1)!;
    expect(service.getUsage).toHaveBeenLastCalledWith('recipe', 'SUCCESS', 0, 25, from, to);
    expect(service.getSummary).toHaveBeenLastCalledWith(from, to);
  });
});
