import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminRevoqraService } from '../../core/revoqra/admin-revoqra.service';
import { BillingEvent, RevoqraPage } from '../../core/revoqra/admin-revoqra.models';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';
@Component({
  selector: 'app-revoqra-events',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, AdminHeaderComponent],
  templateUrl: './revoqra-events.html',
  styleUrl: './revoqra-events.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RevoqraEventsComponent implements OnInit {
  private readonly service = inject(AdminRevoqraService);
  private readonly destroyRef = inject(DestroyRef);
  readonly type = new FormControl('', { nonNullable: true });
  readonly processed = new FormControl('', { nonNullable: true });
  readonly page = signal<RevoqraPage<BillingEvent> | null>(null);
  readonly loading = signal(false);
  readonly deletingEventId = signal<string | null>(null);
  readonly deleteError = signal(false);
  pageNumber = 0;
  ngOnInit() {
    this.load();
  }
  search() {
    this.pageNumber = 0;
    this.load();
  }
  previous() {
    if (!this.page()?.first) {
      this.pageNumber--;
      this.load();
    }
  }
  next() {
    if (!this.page()?.last) {
      this.pageNumber++;
      this.load();
    }
  }
  deleteEvent(event: BillingEvent) {
    if (!window.confirm(`Delete billing event ${event.providerEventId}?`)) return;
    this.deletingEventId.set(event.id);
    this.deleteError.set(false);
    this.service
      .deleteEvent(event.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deletingEventId.set(null)),
      )
      .subscribe({
        next: () => {
          if ((this.page()?.content.length ?? 0) === 1 && this.pageNumber > 0) this.pageNumber--;
          this.load();
        },
        error: () => this.deleteError.set(true),
      });
  }
  private load() {
    this.loading.set(true);
    let p: boolean | null = this.processed.value === '' ? null : this.processed.value === 'true';
    this.service
      .getEvents(this.type.value, p, this.pageNumber)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({ next: (v) => this.page.set(v) });
  }
}
