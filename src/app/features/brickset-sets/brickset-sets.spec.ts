import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { BricksetSetPage } from '../../core/brickset/admin-brickset.models';
import { AdminBricksetService } from '../../core/brickset/admin-brickset.service';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';
import { BricksetSetsComponent } from './brickset-sets';

@Component({ selector: 'app-admin-header', template: '' })
class HeaderStub {}

const defaultOptions = { source: 'ALL', sortBy: 'updatedAt', direction: 'DESC', hasInstructions: null, hasImages: null };

const emptyPage: BricksetSetPage = {
  content: [], totalElements: 0, totalPages: 0, number: 0, size: 25, first: true, last: true,
};

describe('BricksetSetsComponent search', () => {
  let fixture: ComponentFixture<BricksetSetsComponent>;
  let initial: Subject<BricksetSetPage>;
  let service: {
    getSets: ReturnType<typeof vi.fn>;
    getSyncConfiguration: ReturnType<typeof vi.fn>;
    getSyncStatistics: ReturnType<typeof vi.fn>;
    saveSyncConfiguration: ReturnType<typeof vi.fn>;
    getOldestSets: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    sessionStorage.removeItem('appcore-admin.brickset.filters');
    initial = new Subject<BricksetSetPage>();
    service = {
      getSets: vi.fn().mockReturnValueOnce(initial).mockReturnValue(of(emptyPage)),
      getSyncConfiguration: vi.fn(() => of({ enabled: true, minimumAgeDays: 90, dailyCallLimit: 20, checkIntervalMinutes: 60, concurrency: 1, batchSize: 10 })),
      getSyncStatistics: vi.fn(() => of(null)),
      saveSyncConfiguration: vi.fn(config => of(config)),
      getOldestSets: vi.fn(() => of([])),
    };
    await TestBed.configureTestingModule({
      imports: [BricksetSetsComponent],
      providers: [provideRouter([]), { provide: AdminBricksetService, useValue: service }],
    }).overrideComponent(BricksetSetsComponent, {
      remove: { imports: [AdminHeaderComponent] }, add: { imports: [HeaderStub] },
    }).compileComponents();
    fixture = TestBed.createComponent(BricksetSetsComponent);
    fixture.detectChanges();
  });

  afterEach(() => sessionStorage.removeItem('appcore-admin.brickset.filters'));

  function submit(term: string): void {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[formControlName="query"]');
    input.value = term;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.search');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  it('validates and saves the configurable batch size', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[formControlName="batchSize"]');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.sync-settings');
    expect(input.value).toBe('10');
    for (const invalid of ['0', '101', '2.5', '']) {
      input.value = invalid;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      form.dispatchEvent(new Event('submit'));
      expect(service.saveSyncConfiguration).not.toHaveBeenCalled();
    }
    input.value = '25';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(service.saveSyncConfiguration).toHaveBeenCalledWith(expect.objectContaining({ batchSize: 25 }));
    expect(fixture.nativeElement.textContent).toContain('Up to 25 sets per call');
  });

  it('refreshes missing cache counters independently of synchronization age', () => {
    const stats = {
      descriptionSetsNotCached: 5, totalSets: 4, neverSynced: 0, staleSets: 0, imagesNotCached: 2, instructionsNotCached: 3,
      iosAppSets: 4, manualSyncSets: 0, manualCallsToday: 0, autoSyncSets: 0,
      callsToday: 0, remainingBudget: 20, lastRunAt: null, lastResult: null,
    };
    service.getSyncStatistics.mockReturnValue(of(stats));
    fixture.componentInstance.loadSync();
    fixture.detectChanges();
    const counters = () => Array.from(fixture.nativeElement.querySelectorAll('.sync-statistics div') as NodeListOf<HTMLElement>)
      .map(row => [row.querySelector('dt')?.textContent, row.querySelector('dd')?.textContent]);
    expect(counters()).toContainEqual(['Described sets not cached', '5']);
    expect(counters()).toContainEqual(['Additional images not cached', '2']);
    expect(counters()).toContainEqual(['Instructions not cached', '3']);
    service.getSyncStatistics.mockReturnValue(of({ ...stats, imagesNotCached: 0, instructionsNotCached: 1 }));
    const refresh = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(button => button.textContent?.trim() === 'Refresh')!;
    refresh.click();
    fixture.detectChanges();
    expect(counters()).toContainEqual(['Additional images not cached', '0']);
    expect(counters()).toContainEqual(['Instructions not cached', '1']);
  });

  it('submits the actual search form while the initial unfiltered request is pending', () => {
    submit(' 75313-1 ');
    expect(service.getSets).toHaveBeenLastCalledWith('75313-1', 0, 25, defaultOptions);
    expect(fixture.componentInstance.page()).toEqual(emptyPage);
    initial.next({ ...emptyPage, totalElements: 3267 });
    expect(fixture.componentInstance.page()?.totalElements).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('No cached set matches this search.');
  });

  it('accepts names and barcodes and resets to an unfiltered first page', () => {
    for (const term of ['Millennium Falcon', '31235', '5702016913866', '673419340618']) {
      submit(term);
      expect(service.getSets).toHaveBeenLastCalledWith(term, 0, 25, defaultOptions);
    }
    const reset: HTMLButtonElement = fixture.nativeElement.querySelector('form.search button[type="button"]');
    reset.click();
    expect(service.getSets).toHaveBeenLastCalledWith('', 0, 25, defaultOptions);
    expect(fixture.componentInstance.searchForm.controls.query.value).toBe('');
  });

  it('keeps the submitted term when paging and resets the page for a new search', () => {
    service.getSets.mockReturnValue(of({ ...emptyPage, last: false, totalElements: 60, totalPages: 3 }));
    submit('Falcon');
    fixture.componentInstance.searchForm.controls.query.setValue('unsubmitted edit');
    fixture.componentInstance.next();
    expect(service.getSets).toHaveBeenLastCalledWith('Falcon', 1, 25, defaultOptions);
    submit('Eiffel');
    expect(service.getSets).toHaveBeenLastCalledWith('Eiffel', 0, 25, defaultOptions);
  });
  it('combines source, search and date order and preserves them when paging', () => {
    service.getSets.mockReturnValue(of({ ...emptyPage, last: false, totalElements: 60, totalPages: 3 }));
    submit('Falcon');
    for (const [name, value] of [['source', 'AUTO_SYNC'], ['sortBy', 'bricksetLastSyncedAt'], ['direction', 'ASC']]) {
      const select: HTMLSelectElement = fixture.nativeElement.querySelector(`select[formControlName="${name}"]`);
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      fixture.detectChanges();
    }
    const options = { ...defaultOptions, source: 'AUTO_SYNC', sortBy: 'bricksetLastSyncedAt', direction: 'ASC' };
    expect(service.getSets).toHaveBeenLastCalledWith('Falcon', 0, 25, options);
    fixture.componentInstance.next();
    expect(service.getSets).toHaveBeenLastCalledWith('Falcon', 1, 25, options);
    fixture.componentInstance.reset();
    expect(service.getSets).toHaveBeenLastCalledWith('', 0, 25, defaultOptions);
    fixture.componentInstance.searchForm.controls.source.setValue('UNKNOWN');
    fixture.componentInstance.search();
    expect(service.getSets).toHaveBeenLastCalledWith('', 0, 25, { ...defaultOptions, source: 'UNKNOWN' });
  });

  it('combines cached instructions and images with other filters and keeps them when paging', () => {
    service.getSets.mockReturnValue(of({ ...emptyPage, last: false }));
    submit('Falcon');
    fixture.componentInstance.searchForm.controls.source.setValue('AUTO_SYNC');
    for (const name of ['hasInstructions', 'hasImages']) {
      const select: HTMLSelectElement = fixture.nativeElement.querySelector(`select[formControlName="${name}"]`);
      select.selectedIndex = 1;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      fixture.detectChanges();
    }
    const options = { ...defaultOptions, source: 'AUTO_SYNC', hasInstructions: true, hasImages: true };
    expect(service.getSets).toHaveBeenLastCalledWith('Falcon', 0, 25, options);
    fixture.componentInstance.next();
    expect(service.getSets).toHaveBeenLastCalledWith('Falcon', 1, 25, options);
    fixture.componentInstance.reset();
    expect(service.getSets).toHaveBeenLastCalledWith('', 0, 25, defaultOptions);
  });
  it('combines uncached instructions and uncached images and clears both on reset', () => {
    submit('Falcon');
    for (const name of ['hasInstructions', 'hasImages']) {
      const select: HTMLSelectElement = fixture.nativeElement.querySelector(`select[formControlName="${name}"]`);
      select.selectedIndex = 2;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    expect(service.getSets).toHaveBeenLastCalledWith('Falcon', 0, 25, {
      ...defaultOptions, hasInstructions: false, hasImages: false,
    });
    fixture.componentInstance.reset();
    expect(service.getSets).toHaveBeenLastCalledWith('', 0, 25, defaultOptions);
  });

  it('restores the submitted filters, sorting and page after returning from a detail or reloading', () => {
    service.getSets.mockReturnValue(of({ ...emptyPage, last: false }));
    fixture.componentInstance.searchForm.setValue({
      query: ' Falcon ', source: 'AUTO_SYNC', sortBy: 'imagesFetchedAt',
      direction: 'ASC', hasInstructions: false, hasImages: true,
    });
    fixture.componentInstance.search();
    fixture.componentInstance.next();
    // An unsubmitted search edit must not replace the active search on return.
    fixture.componentInstance.searchForm.controls.query.setValue('unsubmitted');
    fixture.destroy();
    fixture = TestBed.createComponent(BricksetSetsComponent);
    fixture.detectChanges();
    const options = { source: 'AUTO_SYNC', sortBy: 'imagesFetchedAt', direction: 'ASC', hasInstructions: false, hasImages: true };
    expect(service.getSets).toHaveBeenLastCalledWith('Falcon', 1, 25, options);
    expect(fixture.componentInstance.searchForm.getRawValue()).toEqual({ query: 'Falcon', ...options });

    fixture.componentInstance.reset();
    fixture.destroy();
    fixture = TestBed.createComponent(BricksetSetsComponent);
    fixture.detectChanges();
    expect(service.getSets).toHaveBeenLastCalledWith('', 0, 25, defaultOptions);
    expect(fixture.componentInstance.searchForm.getRawValue()).toEqual({ query: '', ...defaultOptions });
  });

  it.each(['{', 'null', JSON.stringify({ query: '', options: { ...defaultOptions, source: 'INVALID' }, page: 0 }),
    JSON.stringify({ query: '', options: defaultOptions, page: -1 }),
    JSON.stringify({ query: '', options: { ...defaultOptions, hasImages: 'false' }, page: 0 }),
  ])('ignores invalid session state: %s', stored => {
    fixture.destroy();
    sessionStorage.setItem('appcore-admin.brickset.filters', stored);
    fixture = TestBed.createComponent(BricksetSetsComponent);
    fixture.detectChanges();
    expect(service.getSets).toHaveBeenLastCalledWith('', 0, 25, defaultOptions);
  });

});
