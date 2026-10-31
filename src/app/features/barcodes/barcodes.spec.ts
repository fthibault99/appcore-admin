import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminBarcodeService } from '../../core/barcodes/admin-barcode.service';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';
import { BarcodesComponent } from './barcodes';

@Component({ selector: 'app-admin-header', template: '' })
class HeaderStub {}

describe('BarcodesComponent filters', () => {
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

    const domain: HTMLSelectElement = fixture.nativeElement.querySelector('[formControlName="domain"]');
    domain.value = 'LEGO';
    domain.dispatchEvent(new Event('change'));
    const missing: HTMLSelectElement = fixture.nativeElement.querySelector('[formControlName="missingLegoSetNumber"]');
    missing.selectedIndex = 1;
    missing.dispatchEvent(new Event('change'));
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(service.getBarcodes).toHaveBeenLastCalledWith('', 'LEGO', 0, 25, true);

    fixture.componentInstance.next();
    expect(service.getBarcodes).toHaveBeenLastCalledWith('', 'LEGO', 1, 25, true);
    const reset: HTMLButtonElement = fixture.nativeElement.querySelector('form button[type="button"]');
    reset.click();
    expect(service.getBarcodes).toHaveBeenLastCalledWith('', '', 0, 25, false);
  });
});
