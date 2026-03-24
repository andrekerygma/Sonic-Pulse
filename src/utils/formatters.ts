export function formatDuration(totalSeconds: number) {
  const roundedSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(roundedSeconds / 3600);
  const minutes = Math.floor((roundedSeconds % 3600) / 60);
  const seconds = (roundedSeconds % 60).toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds}`;
  }

  return `${minutes}:${seconds}`;
}

export function formatRuntimeMilliseconds(totalMilliseconds: number) {
  return formatDuration(totalMilliseconds / 1000);
}

export function formatTimestamp(date = new Date()) {
  return `HOJE, ${date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export function formatSliderNumber(value: number) {
  if (Number.isInteger(value)) {
    return `${value}`;
  }

  return value.toFixed(2).replace(/0+$/g, '').replace(/\.$/, '');
}
