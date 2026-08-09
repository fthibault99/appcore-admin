import { ChangeDetectionStrategy, Component, computed, inject, NgZone, OnDestroy, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { AdminChatRequestError, AdminChatService } from '../../core/chat/admin-chat.service';
import { AdminChatUsage } from '../../core/chat/admin-chat.models';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';
import { marked } from 'marked';

@Component({
  selector: 'app-chat',
  imports: [ReactiveFormsModule, AdminHeaderComponent],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent implements OnDestroy {
  private readonly chat = inject(AdminChatService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private streamSubscription?: Subscription;

  readonly form = new FormGroup({
    prompt: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(20_000)],
    }),
  });
  readonly answer = signal('');
  readonly submittedPrompt = signal('');
  readonly answerHtml = computed(() => marked.parse(this.answer(), { async: false, gfm: true }));
  readonly model = signal('gpt-5.6-luna');
  readonly usage = signal<AdminChatUsage | null>(null);
  readonly errorMessage = signal('');
  readonly isStreaming = signal(false);

  send(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isStreaming()) return;
    this.answer.set('');
    this.submittedPrompt.set(this.form.controls.prompt.value.trim());
    this.usage.set(null);
    this.errorMessage.set('');
    this.isStreaming.set(true);
    this.streamSubscription = this.chat.stream(this.form.controls.prompt.value)
      .pipe(finalize(() => this.isStreaming.set(false)))
      .subscribe({
        next: (event) => {
          this.zone.run(() => {
            if (event.type === 'delta') this.answer.update((answer) => answer + event.text);
            else {
              this.answer.set(event.response.answer);
              this.model.set(event.response.model);
              this.usage.set(event.response.usage);
            }
          });
        },
        error: (error: unknown) => this.handleError(error),
      });
  }

  stop(): void {
    this.streamSubscription?.unsubscribe();
    this.streamSubscription = undefined;
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private handleError(error: unknown): void {
    if (error instanceof AdminChatRequestError && (error.status === 401 || error.status === 403)) {
      void this.router.navigate(['/login']);
      return;
    }
    this.errorMessage.set(error instanceof Error ? error.message : 'Unable to stream the OpenAI response.');
  }
}
