export function parseCookies(header: string): Record<string, string> {
  return header.split(';').reduce<Record<string, string>>((cookies, pair) => {
    const [name, ...valueParts] = pair.split('=');
    const key = name?.trim();
    if (!key) return cookies;
    const value = valueParts.join('=').trim();
    cookies[decodeURIComponent(key)] = decodeURIComponent(value || '');
    return cookies;
  }, {});
}

export function serializeCookie(name: string, value: string, options: Record<string, any> = {}): string {
  const encodedName = encodeURIComponent(name);
  const encodedValue = encodeURIComponent(value);
  const segments = [`${encodedName}=${encodedValue}`];

  if (options.maxAge !== undefined && options.maxAge !== null) {
    segments.push(`Max-Age=${Number(options.maxAge)}`);
  }
  if (options.domain) {
    segments.push(`Domain=${options.domain}`);
  }
  if (options.path) {
    segments.push(`Path=${options.path}`);
  }
  if (options.sameSite) {
    segments.push(`SameSite=${String(options.sameSite)}`);
  }
  if (options.httpOnly) {
    segments.push('HttpOnly');
  }
  if (options.secure) {
    segments.push('Secure');
  }

  return segments.join('; ');
}

