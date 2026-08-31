import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminMealAgainService } from '../../core/mealagain/admin-mealagain.service';
import { MealAgainAccount, MealAgainPage } from '../../core/mealagain/admin-mealagain.models';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

@Component({
  selector: 'app-mealagain',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, AdminHeaderComponent],
  templateUrl: './mealagain.html',
  styleUrl: './mealagain.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealAgainComponent implements OnInit {
  private readonly service = inject(AdminMealAgainService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly userId = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
    ],
  });
  readonly page = signal<MealAgainPage<MealAgainAccount> | null>(null);
  readonly isLoading = signal(false);
  readonly hasError = signal(false);
  private pageNumber = 0;
  ngOnInit() {
    this.load();
  }
  search() {
    if (this.isLoading()) return;
    this.userId.setValue(this.userId.value.trim());
    if (this.userId.invalid) {
      this.userId.markAsTouched();
      return;
    }
    this.pageNumber = 0;
    this.load();
  }
  reset() {
    if (this.isLoading()) return;
    this.userId.setValue('');
    this.search();
  }
  previous() {
    if (this.isLoading() || !this.page() || this.page()!.first) return;
    this.pageNumber--;
    this.load();
  }
  next() {
    if (this.isLoading() || !this.page() || this.page()!.last) return;
    this.pageNumber++;
    this.load();
  }
  retry() {
    this.load();
  }
  private load() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.hasError.set(false);
    this.page.set(null);
    this.service
      .getAccounts(this.userId.value, this.pageNumber)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (page) => this.page.set(page),
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && [401, 403].includes(error.status))
            void this.router.navigate(['/login']);
          else this.hasError.set(true);
        },
      });
  }
}
