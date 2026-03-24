export function createClipId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

export function readAudioDuration(audioUrl: string) {
  return new Promise<number>((resolve) => {
    const probe = new Audio(audioUrl);

    const finalize = (value: number) => {
      probe.removeEventListener('loadedmetadata', onLoadedMetadata);
      probe.removeEventListener('error', onError);
      resolve(value);
    };

    const onLoadedMetadata = () => {
      finalize(Number.isFinite(probe.duration) ? probe.duration : 0);
    };

    const onError = () => {
      finalize(0);
    };

    probe.addEventListener('loadedmetadata', onLoadedMetadata);
    probe.addEventListener('error', onError);
  });
}

export function toEdgeRate(rate: number) {
  const normalized = Math.round((rate - 1) * 100);
  return `${normalized >= 0 ? '+' : ''}${normalized}%`;
}

export function toEdgePitch(pitch: number) {
  const normalized = Math.round(pitch);
  return `${normalized >= 0 ? '+' : ''}${normalized}Hz`;
}
