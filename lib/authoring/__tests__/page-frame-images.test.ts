import {
  fullPageFrameToHtml,
  pageFrameAreaToHtml,
} from '@/lib/authoring/page-frame';
import type { PageFrame, PageFrameArea } from '@/lib/types/authoring';

const imageArea: PageFrameArea = {
  boxes: [
    {
      id: 'asset-image',
      type: 'image',
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      fontSize: 0,
      content: '/files/active/authoring/assets/a.png',
      fit: 'cover',
      objectPosition: 'top',
    },
  ],
};

describe('page frame image rendering', () => {
  it('renders image fit and position in header/footer areas', () => {
    const html = pageFrameAreaToHtml(imageArea);

    expect(html).toContain('src="/files/active/authoring/assets/a.png"');
    expect(html).toContain('object-fit:cover');
    expect(html).toContain('object-position:top');
  });

  it('renders image boxes in full-page previews', () => {
    const frame: PageFrame = {
      version: 1,
      mode: 'fullPage',
      pageSize: 'A4',
      orientation: 'portrait',
      margins: { top: '0', bottom: '0', left: '0', right: '0' },
      header: { boxes: [] },
      footer: { boxes: [] },
      body: imageArea,
    };

    const html = fullPageFrameToHtml(frame);

    expect(html).toContain('<img src="/files/active/authoring/assets/a.png"');
    expect(html).toContain('object-fit:cover');
    expect(html).toContain('object-position:top');
  });
});
