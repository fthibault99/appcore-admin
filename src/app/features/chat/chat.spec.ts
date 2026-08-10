import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { AdminAuthenticationService } from '../../core/authentication/admin-authentication.service';
import { AdminChatStreamEvent } from '../../core/chat/admin-chat.models';
import { AdminChatService } from '../../core/chat/admin-chat.service';
import { ChatComponent } from './chat';

describe('ChatComponent', () => {
  let fixture: ComponentFixture<ChatComponent>;
  let component: ChatComponent;
  let events: Subject<AdminChatStreamEvent>;
  let chatService: { stream: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    events = new Subject<AdminChatStreamEvent>();
    chatService = { stream: vi.fn(() => events.asObservable()) };
    await TestBed.configureTestingModule({
      imports: [ChatComponent],
      providers: [
        provideRouter([]),
        { provide: AdminChatService, useValue: chatService },
        { provide: AdminAuthenticationService, useValue: { logout: vi.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders streamed deltas and final usage', () => {
    component.form.controls.prompt.setValue('Say hello');
    component.send();
    events.next({ type: 'delta', text: '**Hello**' });
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('.markdown-response strong') as HTMLElement).textContent)
      .toBe('Hello');
    expect(component.isStreaming()).toBe(true);
    events.next({ type: 'delta', text: ' world' });
    events.next({
      type: 'completed',
      response: {
        answer: '**Hello** world',
        model: 'gpt-5.6-luna',
        usage: { inputTokens: 4, outputTokens: 2, totalTokens: 6 },
      },
    });
    events.complete();
    fixture.detectChanges();

    expect(chatService.stream).toHaveBeenCalledWith('Say hello', []);
    expect(fixture.nativeElement.textContent).toContain('Hello world');
    expect(fixture.nativeElement.textContent).toContain('gpt-5.6-luna');
    expect(component.usage()?.totalTokens).toBe(6);
    expect(component.isStreaming()).toBe(false);
  });

  it('sends completed conversation history with the next prompt', () => {
    component.form.controls.prompt.setValue('First question');
    component.send();
    events.next({
      type: 'completed',
      response: {
        answer: 'First answer',
        model: 'gpt-5.6-luna',
        usage: { inputTokens: 2, outputTokens: 2, totalTokens: 4 },
      },
    });
    events.complete();

    events = new Subject<AdminChatStreamEvent>();
    component.form.controls.prompt.setValue('Follow-up question');
    component.send();

    expect(chatService.stream).toHaveBeenLastCalledWith('Follow-up question', [
      { role: 'USER', content: 'First question' },
      { role: 'ASSISTANT', content: 'First answer' },
    ]);
    expect(component.messages().map(({ role, content }) => ({ role, content }))).toEqual([
      { role: 'USER', content: 'First question' },
      { role: 'ASSISTANT', content: 'First answer' },
      { role: 'USER', content: 'Follow-up question' },
    ]);
  });

  it('cancels the active stream', () => {
    component.form.controls.prompt.setValue('Long answer');
    component.send();
    component.stop();

    expect(events.observed).toBe(false);
    expect(component.isStreaming()).toBe(false);
  });
});
