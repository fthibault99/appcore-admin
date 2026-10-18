import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AdminAuthenticationService } from '../../core/authentication/admin-authentication.service';
import {
  AdminSharedAlbumService,
  SharedAlbumPage,
} from '../../core/shared-albums/admin-shared-album.service';
import { SharedAlbumsComponent } from './shared-albums';

const page: SharedAlbumPage = {
  content: [
    {
      id: 'album-id',
      name: 'Space',
      itemCount: 2,
      createdAt: '2026-10-17T12:00:00Z',
      updatedAt: '2026-10-17T12:00:00Z',
    },
  ],
  totalElements: 26,
  totalPages: 2,
  number: 0,
  first: true,
  last: false,
};

describe('SharedAlbumsComponent', () => {
  let fixture: ComponentFixture<SharedAlbumsComponent>;
  let service: { list: ReturnType<typeof vi.fn> };
  beforeEach(async () => {
    service = { list: vi.fn(() => of(page)) };
    await TestBed.configureTestingModule({
      imports: [SharedAlbumsComponent],
      providers: [
        provideRouter([]),
        { provide: AdminSharedAlbumService, useValue: service },
        { provide: AdminAuthenticationService, useValue: { logout: vi.fn(() => of(undefined)) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SharedAlbumsComponent);
  });

  it('renders metadata and requests next and previous pages', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('Space');
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('album-id');
    const buttons = fixture.nativeElement.querySelectorAll(
      '.pagination button',
    ) as NodeListOf<HTMLButtonElement>;
    expect(buttons[0].disabled).toBe(true);
    service.list.mockReturnValue(of({ ...page, number: 1, first: false, last: true }));
    buttons[1].click();
    fixture.detectChanges();
    expect(service.list).toHaveBeenLastCalledWith(1);
    expect(buttons[1].disabled).toBe(true);
    buttons[0].click();
    expect(service.list).toHaveBeenLastCalledWith(0);
  });

  it('distinguishes loading, failure and empty results and allows retry', () => {
    const pending = new Subject<SharedAlbumPage>();
    service.list.mockReturnValue(pending);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading shared albums');
    expect(fixture.nativeElement.textContent).not.toContain('No shared albums found');
    fixture.componentInstance.load();
    expect(service.list).toHaveBeenCalledTimes(1);
    pending.error(new HttpErrorResponse({ status: 500 }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('No shared albums found');
    service.list.mockReturnValue(
      of({ ...page, content: [], totalElements: 0, totalPages: 0, last: true }),
    );
    fixture.nativeElement.querySelector('.page-heading button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No shared albums found');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('retains the current page on a failed page request', () => {
    fixture.detectChanges();
    service.list.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    fixture.componentInstance.load(1);
    fixture.detectChanges();
    expect(fixture.componentInstance.result()?.number).toBe(0);
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('Space');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });

  for (const status of [401, 403]) {
    it(`returns to login on HTTP ${status}`, () => {
      const router = TestBed.inject(Router);
      vi.spyOn(router, 'navigate').mockResolvedValue(true);
      service.list.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
      fixture.detectChanges();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  }
});
