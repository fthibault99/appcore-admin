export type DishRecreationState = 'ANALYZING_IMAGE' | 'SEARCHING_WEB' | 'GENERATING_RECIPE';

export interface RecipeDto {
  url: string | null;
  name: string | null;
  image: string[] | null;
  author: string | null;
  datePublished: string | null;
  description: string | null;
  prepTime: string | null;
  cookTime: string | null;
  totalTime: string | null;
  keywords: string | null;
  recipeIngredient: string[];
  recipeInstructions: string[];
  recipeYield: string | null;
}

export type RecipeComponentType = 'MAIN' | 'SIDE' | 'SAUCE' | 'DESSERT' | 'OTHER';

export interface GeneratedRecipeComponent {
  type: RecipeComponentType;
  recipe: RecipeDto;
}

export interface DishRecreationResult {
  name: string;
  recipes: GeneratedRecipeComponent[];
}

export type DishRecreationStreamEvent =
  | { type: 'progress'; state: DishRecreationState }
  | { type: 'result'; result: DishRecreationResult }
  | { type: 'error'; code: string; message: string };
