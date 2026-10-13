import { expect, it, vi } from 'vitest';
import { streamCompatibleChat } from '../src/main/services/compatibleChat';
import { defaultCustomization } from '../src/shared/aiConfiguration';
import type { AIProtocol } from '../src/shared/aiConfiguration';

function stream(events: unknown[]) {
  const body = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
  return new Response(
    new ReadableStream({
      start(controller) {
        const bytes = new TextEncoder().encode(body);
        for (let offset = 0; offset < bytes.length; offset += 23)
          controller.enqueue(bytes.slice(offset, offset + 23));
        controller.close();
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream' } },
  );
}
const fixtures: Record<AIProtocol, unknown[]> = {
  completion: [
    { choices: [{ index: 0, delta: { content: 'OK' } }] },
    { choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] },
  ],
  responses: [
    {
      type: 'response.created',
      response: { id: 'resp_fixture', created_at: 0, model: 'fixture-model' },
    },
    {
      type: 'response.output_item.added',
      output_index: 0,
      item: { type: 'message', id: 'msg_fixture', role: 'assistant', content: [] },
    },
    { type: 'response.output_text.delta', item_id: 'msg_fixture', output_index: 0, delta: 'OK' },
    {
      type: 'response.output_item.done',
      output_index: 0,
      item: {
        type: 'message',
        id: 'msg_fixture',
        role: 'assistant',
        content: [{ type: 'output_text', text: 'OK', annotations: [] }],
      },
    },
    {
      type: 'response.completed',
      response: {
        incomplete_details: null,
        usage: { input_tokens: 5, output_tokens: 1, total_tokens: 6 },
      },
    },
  ],
  anthropic: [
    {
      type: 'message_start',
      message: {
        id: 'msg_fixture',
        model: 'fixture-model',
        role: 'assistant',
        usage: { input_tokens: 5, output_tokens: 0 },
      },
    },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'OK' } },
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 1 } },
    { type: 'message_stop' },
  ],
};
it.each(['completion', 'responses', 'anthropic'] as const)(
  'streams %s with its correct endpoint, credential and customization',
  async (protocol) => {
    let body: Record<string, unknown> = {};
    const fetchImpl = vi.fn(async (url, options) => {
      expect(String(url)).toBe(
        `https://fixture.test/v1/${protocol === 'completion' ? 'chat/completions' : protocol === 'responses' ? 'responses' : 'messages'}`,
      );
      const headers = new Headers(options?.headers);
      expect(
        protocol === 'anthropic' ? headers.get('x-api-key') : headers.get('Authorization'),
      ).toBe(protocol === 'anthropic' ? 'fixture-key' : 'Bearer fixture-key');
      body = JSON.parse(String(options?.body));
      return stream(fixtures[protocol]);
    }) as typeof fetch;
    const customization = {
      ...defaultCustomization(),
      systemPrompt: 'Custom {{product}}',
      temperature: 0.3,
      maxOutputTokens: 2048,
      injections: [
        { id: 'first', name: 'First', enabled: true, text: 'First {{version}}' },
        { id: 'hidden', name: 'Hidden', enabled: false, text: 'HIDDEN' },
        { id: 'last', name: 'Last', enabled: true, text: 'Last {{timezone}}' },
      ],
    };
    const onDelta = vi.fn();
    expect(
      await streamCompatibleChat(
        {
          protocol,
          baseUrl: 'https://fixture.test/v1/',
          apiKey: 'fixture-key',
          model: 'fixture-model',
          prompt: 'Question',
          version: '4.0.0',
          timezone: 'UTC',
          current_time: '2026-10-13 12:00:00',
          customization,
        },
        { fetchImpl, onDelta },
      ),
    ).toBe('OK');
    expect(onDelta.mock.calls.map(([text]) => text).join('')).toBe('OK');
    const text = JSON.stringify(body);
    expect(text).toContain('Custom Ripple Next');
    expect(text.indexOf('First 4.0.0')).toBeLessThan(text.indexOf('Last UTC'));
    expect(text).not.toContain('HIDDEN');
    expect(body.model).toBe('fixture-model');
    expect(body.temperature).toBe(0.3);
    if (protocol === 'responses') {
      expect(body.store).toBe(false);
      expect(body.max_output_tokens).toBe(2048);
    } else expect(body.max_tokens).toBe(2048);
  },
);
it('enforces configured context limits before any network request', async () => {
  const fetchImpl = vi.fn();
  await expect(
    streamCompatibleChat(
      {
        protocol: 'responses',
        baseUrl: 'https://fixture.test/v1',
        apiKey: 'fixture',
        model: 'fixture',
        prompt: 'x'.repeat(101),
        version: '4.0.0',
        customization: { ...defaultCustomization(), systemPrompt: '', contextLimitCharacters: 100 },
      },
      { fetchImpl, onDelta: vi.fn() },
    ),
  ).rejects.toThrow('context limit');
  expect(fetchImpl).not.toHaveBeenCalled();
});
