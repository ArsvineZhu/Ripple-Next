import { nativeImage } from 'electron';
import { runCommand } from '../../services/processes';

// Arguments carry identity; metadata is never executable code. osascript preserves raw
// artwork as a hex Apple event descriptor, so no shared temporary cover file is needed.
const script = `on run argv
  if not running of application "Music" then return
  set expectedName to item 1 of argv
  set expectedArtist to item 2 of argv
  set expectedAlbum to item 3 of argv
  set expectedID to item 4 of argv
  tell application "Music"
    set trackReference to current track
    if name of trackReference is not expectedName or artist of trackReference is not expectedArtist or album of trackReference is not expectedAlbum then return
    if expectedID is not "" and persistent ID of trackReference is not expectedID then return
    if (count of artworks of trackReference) is 0 then return
    set imageBytes to raw data of artwork 1 of trackReference
    if current track is not trackReference then return
    return imageBytes
  end tell
end run`;

export async function readMusicArtwork(
  track: { name: string; artist: string; album: string; trackId: string },
  signal: AbortSignal,
): Promise<string | null> {
  const output = await runCommand(
    '/usr/bin/osascript',
    ['-e', script, track.name, track.artist, track.album, track.trackId],
    { signal, maxBuffer: 12 * 1024 * 1024 },
  );
  const descriptor = /^«data [\s\S]{4}([\da-f]+)»$/i.exec(output.trim());
  if (!descriptor || descriptor[1].length % 2 || descriptor[1].length > 10 * 1024 * 1024)
    return null;
  const image = nativeImage.createFromBuffer(Buffer.from(descriptor[1], 'hex'));
  if (image.isEmpty()) return null;
  const { width, height } = image.getSize();
  // Cache one bounded PNG, independent of the source's native image format/resolution.
  const thumbnail =
    Math.max(width, height) > 512
      ? image.resize(width >= height ? { width: 512 } : { height: 512 })
      : image;
  return thumbnail.toDataURL();
}
