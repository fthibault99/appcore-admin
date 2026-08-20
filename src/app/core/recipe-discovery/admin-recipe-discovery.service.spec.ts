import { parseRecipeDiscoverySseFrame } from './admin-recipe-discovery.service';

describe('parseRecipeDiscoverySseFrame', () => {
  it('parses progress, result, and error events', () => {
    expect(parseRecipeDiscoverySseFrame('event: progress\ndata: {"state":"SEARCHING_WEB"}'))
      .toEqual({ type: 'progress', state: 'SEARCHING_WEB' });
    expect(parseRecipeDiscoverySseFrame(
      'event: result\ndata: {"recipes":[{"id":"1","title":"Pasta","sourceName":"Site","sourceUrl":"https://site/recipe","imageUrl":"https://site/image.jpg","language":"fr","matchedProducts":["Pasta"]}]}',
    )?.type).toBe('result');
    expect(parseRecipeDiscoverySseFrame(
      'event: error\ndata: {"code":"RECIPE_DISCOVERY_FAILED","message":"Unable"}',
    )).toEqual({ type: 'error', code: 'RECIPE_DISCOVERY_FAILED', message: 'Unable' });
  });
});
