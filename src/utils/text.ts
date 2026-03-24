export function polishScriptLocally(script: string) {
  const normalized = script
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+([,.;:!?])/g, '$1')
    .replace(/([,.;:!?])([^\s"')\]}>\n])/g, '$1 $2')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  return normalized.replace(
    /(^|[\n.!?]\s+)([a-zà-ÿ])/giu,
    (_match, prefix, letter) => `${prefix}${letter.toUpperCase()}`,
  );
}

export function buildClipTitle(script: string) {
  const normalized = script.replace(/\s+/g, ' ').trim();

  if (normalized.length <= 40) {
    return normalized;
  }

  return `${normalized.slice(0, 40)}...`;
}

export function buildDownloadName(title: string) {
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return `${slug || 'audio-sonic-pulse'}.mp3`;
}
