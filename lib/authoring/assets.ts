const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export const ASSET_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export function assetUrl(url?: string | null): string {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith('/files/')) {
    return `${ASSET_ORIGIN}${url}`;
  }
  return url;
}

export function resolveAssetHtml(html?: string | null): string {
  if (!html) return '';
  return html
    .replace(
      /((?:src|href)=["'])(\/files\/[^"']+)(["'])/g,
      (_match, prefix: string, url: string, suffix: string) =>
        `${prefix}${assetUrl(url)}${suffix}`,
    )
    .replace(
      /url\((['"]?)(\/files\/[^)'"]+)\1\)/g,
      (_match, quote: string, url: string) =>
        `url(${quote}${assetUrl(url)}${quote})`,
    );
}

export function assetBaseTag(): string {
  return `<base href="${ASSET_ORIGIN}/" />`;
}
