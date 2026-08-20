import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  AdminRecipeDiscoveryRequestError,
  AdminRecipeDiscoveryService,
} from '../../core/recipe-discovery/admin-recipe-discovery.service';
import {
  InventoryProduct,
  RecipeDiscoveryResult,
  RecipeDiscoveryState,
} from '../../core/recipe-discovery/recipe-discovery.models';
import { AdminHeaderComponent } from '../../shared/admin-header/admin-header';

const SAMPLE_INVENTORY = JSON.stringify([
  { id: 'product-1', name: 'Poitrine de poulet', quantity: 2, unit: 'unité',
    storageSpace: 'Réfrigérateur', storeDepartment: 'Viandes' },
  { id: 'product-2', name: 'Brocoli', quantity: 1, unit: 'unité',
    storageSpace: 'Réfrigérateur', storeDepartment: 'Fruits et légumes' },
  { id: 'product-3', name: 'Pâtes', quantity: 500, unit: 'g',
    storageSpace: 'Garde-manger', storeDepartment: 'Épicerie' },
], null, 2);

type RecipeDiscoveryDisplayState = RecipeDiscoveryState | 'PREPARING_REQUEST' | 'WAITING_FOR_SEARCH';

@Component({
  selector: 'app-recipe-discovery',
  imports: [AdminHeaderComponent, ReactiveFormsModule],
  templateUrl: './recipe-discovery.html',
  styleUrl: './recipe-discovery.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeDiscoveryComponent implements OnDestroy {
  private readonly service = inject(AdminRecipeDiscoveryService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private subscription?: Subscription;
  private statusTimer?: ReturnType<typeof setTimeout>;
  private readonly statusQueue: RecipeDiscoveryDisplayState[] = [];
  private pendingResult?: RecipeDiscoveryResult;

  readonly form = this.fb.nonNullable.group({
    locale: ['fr-CA', [Validators.required, Validators.maxLength(35)]],
    priorityProductIds: ['product-1, product-2'],
    comment: ['Des pâtes rapides pour 4 personnes', Validators.maxLength(2000)],
    inventory: [SAMPLE_INVENTORY, Validators.required],
  });
  readonly isSubmitting = signal(false);
  readonly currentState = signal<RecipeDiscoveryDisplayState | null>(null);
  readonly result = signal<RecipeDiscoveryResult | null>(null);
  readonly errorMessage = signal('');

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isSubmitting()) return;
    let inventory: InventoryProduct[];
    try {
      const parsed: unknown = JSON.parse(this.form.controls.inventory.value);
      if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 500) {
        throw new Error('Inventory must be a JSON array containing 1 to 500 products.');
      }
      inventory = parsed as InventoryProduct[];
      if (inventory.some((product) => !product || typeof product.id !== 'string'
        || !product.id.trim() || typeof product.name !== 'string' || !product.name.trim())) {
        throw new Error('Every inventory product requires a non-empty id and name.');
      }
    } catch (error: unknown) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Inventory JSON is invalid.');
      return;
    }

    const value = this.form.getRawValue();
    const priorityProductIds = value.priorityProductIds.split(',').map((id) => id.trim()).filter(Boolean);
    if (priorityProductIds.length > 5) {
      this.errorMessage.set('At most five priority product IDs are allowed.'); return;
    }
    this.resetRun();
    this.isSubmitting.set(true);
    this.showState('PREPARING_REQUEST');
    this.subscription = this.service.stream({
      locale: value.locale.trim(), priorityProductIds,
      comment: value.comment.trim() || null, inventory,
    }).subscribe({
      next: (event) => {
        if (event.type === 'progress') this.enqueueState(event.state);
        if (event.type === 'result') {
          this.pendingResult = event.result; this.finishWhenStatusesShown();
        }
        if (event.type === 'error') this.fail(event.message);
      },
      error: (error: unknown) => {
        if (error instanceof AdminRecipeDiscoveryRequestError && (error.status === 401 || error.status === 403)) {
          void this.router.navigate(['/login']); return;
        }
        this.fail(error instanceof Error ? error.message : 'Unable to discover recipes.');
      },
    });
  }

  stateLabel(state: RecipeDiscoveryDisplayState): string {
    return ({
      PREPARING_REQUEST: 'Preparing the inventory request',
      WAITING_FOR_SEARCH: 'Request sent — waiting for recipe search to begin',
      SELECTING_PRODUCTS: 'Selecting the most relevant inventory products',
      SEARCHING_WEB: 'Searching the web for real recipes',
      GENERATING_RESULTS: 'Validating and organizing recipe results',
      RESOLVING_IMAGES: 'Resolving recipe images from source pages',
    })[state];
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    if (this.statusTimer) clearTimeout(this.statusTimer);
  }

  private enqueueState(state: RecipeDiscoveryState): void {
    if (this.currentState() === state || this.statusQueue.includes(state)) return;
    if (!this.currentState()) { this.showState(state); return; }
    if (!this.statusTimer) { this.showState(state); return; }
    this.statusQueue.push(state);
  }

  private showState(state: RecipeDiscoveryDisplayState): void {
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
      if (state === 'PREPARING_REQUEST') this.showState('WAITING_FOR_SEARCH');
    }, 2200);
  }

  private finishWhenStatusesShown(): void {
    if (!this.pendingResult || this.currentState() || this.statusQueue.length) return;
    this.result.set(this.pendingResult); this.pendingResult = undefined; this.isSubmitting.set(false);
  }

  private fail(message: string): void {
    if (this.statusTimer) clearTimeout(this.statusTimer);
    this.statusTimer = undefined; this.statusQueue.length = 0; this.pendingResult = undefined;
    this.currentState.set(null); this.isSubmitting.set(false); this.errorMessage.set(message);
  }

  private resetRun(): void {
    this.subscription?.unsubscribe();
    if (this.statusTimer) clearTimeout(this.statusTimer);
    this.statusTimer = undefined; this.statusQueue.length = 0; this.pendingResult = undefined;
    this.currentState.set(null); this.result.set(null); this.errorMessage.set('');
  }
}
