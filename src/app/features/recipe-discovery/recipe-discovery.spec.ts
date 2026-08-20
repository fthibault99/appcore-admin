import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminRecipeDiscoveryService } from '../../core/recipe-discovery/admin-recipe-discovery.service';
import { RecipeDiscoveryComponent } from './recipe-discovery';

describe('RecipeDiscoveryComponent', () => {
  it('submits parsed inventory and displays streamed results', async () => {
    vi.useFakeTimers();
    const service = { stream: vi.fn(() => of(
      { type: 'progress' as const, state: 'SEARCHING_WEB' as const },
      { type: 'result' as const, result: { recipes: [{
        id: '1', title: 'Pasta', sourceName: 'Site', sourceUrl: 'https://site/recipe',
        imageUrl: 'https://site/image.jpg', language: 'fr', matchedProducts: ['Pâtes'],
      }] } },
    )) };
    await TestBed.configureTestingModule({
      imports: [RecipeDiscoveryComponent],
      providers: [provideRouter([]), { provide: AdminRecipeDiscoveryService, useValue: service }],
    }).compileComponents();
    const fixture = TestBed.createComponent(RecipeDiscoveryComponent);
    fixture.detectChanges();

    fixture.componentInstance.submit();
    await vi.runAllTimersAsync();
    fixture.detectChanges();

    expect(service.stream).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('.recipe-card h3')?.textContent).toContain('Pasta');
    vi.useRealTimers();
  });
});
