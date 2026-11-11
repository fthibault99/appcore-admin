import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AsoComponent } from './aso';
import { AdminAsoService, Keyword, Page } from '../../core/aso/admin-aso.service';
const keyword: Keyword = {
  id: 1,
  searchTerm: 'lego collection',
  countryOrRegion: 'CA',
  genre: 'LIFESTYLE',
  latest: null,
};
const page: Page<Keyword> = {
  content: [keyword],
  number: 0,
  size: 25,
  totalElements: 1,
  totalPages: 1,
};
describe('ASO', () => {
  const api = {
    options: vi.fn(),
    availableTerms: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    collect: vi.fn(),
    history: vi.fn(),
  };
  beforeEach(async () => {
    vi.resetAllMocks();
    api.options.mockReturnValue(
      of({
        countries: ['CA', 'FR'],
        genres: ['LIFESTYLE'],
        weeks: [
          { start: '2026-10-25', end: '2026-10-31' },
          { start: '2026-10-18', end: '2026-10-24' },
        ],
      }),
    );
    api.list.mockReturnValue(of(page));
    api.create.mockReturnValue(of(keyword));
    api.collect.mockReturnValue(
      of({
        empty: true,
        availability: 'PERIOD_EMPTY',
        periodStart: '2026-10-25',
        periodEnd: '2026-10-31',
      }),
    );
    api.history.mockReturnValue(of({ ...page, content: [] }));
    await TestBed.configureTestingModule({
      imports: [AsoComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: AdminAsoService, useValue: api },
      ],
    }).compileComponents();
  });
  function render() {
    const fixture = TestBed.createComponent(AsoComponent);
    fixture.detectChanges();
    return fixture;
  }
  it('renders list and null metrics as dashes', () => {
    const f = render();
    expect(f.nativeElement.textContent).toContain('lego collection');
    expect(f.nativeElement.textContent).toContain('—');
    expect(f.componentInstance.form.controls.countryOrRegion.value).toBe('CA');
  });
  it('validates required fields before creation', () => {
    const f = render();
    f.componentInstance.add();
    f.detectChanges();
    expect(api.create).not.toHaveBeenCalled();
    expect(f.nativeElement.textContent).toContain('sont obligatoires');
  });
  it('adds a normalized keyword without collection', () => {
    const f = render();
    f.componentInstance.form.setValue({
      searchTerm: '  lego   collection ',
      countryOrRegion: 'CA',
      genre: 'LIFESTYLE',
    });
    f.componentInstance.add();
    expect(api.create).toHaveBeenCalledWith({
      searchTerm: 'lego collection',
      countryOrRegion: 'CA',
      genre: 'LIFESTYLE',
    });
    expect(api.collect).not.toHaveBeenCalled();
  });
  it('shows loading, failure and retry', () => {
    const response = new Subject<Page<Keyword>>();
    api.list.mockReturnValue(response);
    const f = render();
    expect(f.nativeElement.textContent).toContain('Chargement');
    response.error(new Error('offline'));
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Impossible');
    expect(f.componentInstance.loading()).toBe(false);
    api.list.mockReturnValue(of({ ...page, content: [], totalElements: 0, totalPages: 0 }));
    f.componentInstance.load();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Aucun mot-clé');
  });
  it('collects only once while pending and shows empty result', () => {
    const response = new Subject<any>();
    api.collect.mockReturnValue(response);
    const f = render();
    f.componentInstance.collect(keyword);
    f.componentInstance.collect(keyword);
    expect(api.collect).toHaveBeenCalledTimes(1);
    response.next({
      empty: true,
      availability: 'PERIOD_EMPTY',
      periodStart: '2026-10-25',
      periodEnd: '2026-10-31',
    });
    response.complete();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Aucune donnée retournée par Apple');
    expect(f.componentInstance.collecting().size).toBe(0);
  });
  it('does not label network failures as absent popularity', () => {
    api.collect.mockReturnValue(throwError(() => new Error('offline')));
    const f = render();
    f.componentInstance.collect(keyword);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Impossible');
    expect(f.nativeElement.textContent).not.toContain('Aucune donnée publiée');
  });
  it('loads history and preserves missing metrics', () => {
    api.history.mockReturnValue(
      of({
        ...page,
        content: [
          {
            periodType: 'WEEKLY_SUN_SAT',
            periodStart: '2026-10-25',
            periodEnd: '2026-10-31',
            popularity100: 72,
            popularity5: null,
            popularityInGenre: null,
            rankInGenre: 4,
            collectedAt: '2026-11-04T12:00:00Z',
          },
        ],
      }),
    );
    const f = render();
    f.componentInstance.showHistory(keyword);
    f.detectChanges();
    expect(api.history).toHaveBeenCalledWith(1, 0);
    expect(f.nativeElement.textContent).toContain('2026-10-25');
    expect(f.nativeElement.textContent).toContain('72');
  });
  it('shows empty history and history errors', () => {
    const f = render();
    f.componentInstance.showHistory(keyword);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Aucune donnée enregistrée');
    api.history.mockReturnValue(throwError(() => new Error('offline')));
    f.componentInstance.showHistory(keyword);
    f.detectChanges();
    expect(f.componentInstance.historyError()).toContain('Impossible');
  });
  it('sends selected week and clears obsolete diagnostics on change', () => {
    const f = render();
    f.componentInstance.changeWeek({ target: { value: '2026-10-18' } } as unknown as Event);
    f.componentInstance.collect(keyword);
    expect(api.collect).toHaveBeenCalledWith(1, '2026-10-18');
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('2026-10-25');
    f.componentInstance.changeWeek({ target: { value: '2026-10-25' } } as unknown as Event);
    expect(f.componentInstance.rowMessages()).toEqual({});
  });
  it('distinguishes a missing keyword from an empty country/genre period', () => {
    api.collect.mockReturnValue(
      of({
        empty: true,
        availability: 'KEYWORD_ABSENT',
        periodStart: '2026-10-18',
        periodEnd: '2026-10-24',
      }),
    );
    const f = render();
    f.componentInstance.collect(keyword);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('d’autres termes sont disponibles');
    expect(f.nativeElement.textContent).toContain('2026-10-18');
  });
  it('displays available terms with missing metrics without saving', () => {
    api.availableTerms.mockReturnValue(
      of({
        periodStart: '2026-10-25',
        periodEnd: '2026-10-31',
        countryOrRegion: 'CA',
        genre: 'LIFESTYLE',
        terms: [{ searchTerm: 'other term', popularity100: null, rankInGenre: 1 }],
      }),
    );
    const f = render();
    f.componentInstance.availableTerms(keyword);
    f.detectChanges();
    expect(api.availableTerms).toHaveBeenCalledWith(1, '2026-10-25');
    expect(f.nativeElement.textContent).toContain('other term');
    expect(f.nativeElement.textContent).toContain('1 termes disponibles');
    expect(f.nativeElement.textContent).toContain('rang de popularité croissant');
    expect(api.collect).not.toHaveBeenCalled();
    expect(api.create).not.toHaveBeenCalled();
  });
  it('shows diagnostic empty, loading and failure separately', () => {
    const request = new Subject<any>();
    api.availableTerms.mockReturnValue(request);
    const f = render();
    f.componentInstance.availableTerms(keyword);
    f.detectChanges();
    expect(f.componentInstance.diagnosticLoading()).toBe(true);
    request.error(new Error('offline'));
    f.detectChanges();
    expect(f.componentInstance.diagnosticError()).toContain('Impossible');
    expect(f.componentInstance.diagnostic()).toBeNull();
    api.availableTerms.mockReturnValue(
      of({
        periodStart: '2026-10-25',
        periodEnd: '2026-10-31',
        countryOrRegion: 'CA',
        genre: 'LIFESTYLE',
        terms: [],
      }),
    );
    f.componentInstance.availableTerms(keyword);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('même sans filtre');
  });
});
