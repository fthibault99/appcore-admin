import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminVoiceInboxService } from '../../core/voice-inbox/admin-voice-inbox.service';
import { VoiceInboxResult } from '../../core/voice-inbox/voice-inbox.models';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

@Component({
  selector: 'app-voice-inbox',
  imports: [AdminHeaderComponent],
  templateUrl: './voice-inbox.html',
  styleUrl: './voice-inbox.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoiceInboxComponent implements OnDestroy {
  private readonly service = inject(AdminVoiceInboxService);
  private readonly router = inject(Router);
  private recorder?: MediaRecorder;
  private stream?: MediaStream;
  private chunks: Blob[] = [];
  private timer?: ReturnType<typeof setInterval>;

  readonly isRecording = signal(false);
  readonly isTranscribing = signal(false);
  readonly isOrganizing = signal(false);
  readonly elapsedSeconds = signal(0);
  readonly transcript = signal('');
  readonly result = signal<VoiceInboxResult | null>(null);
  readonly errorMessage = signal('');

  async startRecording(): Promise<void> {
    if (this.isRecording() || this.isTranscribing()) return;
    this.errorMessage.set('');
    this.result.set(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.errorMessage.set('Audio recording is not supported by this browser.');
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = this.preferredMimeType();
      this.chunks = [];
      this.recorder = mimeType ? new MediaRecorder(this.stream, { mimeType }) : new MediaRecorder(this.stream);
      this.recorder.ondataavailable = (event) => { if (event.data.size > 0) this.chunks.push(event.data); };
      this.recorder.onstop = () => this.transcribeRecording(this.recorder?.mimeType || mimeType || 'audio/webm');
      this.elapsedSeconds.set(0);
      this.isRecording.set(true);
      this.timer = setInterval(() => this.elapsedSeconds.update((seconds) => seconds + 1), 1000);
      this.recorder.start();
    } catch (error) {
      this.releaseRecording();
      this.errorMessage.set(error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Microphone access was denied.' : 'Unable to start audio recording.');
    }
  }

  stopRecording(): void {
    if (!this.recorder || this.recorder.state === 'inactive') return;
    this.isRecording.set(false);
    this.stopTimer();
    this.recorder.stop();
    this.stream?.getTracks().forEach((track) => track.stop());
  }

  organize(): void {
    const text = this.transcript().trim();
    if (!text || this.isOrganizing()) return;
    this.errorMessage.set('');
    this.isOrganizing.set(true);
    this.service.organize(text).pipe(finalize(() => this.isOrganizing.set(false))).subscribe({
      next: (result) => this.result.set(result),
      error: (error: unknown) => this.handleRequestError(error, 'Unable to organize the transcript.'),
    });
  }

  formattedElapsed(): string {
    const seconds = this.elapsedSeconds();
    return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }

  ngOnDestroy(): void { this.releaseRecording(); }

  private transcribeRecording(mimeType: string): void {
    this.releaseRecording();
    const audio = new Blob(this.chunks, { type: mimeType });
    if (audio.size === 0) { this.errorMessage.set('The recording is empty.'); return; }
    this.isTranscribing.set(true);
    this.service.transcribe(audio, `voice-inbox.${this.extensionFor(mimeType)}`)
      .pipe(finalize(() => this.isTranscribing.set(false)))
      .subscribe({
        next: ({ text }) => this.transcript.set(text),
        error: (error: unknown) => this.handleRequestError(error, 'Unable to transcribe the recording.'),
      });
  }

  private preferredMimeType(): string {
    return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
  }

  private extensionFor(mimeType: string): string { return mimeType.startsWith('audio/mp4') ? 'm4a' : 'webm'; }

  private handleRequestError(error: unknown, fallback: string): void {
    if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
      void this.router.navigate(['/login']); return;
    }
    const message = error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
      ? error.error.message : fallback;
    this.errorMessage.set(message);
  }

  private stopTimer(): void { if (this.timer) clearInterval(this.timer); this.timer = undefined; }

  private releaseRecording(): void {
    this.stopTimer();
    if (this.recorder) this.recorder.onstop = null;
    if (this.recorder?.state !== 'inactive') this.recorder?.stop();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.recorder = undefined;
    this.stream = undefined;
    this.isRecording.set(false);
  }
}
