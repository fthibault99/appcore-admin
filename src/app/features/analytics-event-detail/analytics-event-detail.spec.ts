import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminAnalyticsService } from '../../core/analytics/admin-analytics.service';
import { AnalyticsEventDetailComponent } from './analytics-event-detail';

describe('AnalyticsEventDetailComponent', () => {
  let fixture: ComponentFixture<AnalyticsEventDetailComponent>;
  it('loads and safely formats event properties', async () => {
    const getEvent = vi.fn(() =>
      of({
        id: 'event-1',
        appClientId: 'client-1',
        apiKeyId: 'key-1',
        eventType: 'app.opened',
        occurredAt: '2026-08-01T12:00:00Z',
        receivedAt: '2026-08-01T12:00:01Z',
        anonymousUserId: null,
        sessionId: null,
        platform: 'ios',
        appVersion: '1',
        language: null,
        region: null,
        subscriptionStatus: null,
        purchased: false,
        properties: { source: '<b>unsafe</b>' },
      }),
    );
    await TestBed.configureTestingModule({
      imports: [AnalyticsEventDetailComponent],
      providers: [
        provideRouter([]),
        { provide: AdminAnalyticsService, useValue: { getEvent } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'event-1' } } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AnalyticsEventDetailComponent);
    fixture.detectChanges();
    expect(getEvent).toHaveBeenCalledWith('event-1');
    expect(fixture.nativeElement.querySelector('pre').textContent).toContain('<b>unsafe</b>');
    expect(fixture.nativeElement.querySelector('pre b')).toBeNull();
  });
});
