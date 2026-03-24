export function buildApiCandidates(endpoint: string) {
  const normalizedPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const candidates = new Set<string>([normalizedPath]);

  if (typeof window === 'undefined' || window.location.protocol !== 'http:') {
    return Array.from(candidates);
  }

  const { hostname, protocol, port } = window.location;

  if (hostname && port !== '3001') {
    candidates.add(`${protocol}//${hostname}:3001${normalizedPath}`);
  }

  if (hostname !== '127.0.0.1') {
    candidates.add(`http://127.0.0.1:3001${normalizedPath}`);
  }

  if (hostname !== 'localhost') {
    candidates.add(`http://localhost:3001${normalizedPath}`);
  }

  return Array.from(candidates);
}

export async function fetchApi(endpoint: string, init?: RequestInit) {
  let lastError: unknown = null;

  for (const candidate of buildApiCandidates(endpoint)) {
    try {
      return await fetch(candidate, init);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Não foi possível conectar à API local do Sonic Pulse.');
}

export function getErrorMessage(error: unknown, fallback = 'Algo deu errado ao gerar o áudio.') {
  if (error instanceof TypeError && /failed to fetch|networkerror/i.test(error.message)) {
    return 'Não foi possível alcançar a API local do Sonic Pulse. Verifique se o app está rodando e tente novamente.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
