import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  BorderStyle, Header, Footer, PageNumber, NumberFormat,
} from 'docx';

// Фирменные цвета платформы (см. src/index.css --navy, --accent), в hex без '#'
// (формат, который требует библиотека docx).
const NAVY_HEX = '0A0F1E';
const ACCENT_HEX = '00D4AA';
const TEXT_GRAY_HEX = '6E7682';
const RULE_GRAY_HEX = 'DCE0E6';

function isHeading(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^[—\-•]/.test(trimmed)) return false;
  if (/^(Статья|СТАТЬЯ|Преамбула|ПРЕАМБУЛА|ДОГОВОР|ОФЕРТА|ПРЕТЕНЗИЯ|§)/.test(trimmed)) return true;
  if (/^\d+\.\s*[А-ЯA-Z]/.test(trimmed) && trimmed.length < 90) return true;
  if (trimmed === trimmed.toUpperCase() && /[А-ЯA-Z]/.test(trimmed) && trimmed.length < 70) return true;
  return false;
}

function isDivider(line) {
  const trimmed = line.trim();
  return trimmed.length > 10 && /^[═─_]+$/.test(trimmed);
}

function extractTitleAndNum(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const title = lines[0] || 'GLORIX Документ';
  if (title.includes('№')) return { title, num: '' };
  const numLine = lines.slice(1).find(l => l.includes('№'));
  return { title, num: numLine || '' };
}

function buildHeader(title) {
  return new Header({
    children: [
      new Paragraph({
        tabStops: [{ type: 'right', position: 9000 }],
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT_HEX, space: 4 },
        },
        children: [
          new TextRun({ text: 'GLO', bold: true, size: 24, color: NAVY_HEX, font: 'Arial' }),
          new TextRun({ text: 'RIX', bold: true, size: 24, color: ACCENT_HEX, font: 'Arial' }),
          new TextRun({ text: '\t' + title, bold: true, size: 18, color: NAVY_HEX, font: 'Times New Roman' }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'B2B TRADE PLATFORM', size: 14, color: TEXT_GRAY_HEX, font: 'Arial' }),
        ],
      }),
    ],
  });
}

function buildFooter() {
  return new Footer({
    children: [
      new Paragraph({
        border: {
          top: { style: BorderStyle.SINGLE, size: 4, color: RULE_GRAY_HEX, space: 4 },
        },
        tabStops: [{ type: 'right', position: 9000 }],
        children: [
          new TextRun({
            text: 'GLORIX — B2B Trade Platform · Документ сформирован автоматически, требует подписи сторон\t',
            size: 14, color: TEXT_GRAY_HEX, font: 'Times New Roman',
          }),
          new TextRun({ children: [PageNumber.CURRENT], size: 14, color: TEXT_GRAY_HEX, font: 'Times New Roman' }),
          new TextRun({ text: ' / ', size: 14, color: TEXT_GRAY_HEX, font: 'Times New Roman' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: TEXT_GRAY_HEX, font: 'Times New Roman' }),
        ],
      }),
    ],
  });
}

export async function downloadTextAsDocx(text, filename = 'document.docx') {
  const { title } = extractTitleAndNum(text);
  const rawLines = text.split('\n');
  const paragraphs = [];

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();

    if (isDivider(trimmed)) {
      paragraphs.push(new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE_GRAY_HEX, space: 1 } },
        spacing: { after: 120 },
      }));
      continue;
    }

    if (trimmed === '') {
      paragraphs.push(new Paragraph({ text: '', spacing: { after: 80 } }));
      continue;
    }

    const bold = isHeading(trimmed);
    paragraphs.push(new Paragraph({
      spacing: { after: bold ? 160 : 80 },
      children: [
        new TextRun({
          text: rawLine,
          bold,
          color: bold ? NAVY_HEX : '1A1A1A',
          font: 'Times New Roman',
          size: 22, // 11pt (docx использует half-points)
        }),
      ],
    }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1100, bottom: 1100, left: 1000, right: 1000 }, // ~1.94/1.94/1.76/1.76 см в twips
          },
        },
        headers: { default: buildHeader(title) },
        footers: { default: buildFooter() },
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
