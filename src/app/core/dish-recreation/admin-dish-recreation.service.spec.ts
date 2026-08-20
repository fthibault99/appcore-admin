import { parseDishRecreationSseFrame } from './admin-dish-recreation.service';

describe('parseDishRecreationSseFrame', () => {
  it('parses progress, result, and error events', () => {
    expect(parseDishRecreationSseFrame('event: progress\ndata: {"state":"SEARCHING_WEB"}'))
      .toEqual({ type: 'progress', state: 'SEARCHING_WEB' });
    expect(parseDishRecreationSseFrame(
      'event: result\ndata: {"name":"Complete Dish","recipes":[{"type":"MAIN","recipe":{"url":null,"name":"Dish","image":null,"author":null,"datePublished":null,"description":null,"prepTime":null,"cookTime":null,"totalTime":null,"keywords":null,"recipeIngredient":["one"],"recipeInstructions":["two"],"recipeYield":null}}]}',
    )?.type).toBe('result');
    expect(parseDishRecreationSseFrame(
      'event: error\ndata: {"code":"DISH_RECREATION_FAILED","message":"Unable"}',
    )).toEqual({ type: 'error', code: 'DISH_RECREATION_FAILED', message: 'Unable' });
  });

  it('ignores unsupported events', () => {
    expect(parseDishRecreationSseFrame('event: ping\ndata: {}')).toBeNull();
  });
});
