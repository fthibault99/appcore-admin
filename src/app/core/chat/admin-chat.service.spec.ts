import { parseAdminChatSseFrame } from './admin-chat.service';

describe('parseAdminChatSseFrame', () => {
  it('parses delta and completed events', () => {
    expect(parseAdminChatSseFrame('event: delta\ndata: {"text":"Hello"}')).toEqual({
      type: 'delta',
      text: 'Hello',
    });
    expect(parseAdminChatSseFrame(
      'event: completed\ndata: {"answer":"Hello","model":"gpt-5.6-luna","usage":{"inputTokens":2,"outputTokens":1,"totalTokens":3}}',
    )).toEqual({
      type: 'completed',
      response: {
        answer: 'Hello',
        model: 'gpt-5.6-luna',
        usage: { inputTokens: 2, outputTokens: 1, totalTokens: 3 },
      },
    });
  });

  it('ignores unsupported events', () => {
    expect(parseAdminChatSseFrame('event: ping\ndata: {}')).toBeNull();
  });
});
