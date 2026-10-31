import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject } from 'rxjs';
import { AdminBricksetSetDetail } from '../../core/brickset/admin-brickset.models';
import { AdminBricksetService } from '../../core/brickset/admin-brickset.service';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';
import { BricksetSetDetailComponent } from './brickset-set-detail';

@Component({ selector: 'app-admin-header', template: '' })
class HeaderStub {}

describe('BricksetSetDetailComponent manual refresh', () => {
  let fixture: ComponentFixture<BricksetSetDetailComponent>;
  let result: Subject<AdminBricksetSetDetail>;
  let service: { getSet: ReturnType<typeof vi.fn>; refreshSet: ReturnType<typeof vi.fn> };
  const current = { id: 7, setNumber: '75313', numberVariant: 1, setName: 'Original' } as AdminBricksetSetDetail;

  beforeEach(async () => {
    result = new Subject<AdminBricksetSetDetail>();
    service = { getSet: vi.fn(() => of(current)), refreshSet: vi.fn(() => result) };
    await TestBed.configureTestingModule({ imports: [BricksetSetDetailComponent], providers: [
      provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ setId: '7' }) } } },
      { provide: AdminBricksetService, useValue: service },
    ] }).overrideComponent(BricksetSetDetailComponent, {
      remove: { imports: [AdminHeaderComponent] }, add: { imports: [HeaderStub] },
    }).compileComponents();
    fixture = TestBed.createComponent(BricksetSetDetailComponent);
    fixture.detectChanges();
  });

  it('refreshes all three parts and disables repeated clicks until completion', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.refresh-actions button');
    button.click(); fixture.detectChanges();
    expect(button.disabled).toBe(true);
    fixture.componentInstance.refresh();
    expect(service.refreshSet).toHaveBeenCalledExactlyOnceWith(7);
    const updated = { ...current, setName: 'Updated', bricksetSyncSource: 'ADMIN_MANUAL' as const };
    result.next(updated); result.complete(); fixture.detectChanges();
    expect(fixture.componentInstance.detail()).toEqual(updated);
    expect(button.disabled).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Details, images and instructions updated.');
    expect(fixture.nativeElement.textContent).toContain('ADMIN_MANUAL');
  });

  it('keeps the previous detail on provider failure and shows a useful retry message', () => {
    fixture.componentInstance.refresh();
    result.error(new HttpErrorResponse({ status: 429 })); fixture.detectChanges();
    expect(fixture.componentInstance.detail()).toEqual(current);
    expect(fixture.componentInstance.isRefreshing()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('temporarily limited');
  });
});
