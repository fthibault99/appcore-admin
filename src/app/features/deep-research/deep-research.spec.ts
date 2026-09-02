import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminAuthenticationService } from '../../core/authentication/admin-authentication.service';
import { AdminDeepResearchService } from '../../core/deep-research/admin-deep-research.service';
import { DeepResearchPage } from '../../core/deep-research/deep-research.models';
import { DeepResearchComponent } from './deep-research';

describe('DeepResearchComponent', () => {
  let fixture: ComponentFixture<DeepResearchComponent>;
  let service: {
    list: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    const page: DeepResearchPage = {
      content: [
        {
          id: 'f8854820-d070-46e2-824b-7cdbc5ef6d08',
          status: 'COMPLETED',
          query: 'Compare database platforms',
          model: 'gpt-5.6-sol',
          maxSearches: 7,
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
});
