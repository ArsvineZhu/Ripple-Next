import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLrc } from '../../../modules/media-signals/lyrics/providers/local-lrc/index.mjs';
import { fromMpris } from '../../../modules/media-signals/lyrics/providers/mpris/index.mjs';
import { fetchNetease } from '../../../modules/media-signals/lyrics/providers/netease/index.mjs';
import { supports } from '../../../modules/media-signals/lyrics/providers/folia/index.mjs';
import { lyricAt } from '../../../modules/media-signals/lyrics/timeline.mjs';

test('generic LRC supports repeated timestamps, CRLF, Unicode and explicit advance offset without invented word timing', () => {
  const doc = parseLrc(
    '\uFEFF[ti:Original fixture]\r\n[ar:Local test]\r\n[offset:250]\r\n[00:01.00][00:03.00]原创第一行\r\n[00:02.125]Second 🧪 line\r\n[00:04.00]\r\n',
    { duration: 5 },
  );
  assert.equal(doc.kind, 'line-timed');
  assert.deepEqual(
    doc.lines.map((l) => l.start),
    [1, 2.125, 3, 4],
  );
  assert.equal(lyricAt(doc, 0.75).index, 0);
  assert.ok(doc.lines.every((l) => l.words.length === 0));
  assert.equal(doc.lines[3].text, '');
});
test('untimed player metadata is usable without Folia and remains untimed', () => {
  const doc = fromMpris({
    identity: 'Spotify',
    inlineLyrics: 'Original text\n原创文字',
    anchor: {},
  });
  assert.equal(supports({ identity: 'Spotify' }), false);
  assert.equal(doc.kind, 'plain');
  assert.equal(doc.source.provider, 'mpris-text');
  assert.equal(doc.text, 'Original text\n原创文字');
  assert.equal(lyricAt(doc, 30), null);
});
test('NetEase is explicit-ID only, preserves source and merges a matching translation', async () => {
  let calls = 0;
  const fetchImpl = async (url) => {
    calls++;
    assert.equal(url.hostname, 'music.163.com');
    assert.equal(url.searchParams.get('id'), '42');
    return new Response(
      JSON.stringify({
        code: 200,
        lrc: { lyric: '[00:01]Original fixture' },
        tlyric: { lyric: '[00:01]原创翻译' },
      }),
    );
  };
  await assert.rejects(fetchNetease('not an id', { fetchImpl }));
  assert.equal(calls, 0);
  const doc = await fetchNetease('42', { fetchImpl });
  assert.equal(doc.lines[0].translation, '原创翻译');
  assert.equal(doc.source.provider, 'netease');
  assert.equal(doc.source.association, 'manual-song-id');
  assert.equal(
    await fetchNetease('42', {
      fetchImpl: async () => new Response(JSON.stringify({ code: 200, nolyric: true })),
    }),
    null,
  );
});
