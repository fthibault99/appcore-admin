import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminDishRecreationRequestError, AdminDishRecreationService } from '../../core/dish-recreation/admin-dish-recreation.service';
import { DishRecreationResult, DishRecreationState, RecipeComponentType } from '../../core/dish-recreation/dish-recreation.models';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

type DishRecreationDisplayState = DishRecreationState | 'PREPARING_REQUEST' | 'WAITING_FOR_ANALYSIS';

@Component({
  selector: 'app-dish-recreation',
  imports: [AdminHeaderComponent, ReactiveFormsModule],
  templateUrl: './dish-recreation.html',
  styleUrl: './dish-recreation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DishRecreationComponent implements OnDestroy {
  private readonly service = inject(AdminDishRecreationService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private subscription?: Subscription;
  private statusTimer?: ReturnType<typeof setTimeout>;
  private readonly statusQueue: DishRecreationDisplayState[] = [];
  private pendingResult?: DishRecreationResult;
  private dishImage?: File;
  private menuImage?: File;

  readonly form = this.fb.nonNullable.group({
    dishName: ['', [Validators.required, Validators.maxLength(2000)]],
    restaurantName: [''], restaurantLocation: [''], description: [''],
    servings: [4, [Validators.required, Validators.min(1), Validators.max(50)]],
    language: ['fr', [Validators.required, Validators.pattern(/^[a-zA-Z]{2}$/)]],
  });
  readonly isSubmitting = signal(false);
  readonly currentState = signal<DishRecreationDisplayState | null>(null);
  readonly result = signal<DishRecreationResult | null>(null);
  readonly errorMessage = signal('');
  readonly dishImageName = signal('');
  readonly menuImageName = signal('');

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isSubmitting()) return;
    const value = this.form.getRawValue();
    if (!value.restaurantName.trim() && !value.description.trim() && !this.dishImage && !this.menuImage) {
      this.errorMessage.set('Add a restaurant, description, dish image, or menu image.'); return;
    }
    this.resetRun();
    const data = new FormData();
    data.set('dishName', value.dishName.trim());
    this.setIfPresent(data, 'restaurantName', value.restaurantName);
    this.setIfPresent(data, 'restaurantLocation', value.restaurantLocation);
    this.setIfPresent(data, 'description', value.description);
    data.set('servings', String(value.servings));
    data.set('language', value.language.toLowerCase());
    if (this.dishImage) data.set('dishImage', this.dishImage);
    if (this.menuImage) data.set('menuImage', this.menuImage);
    this.isSubmitting.set(true);
    this.showState('PREPARING_REQUEST');
    this.subscription = this.service.stream(data).subscribe({
      next: (event) => {
        if (event.type === 'progress') this.enqueueState(event.state);
        if (event.type === 'result') { this.pendingResult = event.result; this.finishWhenStatusesShown(); }
        if (event.type === 'error') this.fail(event.message);
      },
      error: (error: unknown) => {
        if (error instanceof AdminDishRecreationRequestError && (error.status === 401 || error.status === 403)) {
          void this.router.navigate(['/login']); return;
        }
        this.fail(error instanceof Error ? error.message : 'Unable to recreate the dish.');
      },
    });
  }

  chooseImage(role: 'dish' | 'menu', event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (role === 'dish') { this.dishImage = file; this.dishImageName.set(file?.name ?? ''); }
    else { this.menuImage = file; this.menuImageName.set(file?.name ?? ''); }
  }

  stateLabel(state: DishRecreationDisplayState): string {
    return ({ PREPARING_REQUEST: 'Preparing your request', WAITING_FOR_ANALYSIS: 'Request sent — waiting for analysis to begin',
      ANALYZING_IMAGE: 'Analyzing images', SEARCHING_WEB: 'Searching the web',
      GENERATING_RECIPE: 'Generating the recipe' })[state];
  }

  componentLabel(type: RecipeComponentType): string {
    return ({ MAIN: 'Main', SIDE: 'Side', SAUCE: 'Sauce', DESSERT: 'Dessert', OTHER: 'Other' })[type];
  }

  ngOnDestroy(): void { this.subscription?.unsubscribe(); if (this.statusTimer) clearTimeout(this.statusTimer); }

  private enqueueState(state: DishRecreationState): void {
    if (this.currentState() === state || this.statusQueue.includes(state)) return;
    if (!this.currentState()) { this.showState(state); return; }
    if (!this.statusTimer) { this.showState(state); return; }
    this.statusQueue.push(state);
  }

  private showState(state: DishRecreationDisplayState): void {
    this.currentState.set(state);
    this.statusTimer = setTimeout(() => {
      this.statusTimer = undefined;
      const next = this.statusQueue.shift();
      if (next) { this.showState(next); return; }
      if (this.pendingResult) {
        this.currentState.set(null);
        this.finishWhenStatusesShown();
        return;
      }
      if (state === 'PREPARING_REQUEST') this.currentState.set('WAITING_FOR_ANALYSIS');
    }, 2200);
  }

  private finishWhenStatusesShown(): void {
    if (!this.pendingResult || this.currentState() || this.statusQueue.length) return;
    this.result.set(this.pendingResult); this.pendingResult = undefined; this.isSubmitting.set(false);
  }

  private fail(message: string): void {
    if (this.statusTimer) clearTimeout(this.statusTimer);
    this.statusTimer = undefined; this.statusQueue.length = 0; this.currentState.set(null);
    this.pendingResult = undefined; this.isSubmitting.set(false); this.errorMessage.set(message);
  }

  private resetRun(): void {
    this.subscription?.unsubscribe(); if (this.statusTimer) clearTimeout(this.statusTimer);
    this.statusTimer = undefined; this.statusQueue.length = 0; this.pendingResult = undefined;
    this.currentState.set(null); this.result.set(null); this.errorMessage.set('');
  }

  private setIfPresent(data: FormData, key: string, value: string): void {
    if (value.trim()) data.set(key, value.trim());
  }
}
