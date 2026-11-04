import {
  ASSET_ORIGIN,
  assetBaseTag,
  assetUrl,
  resolveAssetHtml,
} from '@/lib/authoring/assets';

describe('authoring asset URLs', () => {
  it('prefixes relative file URLs with the API origin', () => {
    expect(assetUrl('/files/active/authoring/assets/a.png')).toBe(
      `${ASSET_ORIGIN}/files/active/authoring/assets/a.png`,
    );
  });

  it('keeps absolute, data and blob URLs unchanged', () => {
    expect(assetUrl('https://example.com/a.png')).toBe(
      'https://example.com/a.png',
    );
    expect(assetUrl('data:image/png;base64,abc')).toBe(
      'data:image/png;base64,abc',
    );
    expect(assetUrl('blob:http://localhost/abc')).toBe(
      'blob:http://localhost/abc',
    );
  });

  it('resolves local assets inside HTML and CSS', () => {
    const html =
      '<img src="/files/active/authoring/assets/a.png" /><div style="background:url(/files/active/authoring/assets/b.svg)"></div>';
    const resolved = resolveAssetHtml(html);

    expect(resolved).toContain(`${ASSET_ORIGIN}/files/active/authoring/assets/a.png`);
    expect(resolved).toContain(`${ASSET_ORIGIN}/files/active/authoring/assets/b.svg`);
  });

  it('does not rewrite absolute file URLs', () => {
    const html = `<img src="${ASSET_ORIGIN}/files/active/authoring/assets/a.png" />`;
    expect(resolveAssetHtml(html)).toBe(html);
  });

  it('builds a base tag for iframe previews', () => {
    expect(assetBaseTag()).toContain(ASSET_ORIGIN);
  });
});
