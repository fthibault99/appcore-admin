import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { BrickSetDescriptionPage } from '../../core/brickset/admin-brickset.models';
import { AdminBricksetService } from '../../core/brickset/admin-brickset.service';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

@Component({
  selector: 'app-brick-set-descriptions',
  imports: [ReactiveFormsModule, RouterLink, AdminHeaderComponent],
  templateUrl: './brick-set-descriptions.html',
  styleUrl: './brick-set-descriptions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrickSetDescriptionsComponent implements OnInit, OnDestroy {
  private readonly service = inject(AdminBricksetService);
  private readonly router = inject(Router);
  private pageNumber = 0;
  private readonly pageSize = 25;
  private loadSubscription?: Subscription;

  readonly setNum = new FormControl('', { nonNullable: true });
  readonly page = signal<BrickSetDescriptionPage | null>(null);
  readonly isLoading = signal(false);
  readonly hasError = signal(false);

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.loadSubscription?.unsubscribe();
  }

  search(): void {
    this.pageNumber = 0;
    this.load();
  }

  reset(): void {
    this.setNum.setValue('');
    this.search();
  }

  previous(): void {
    if (!this.page()?.first) {
      this.pageNumber--;
      this.load();
    }
  }

  next(): void {
    if (!this.page()?.last) {
      this.pageNumber++;
      this.load();
    }
  }

  retry(): void {
    this.load();
  }

  private load(): void {
    this.loadSubscription?.unsubscribe();
    this.hasError.set(false);
    this.isLoading.set(true);
    this.loadSubscription = this.service
      .getDescriptions(this.setNum.value, this.pageNumber, this.pageSize)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (page) => this.page.set(page),
        error: (error: unknown) => {
          if (
            error instanceof HttpErrorResponse &&
            (error.status === 401 || error.status === 403)
          ) {
            void this.router.navigate(['/login']);
            return;
          }
          this.hasError.set(true);
        },
      });
  }
}
