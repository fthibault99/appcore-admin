import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminVoiceInboxService } from '../../core/voice-inbox/admin-voice-inbox.service';
import { VoiceInboxComponent } from './voice-inbox';

describe('VoiceInboxComponent', () => {
  let fixture: ComponentFixture<VoiceInboxComponent>;
  const service = {
    transcribe: vi.fn(),
    organize: vi.fn().mockReturnValue(of({ title: 'Demain', summary: 'Une tâche', tasks: ['Appeler Marc'] })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VoiceInboxComponent],
      providers: [provideRouter([]), { provide: AdminVoiceInboxService, useValue: service }],
    }).compileComponents();
    fixture = TestBed.createComponent(VoiceInboxComponent);
    fixture.detectChanges();
  });

  it('renders recording controls and organized content', () => {
    expect(fixture.nativeElement.textContent).toContain('Start recording');
    fixture.componentInstance.transcript.set('Appeler Marc');
    fixture.componentInstance.organize();
    fixture.detectChanges();
    expect(service.organize).toHaveBeenCalledWith('Appeler Marc');
    expect(fixture.nativeElement.textContent).toContain('Une tâche');
    expect(fixture.nativeElement.textContent).toContain('Appeler Marc');
  });
});
