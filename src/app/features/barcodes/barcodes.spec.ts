import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { BarcodeEnrichmentResult } from '../../core/barcodes/admin-barcode.models';
import { AdminBarcodeService } from '../../core/barcodes/admin-barcode.service';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';
import { BarcodesComponent } from './barcodes';

@Component({ selector: 'app-admin-header', template: '' })
class HeaderStub {}

describe('BarcodesComponent filters', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());
  it('combines missing sets and domain, keeps them while paging, and resets them', async () => {
    const service = {
      getBarcodes: vi.fn(() => of({
        content: [], totalElements: 30, totalPages: 2, number: 0,
        size: 25, first: true, last: false,
      })),
    };
    await TestBed.configureTestingModule({
      imports: [BarcodesComponent],
      providers: [provideRouter([]), { provide: AdminBarcodeService, useValue: service }],
    }).overrideComponent(BarcodesComponent, {
      remove: { imports: [AdminHeaderComponent] }, add: { imports: [HeaderStub] },
    }).compileComponents();
    const fixture = TestBed.createComponent(BarcodesComponent);
    fixture.detectChanges();
    expect(service.getBarcodes).toHaveBeenLastCalledWith('', '', 0, 25, false);

    fixture.componentInstance.filterForm.controls.query.setValue('train');
    const domain: HTMLSelectElement = fixture.nativeElement.querySelector('[formControlName="domain"]');
    domain.value = 'LEGO';
    domain.dispatchEvent(new Event('change'));
    const missing: HTMLSelectElement = fixture.nativeElement.querySelector('[formControlName="missingLegoSetNumber"]');
    missing.selectedIndex = 1;
    missing.dispatchEvent(new Event('change'));
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(service.getBarcodes).toHaveBeenLastCalledWith('train', 'LEGO', 0, 25, true);

    fixture.componentInstance.next();
    expect(service.getBarcodes).toHaveBeenLastCalledWith('train', 'LEGO', 1, 25, true);
    fixture.destroy();
    const restored = TestBed.createComponent(BarcodesComponent);
    restored.detectChanges();
    expect(service.getBarcodes).toHaveBeenLastCalledWith('train', 'LEGO', 1, 25, true);
    expect(restored.componentInstance.filterForm.getRawValue()).toEqual({
      query: 'train', domain: 'LEGO', missingLegoSetNumber: true,
    });
    const reset: HTMLButtonElement = restored.nativeElement.querySelector('form button[type="button"]');
    reset.click();
    expect(service.getBarcodes).toHaveBeenLastCalledWith('', '', 0, 25, false);
    restored.destroy();
    const afterReset = TestBed.createComponent(BarcodesComponent);
    afterReset.detectChanges();
    expect(service.getBarcodes).toHaveBeenLastCalledWith('', '', 0, 25, false);
  });

  it.each(['{', 'null', JSON.stringify({ query: '', domain: 'INVALID', missingLegoSetNumber: true, page: -1 })])(
    'ignores invalid stored filters: %s', (stored) => {
      sessionStorage.setItem('appcore-admin.barcodes.filters', stored);
      TestBed.configureTestingModule({
        providers: [provideRouter([]), {
          provide: AdminBarcodeService, useValue: { getBarcodes: vi.fn(() => of({ content: [] })) },
        }],
      });
      const component = TestBed.runInInjectionContext(() => new BarcodesComponent());
      component.ngOnInit();
      expect(component.filterForm.getRawValue()).toEqual({
        query: '', domain: '', missingLegoSetNumber: false,
      });
    },
  );
});


describe('BarcodesComponent Brickset enrichment', () => {
  const batch = { processed: 100, updated: 40, notFound: 55, skipped: 5, nextAfterId: 150, hasMore: true };
  let pending: Subject<BarcodeEnrichmentResult>;
  let service: { getBarcodes: ReturnType<typeof vi.fn>; enrichMissingLegoSets: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    sessionStorage.clear();
    pending = new Subject<BarcodeEnrichmentResult>();
    service = {
      getBarcodes: vi.fn(() => of({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 25, first: true, last: true })),
      enrichMissingLegoSets: vi.fn().mockReturnValueOnce(pending)
        .mockReturnValue(of({ ...batch, processed: 2, updated: 1, notFound: 1, skipped: 0, nextAfterId: 160, hasMore: false })),
    };
    await TestBed.configureTestingModule({
      imports: [BarcodesComponent],
      providers: [provideRouter([]), { provide: AdminBarcodeService, useValue: service }],
    }).overrideComponent(BarcodesComponent, {
      remove: { imports: [AdminHeaderComponent] }, add: { imports: [HeaderStub] },
    }).compileComponents();
  });
  afterEach(() => sessionStorage.clear());

  it('processes all batches once, accumulates counts, and reloads with retained filters', () => {
    const fixture = TestBed.createComponent(BarcodesComponent);
    fixture.detectChanges();
    fixture.componentInstance.filterForm.patchValue({ domain: 'LEGO', missingLegoSetNumber: true });
    fixture.componentInstance.enrichMissingLegoSets();
    fixture.componentInstance.enrichMissingLegoSets();
    expect(service.enrichMissingLegoSets).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.isEnriching()).toBe(true);
    pending.next(batch);
    pending.complete();
    expect(service.enrichMissingLegoSets).toHaveBeenLastCalledWith(150);
    expect(service.enrichMissingLegoSets).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.enrichment()).toMatchObject({ processed: 102, updated: 41, notFound: 56, skipped: 5 });
    expect(fixture.componentInstance.isEnriching()).toBe(false);
    expect(service.getBarcodes).toHaveBeenLastCalledWith('', 'LEGO', 0, 25, true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Completed:');
    expect(fixture.nativeElement.textContent).toContain('41 updated');
  });

  it('retains committed counts and reports an error when a later batch fails', () => {
    service.enrichMissingLegoSets.mockReset().mockReturnValueOnce(of(batch))
      .mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = TestBed.createComponent(BarcodesComponent);
    fixture.detectChanges();
    fixture.componentInstance.enrichMissingLegoSets();
    expect(fixture.componentInstance.enrichment()?.updated).toBe(40);
    expect(fixture.componentInstance.enrichmentError()).toContain('Previous batches were saved');
    expect(fixture.componentInstance.isEnriching()).toBe(false);
    expect(service.getBarcodes).toHaveBeenCalledTimes(2);
  });

  it('stops sending batches after navigating away', () => {
    const fixture = TestBed.createComponent(BarcodesComponent);
    fixture.detectChanges();
    fixture.componentInstance.enrichMissingLegoSets();
    fixture.destroy();
    pending.next(batch);
    pending.complete();
    expect(service.enrichMissingLegoSets).toHaveBeenCalledTimes(1);
  });
});
