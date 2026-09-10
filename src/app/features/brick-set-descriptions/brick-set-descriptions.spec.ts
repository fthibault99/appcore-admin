import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { BrickSetDescriptionPage } from '../../core/brickset/admin-brickset.models';
import { AdminBricksetService } from '../../core/brickset/admin-brickset.service';
import { BrickSetDescriptionsComponent } from './brick-set-descriptions';

describe('BrickSetDescriptionsComponent', () => {
  let fixture: ComponentFixture<BrickSetDescriptionsComponent>;
  let service: { getDescriptions: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    service = {
      getDescriptions: vi.fn(() =>
        of({
          content: [
            {
              id: 11,
              setNum: '10307',
              language: 'fr',
              description: 'Une tour Eiffel en briques.',
              model: 'gpt-5.6',
              generatedAt: '2026-09-09T12:00:00Z',
            },
          ],
          totalElements: 1,
          totalPages: 1,
          size: 25,
          number: 0,
          first: true,
          last: true,
        }),
      ),
    };
    await TestBed.configureTestingModule({
      imports: [BrickSetDescriptionsComponent],
      providers: [provideRouter([]), { provide: AdminBricksetService, useValue: service }],
    }).compileComponents();
    fixture = TestBed.createComponent(BrickSetDescriptionsComponent);
  });

  it('renders set number, language and description', () => {
    fixture.detectChanges();

    expect(service.getDescriptions).toHaveBeenCalledWith('', 0, 25);
    expect(fixture.nativeElement.textContent).toContain('10307');
    expect(fixture.nativeElement.textContent).toContain('fr');
    expect(fixture.nativeElement.textContent).toContain('Une tour Eiffel en briques.');
  });

  it('searches by set number', () => {
    fixture.detectChanges();
    fixture.componentInstance.setNum.setValue('10307');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));

    expect(service.getDescriptions).toHaveBeenLastCalledWith('10307', 0, 25);
  });

  it('starts a filtered search while the initial list is still loading', () => {
    const initial = new Subject<BrickSetDescriptionPage>();
    service.getDescriptions.mockReturnValueOnce(initial.asObservable()).mockReturnValueOnce(
      of({
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 25,
        number: 0,
        first: true,
        last: true,
      }),
    );
    fixture.detectChanges();

    fixture.componentInstance.setNum.setValue('10307');
    fixture.componentInstance.search();

    expect(service.getDescriptions).toHaveBeenNthCalledWith(1, '', 0, 25);
    expect(service.getDescriptions).toHaveBeenNthCalledWith(2, '10307', 0, 25);
  });
});
