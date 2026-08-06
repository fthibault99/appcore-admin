import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { RecipePage } from '../../core/recipes/admin-recipe.models';
import { AdminRecipeService } from '../../core/recipes/admin-recipe.service';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

@Component({
  selector: 'app-recipes',
  imports: [DatePipe, ReactiveFormsModule, AdminHeaderComponent],
  templateUrl: './recipes.html',
  styleUrl: './recipes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipesComponent implements OnInit {
  private readonly recipes = inject(AdminRecipeService);
  private readonly router = inject(Router);
  private pageNumber = 0;
  private pageSize = 25;
  readonly query = new FormControl('', { nonNullable: true });
  readonly page = signal<RecipePage | null>(null);
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
    this.query.setValue('');
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
  view(id: string): void {
    void this.router.navigate(['/recipes', id]);
  }
  retry(): void {
    this.load();
  }
  private load(): void {
    if (this.isLoading()) return;
    this.hasError.set(false);
    this.isLoading.set(true);
    this.recipes
      .getRecipes(this.query.value, this.pageNumber, this.pageSize)
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
