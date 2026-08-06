import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminRecipeDetail, Recipe } from '../../core/recipes/admin-recipe.models';
import { AdminRecipeService } from '../../core/recipes/admin-recipe.service';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

type RecipeForm = FormGroup<{
  name: FormControl<string>;
  author: FormControl<string>;
  datePublished: FormControl<string>;
  description: FormControl<string>;
  prepTime: FormControl<string>;
  cookTime: FormControl<string>;
  totalTime: FormControl<string>;
  keywords: FormControl<string>;
  recipeYield: FormControl<string>;
  image: FormArray<FormControl<string>>;
  recipeIngredient: FormArray<FormControl<string>>;
  recipeInstructions: FormArray<FormControl<string>>;
}>;

@Component({
  selector: 'app-recipe-detail',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, AdminHeaderComponent],
  templateUrl: './recipe-detail.html',
  styleUrl: './recipe-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeDetailComponent implements OnInit {
  private readonly service = inject(AdminRecipeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly detail = signal<AdminRecipeDetail | null>(null);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly hasError = signal(false);
  readonly saveError = signal('');
  readonly editing = signal(false);
  readonly form: RecipeForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    author: new FormControl('', { nonNullable: true }),
    datePublished: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    prepTime: new FormControl('', { nonNullable: true }),
    cookTime: new FormControl('', { nonNullable: true }),
    totalTime: new FormControl('', { nonNullable: true }),
    keywords: new FormControl('', { nonNullable: true }),
    recipeYield: new FormControl('', { nonNullable: true }),
    image: new FormArray<FormControl<string>>([]),
    recipeIngredient: new FormArray<FormControl<string>>([], Validators.minLength(1)),
    recipeInstructions: new FormArray<FormControl<string>>([], Validators.minLength(1)),
  });

  ngOnInit(): void {
    this.load();
  }
  startEditing(): void {
    const detail = this.detail();
    if (detail) {
      this.populate(detail.recipe);
      this.saveError.set('');
      this.editing.set(true);
    }
  }
  cancelEditing(): void {
    this.editing.set(false);
    this.saveError.set('');
  }
  addImage(): void {
    this.form.controls.image.push(this.item());
  }
  addIngredient(): void {
    this.form.controls.recipeIngredient.push(this.item());
  }
  addInstruction(): void {
    this.form.controls.recipeInstructions.push(this.item());
  }
  removeImage(index: number): void {
    this.form.controls.image.removeAt(index);
  }
  removeIngredient(index: number): void {
    if (this.form.controls.recipeIngredient.length > 1)
      this.form.controls.recipeIngredient.removeAt(index);
  }
  removeInstruction(index: number): void {
    if (this.form.controls.recipeInstructions.length > 1)
      this.form.controls.recipeInstructions.removeAt(index);
  }
  retry(): void {
    this.load();
  }

  save(): void {
    const detail = this.detail();
    this.form.markAllAsTouched();
    if (!detail || this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);
    this.saveError.set('');
    this.service
      .updateRecipe(detail.id, detail.version, this.toRecipe(detail.recipe.url))
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (updated) => {
          this.detail.set(updated);
          this.editing.set(false);
        },
        error: (error: unknown) => this.handleSaveError(error),
      });
  }

  restoreAutomatic(): void {
    const detail = this.detail();
    if (!detail || !detail.manualOverride || this.isSaving()) return;
    this.isSaving.set(true);
    this.saveError.set('');
    this.service
      .restoreAutomatic(detail.id, detail.version)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (updated) => {
          this.detail.set(updated);
          this.editing.set(false);
        },
        error: (error: unknown) => this.handleSaveError(error),
      });
  }

  private load(): void {
    const id = this.route.snapshot.paramMap.get('recipeId');
    if (!id) {
      this.hasError.set(true);
      return;
    }
    this.isLoading.set(true);
    this.hasError.set(false);
    this.service
      .getRecipe(id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (detail) => this.detail.set(detail),
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403))
            void this.router.navigate(['/login']);
          else this.hasError.set(true);
        },
      });
  }

  private populate(recipe: Recipe): void {
    this.form.patchValue({
      name: recipe.name,
      author: recipe.author ?? '',
      datePublished: recipe.datePublished ?? '',
      description: recipe.description ?? '',
      prepTime: recipe.prepTime ?? '',
      cookTime: recipe.cookTime ?? '',
      totalTime: recipe.totalTime ?? '',
      keywords: recipe.keywords ?? '',
      recipeYield: recipe.recipeYield ?? '',
    });
    this.replaceArray(this.form.controls.image, recipe.image ?? []);
    this.replaceArray(this.form.controls.recipeIngredient, recipe.recipeIngredient);
    this.replaceArray(this.form.controls.recipeInstructions, recipe.recipeInstructions);
  }

  private replaceArray(array: FormArray<FormControl<string>>, values: string[]): void {
    array.clear();
    values.forEach((value) => array.push(this.item(value)));
  }
  private item(value = ''): FormControl<string> {
    return new FormControl(value, { nonNullable: true, validators: [Validators.required] });
  }
  private nullable(value: string): string | null {
    return value.trim() || null;
  }
  private toRecipe(url: string): Recipe {
    const value = this.form.getRawValue();
    return {
      url,
      name: value.name.trim(),
      image: value.image.length ? value.image.map((item) => item.trim()) : null,
      author: this.nullable(value.author),
      datePublished: this.nullable(value.datePublished),
      description: this.nullable(value.description),
      prepTime: this.nullable(value.prepTime),
      cookTime: this.nullable(value.cookTime),
      totalTime: this.nullable(value.totalTime),
      keywords: this.nullable(value.keywords),
      recipeIngredient: value.recipeIngredient.map((item) => item.trim()),
      recipeInstructions: value.recipeInstructions.map((item) => item.trim()),
      recipeYield: this.nullable(value.recipeYield),
    };
  }
  private handleSaveError(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 409)
      this.saveError.set('This recipe changed since it was opened. Reload it before saving.');
    else if (error instanceof HttpErrorResponse && error.status === 400)
      this.saveError.set(
        'The recipe contains invalid data. Check its name, ingredients and instructions.',
      );
    else this.saveError.set('Unable to save the recipe. Please try again.');
  }
}
