import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { AdminAuthenticationService } from '../../core/authentication/admin-authentication.service';
import { AdminDishRecreationService } from '../../core/dish-recreation/admin-dish-recreation.service';
import { DishRecreationResult, DishRecreationStreamEvent } from '../../core/dish-recreation/dish-recreation.models';
import { DishRecreationComponent } from './dish-recreation';

describe('DishRecreationComponent', () => {
  let fixture: ComponentFixture<DishRecreationComponent>;
  let component: DishRecreationComponent;
  let events: Subject<DishRecreationStreamEvent>;
  let service: { stream: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.useFakeTimers();
    events = new Subject<DishRecreationStreamEvent>();
    service = { stream: vi.fn(() => events.asObservable()) };
    await TestBed.configureTestingModule({
      imports: [DishRecreationComponent],
      providers: [provideRouter([]),
        { provide: AdminDishRecreationService, useValue: service },
        { provide: AdminAuthenticationService, useValue: { logout: vi.fn() } }],
    }).compileComponents();
    fixture = TestBed.createComponent(DishRecreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  it('requires context in addition to the dish name', () => {
    component.form.controls.dishName.setValue('Poke bowl');
    component.submit();
    expect(service.stream).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain('restaurant');
  });

  it('submits multipart data and displays each state for at least two seconds', () => {
    component.form.patchValue({ dishName: 'Poke bowl', restaurantName: 'Restaurant', language: 'fr' });
    component.submit();
    const form = service.stream.mock.calls[0][0] as FormData;
    expect(form.get('dishName')).toBe('Poke bowl');
    expect(form.get('restaurantName')).toBe('Restaurant');

    events.next({ type: 'progress', state: 'SEARCHING_WEB' });
    events.next({ type: 'progress', state: 'GENERATING_RECIPE' });
    events.next({ type: 'result', result: recreation() });
    expect(component.currentState()).toBe('PREPARING_REQUEST');
    expect(component.result()).toBeNull();

    vi.advanceTimersByTime(2200);
    expect(component.currentState()).toBe('SEARCHING_WEB');
    expect(component.result()).toBeNull();
    vi.advanceTimersByTime(2200);
    expect(component.currentState()).toBe('GENERATING_RECIPE');
    expect(component.result()).toBeNull();
    vi.advanceTimersByTime(2200);
    expect(component.currentState()).toBeNull();
    expect(component.result()?.name).toBe('Complete meal');
    expect(component.result()?.recipes[0].recipe.name).toBe('Poke bowl');
    expect(component.isSubmitting()).toBe(false);
  });

  it('keeps a waiting message visible until the first server progress event arrives', () => {
    component.form.patchValue({ dishName: 'Poke bowl', restaurantName: 'Restaurant', language: 'fr' });
    component.submit();

    expect(component.currentState()).toBe('PREPARING_REQUEST');
    vi.advanceTimersByTime(2200);
    expect(component.currentState()).toBe('WAITING_FOR_ANALYSIS');

    vi.advanceTimersByTime(4000);
    expect(component.currentState()).toBe('WAITING_FOR_ANALYSIS');

    events.next({ type: 'progress', state: 'SEARCHING_WEB' });
    expect(component.currentState()).toBe('SEARCHING_WEB');
  });

  function recreation(): DishRecreationResult {
    return { name: 'Complete meal', recipes: [{ type: 'MAIN', recipe: {
      url: null, name: 'Poke bowl', image: null, author: null, datePublished: null,
      description: 'Inspired recipe', prepTime: null, cookTime: null, totalTime: 'PT30M',
      keywords: null, recipeIngredient: ['Salmon'], recipeInstructions: ['Assemble'], recipeYield: '4 portions' } }] };
  }
});
