import { useEffect, useState } from 'react';
import type { MediaSession } from '../../shared/media';

export function useMediaArtwork(session: MediaSession | null) {
  const source = JSON.stringify([session?.id, session?.artworkUrl]);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  useEffect(() => {
    setFailedSource(null);
    setHovered(false);
    setRotation({ x: 0, y: 0 });
  }, [source]);
  useEffect(() => {
    const reset = () => {
      setHovered(false);
      setRotation({ x: 0, y: 0 });
    };
    window.addEventListener('blur', reset);
    return () => window.removeEventListener('blur', reset);
  }, []);
  return {
    url: failedSource === source ? null : session?.artworkUrl,
    onError: () => setFailedSource(source),
    hovered,
    setHovered,
    rotation,
    setRotation,
  };
}
