import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { BricksetSetPage } from '../../core/brickset/admin-brickset.models';
import { AdminBricksetService } from '../../core/brickset/admin-brickset.service';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

@Component({
  selector: 'app-brickset-sets',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, AdminHeaderComponent],
  templateUrl: './brickset-sets.html',
  styleUrl: './brickset-sets.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BricksetSetsComponent implements OnInit {
  private readonly service = inject(AdminBricksetService);
  private readonly router = inject(Router);
  private pageNumber = 0;
  private readonly pageSize = 25;
  readonly setNumber = new FormControl('', { nonNullable: true });
  readonly page = signal<BricksetSetPage | null>(null);
  readonly isLoading = signal(false);
  readonly hasError = signal(false);

  ngOnInit(): void {
    this.load();
  }

  search(): void {
    this.pageNumber = 0;
    this.load();
  }

  reset(): void {
    this.setNumber.setValue('');
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

  view(id: number): void {
    void this.router.navigate(['/brickset', id]);
  }

  retry(): void {
    this.load();
  }

  private load(): void {
    if (this.isLoading()) return;
    this.hasError.set(false);
    this.isLoading.set(true);
    this.service
      .getSets(this.setNumber.value, this.pageNumber, this.pageSize)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (page) => this.page.set(page),
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
            void this.router.navigate(['/login']);
            return;
          }
          this.hasError.set(true);
        },
      });
  }
}
