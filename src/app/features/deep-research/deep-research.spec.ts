import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminAuthenticationService } from '../../core/authentication/admin-authentication.service';
import { AdminDeepResearchService } from '../../core/deep-research/admin-deep-research.service';
import { DeepResearchJob, DeepResearchPage } from '../../core/deep-research/deep-research.models';
import { DeepResearchComponent } from './deep-research';

describe('DeepResearchComponent', () => {
  let fixture: ComponentFixture<DeepResearchComponent>;
  let service: {
    list: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    updateEvaluation: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    const page: DeepResearchPage = {
      content: [
        {
          id: 'f8854820-d070-46e2-824b-7cdbc5ef6d08',
          status: 'COMPLETED',
          query: 'Compare database platforms',
          profile: 'STANDARD',
          model: 'gpt-5.6-luna',
          maxSearches: 8,
          actualWebSearches: 6,
          totalCostUsd: 0.12,
          qualityRating: 'GOOD',
          createdAt: '2026-09-02T12:00:00Z',
          updatedAt: '2026-09-02T12:05:00Z',
          completedAt: '2026-09-02T12:05:00Z',
        },
      ],
      number: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    };
    service = {
      list: vi.fn(() => of(page)),
      get: vi.fn(),
      start: vi.fn(),
      updateEvaluation: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [DeepResearchComponent],
      providers: [
        provideRouter([]),
        { provide: AdminDeepResearchService, useValue: service },
        { provide: AdminAuthenticationService, useValue: { logout: vi.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DeepResearchComponent);
  });

  it('loads and displays the research history', () => {
    fixture.detectChanges();

    expect(service.list).toHaveBeenCalledWith(0);
    expect(fixture.nativeElement.textContent).toContain('Compare database platforms');
    expect(fixture.nativeElement.textContent).toContain('COMPLETED');
    expect(fixture.nativeElement.textContent).toContain('1 job');
  });

  it('describes the ULTRA profile limits', () => {
    expect(fixture.componentInstance.profileDescription('ULTRA')).toContain(
      'Astra / up to 50 target searches / high reasoning / 60 min timeout',
    );
  });

  it('describes the adaptive Astra profile separately from ULTRA', () => {
    expect(fixture.componentInstance.profileDescription('ULTRA_ADAPTIVE')).toContain(
      'low then high reasoning',
    );
    expect(fixture.componentInstance.profileDescription('ULTRA')).toContain('high reasoning');
  });

  it('displays structured report metadata while keeping report as Markdown', async () => {
    vi.useFakeTimers();
    const job: DeepResearchJob = {
      id: 'f8854820-d070-46e2-824b-7cdbc5ef6d08',
      status: 'COMPLETED',
      query: 'Research AI',
      profile: 'STANDARD',
      model: 'gpt-5.6-luna',
      maxSearches: 8,
      maxToolCalls: 30,
      reasoningEffort: 'medium',
      timeoutSeconds: 900,
      report: '## Executive summary\nFindings.',
      reportTitle: 'Java AI-agent ecosystem',
      reviewPeriod: { start: '2026-08-05', end: '2026-09-04' },
      scope: 'Spring AI, MCP and Java agent frameworks',
      sourcePolicy: 'Official and primary sources were prioritized',
      sources: [],
      errorMessage: null,
      createdAt: '2026-09-04T12:00:00Z',
      updatedAt: '2026-09-04T12:05:00Z',
      completedAt: '2026-09-04T12:05:00Z',
      durationMs: 300000,
      sourceCount: 0,
      usage: null,
      qualityRating: null,
      qualityNotes: null,
    };
    service.get.mockReturnValue(of(job));
    fixture.detectChanges();

    fixture.componentInstance.openJob(job.id);
    await vi.runOnlyPendingTimersAsync();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Java AI-agent ecosystem');
    expect(fixture.nativeElement.textContent).toContain(
      'Review period: August 5–September 4, 2026',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'Scope: Spring AI, MCP and Java agent frameworks',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'Source policy: Official and primary sources were prioritized',
    );
    expect(fixture.nativeElement.textContent).toContain('Executive summary');
    vi.useRealTimers();
  });
});
