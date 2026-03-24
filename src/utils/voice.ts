import type { VoicePersona } from '../types';

export function extractLocaleFromCode(code: string) {
  const parts = code.split('-');
  return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : code;
}

export function extractNameFromCode(code: string) {
  return code
    .split('-')
    .slice(2)
    .join('-')
    .replace(/Neural$/i, '')
    .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
    .replace(/([0-9])([A-Za-z])/g, '$1 $2')
    .trim() || code;
}

export function localeToFlag(locale: string) {
  const region = locale.split('-')[1];

  if (!region || !/^[A-Za-z]{2}$/.test(region)) {
    return '🌐';
  }

  return region
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
}

export function translateGender(gender: string) {
  const normalized = gender.toLowerCase();

  if (normalized === 'male') {
    return 'Masculina';
  }

  if (normalized === 'female') {
    return 'Feminina';
  }

  return gender || 'Não informado';
}

export function normalizeVoice(voice: Partial<VoicePersona> & { code: string }, index: number): VoicePersona {
  const locale = voice.locale || extractLocaleFromCode(voice.code);

  return {
    id: voice.id || `voice-${index}-${voice.code}`,
    name: voice.name || extractNameFromCode(voice.code),
    code: voice.code,
    flag: voice.flag || localeToFlag(locale),
    type: voice.type || (voice.code.endsWith('Neural') ? 'Neural' : 'Padrão'),
    locale,
    gender: voice.gender || '',
  };
}

export function buildVoiceDetails(voice: VoicePersona) {
  return [voice.locale, translateGender(voice.gender), voice.type]
    .filter(Boolean)
    .join(' · ');
}
