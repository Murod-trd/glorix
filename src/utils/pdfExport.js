import { jsPDF } from 'jspdf';
import { PT_SERIF_REGULAR_BASE64, PT_SERIF_BOLD_BASE64 } from './ptSerifFont';
import { ROBOTO_BOLD_BASE64 } from './robotoFont';

// Фирменные цвета платформы (см. src/index.css --navy, --accent).
const NAVY = [10, 15, 30];       // #0A0F1E
const ACCENT = [0, 212, 170];    // #00D4AA
const TEXT_DARK = [26, 26, 26];
const TEXT_GRAY = [110, 118, 130];
const RULE_GRAY = [220, 224, 230];

let fontsRegistered = false;

function registerFonts(doc) {
  doc.addFileToVFS('PTSerif-Regular.ttf', PT_SERIF_REGULAR_BASE64);
  doc.addFont('PTSerif-Regular.ttf', 'PTSerif', 'normal');
  doc.addFileToVFS('PTSerif-Bold.ttf', PT_SERIF_BOLD_BASE64);
  doc.addFont('PTSerif-Bold.ttf', 'PTSerif', 'bold');
  doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD_BASE64);
  doc.addFont('Roboto-Bold.ttf', 'RobotoLogo', 'bold');
  fontsRegistered = true;
}

function drawLogo(doc, x, y) {
  // "GLO" в тёмном цвете + "RIX" акцентным зелёным — повторяет логотип в самом приложении.
  doc.setFont('RobotoLogo', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  doc.text('GLO', x, y, { charSpace: 0.6 });
  const gloWidth = doc.getTextWidth('GLO') + 0.6 * 2; // приблизительная компенсация charSpace
  doc.setTextColor(...ACCENT);
  doc.text('RIX', x + gloWidth, y, { charSpace: 0.6 });
  doc.setTextColor(...TEXT_DARK);
}

function drawHeader(doc, pageWidth, margin, docTitle, docNum) {
  const headerY = 32;
  drawLogo(doc, margin, headerY);

  doc.setFont('PTSerif', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_GRAY);
  doc.text('B2B TRADE PLATFORM', margin, headerY + 11);

  // Справа — номер документа и тип
  doc.setFont('PTSerif', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_DARK);
  doc.text(docTitle, pageWidth - margin, headerY - 2, { align: 'right' });
  if (docNum) {
    doc.setFont('PTSerif', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT_GRAY);
    doc.text(docNum, pageWidth - margin, headerY + 9, { align: 'right' });
  }

  // Тонкая акцентная линия под шапкой
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(1.2);
  doc.line(margin, headerY + 18, pageWidth - margin, headerY + 18);
  doc.setDrawColor(...RULE_GRAY);
  doc.setLineWidth(0.4);

  return headerY + 18; // y-координата, где начинается основной контент
}

function drawFooter(doc, pageWidth, pageHeight, margin, pageNum, totalPages) {
  const footerY = pageHeight - 24;
  doc.setDrawColor(...RULE_GRAY);
  doc.setLineWidth(0.4);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('PTSerif', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_GRAY);
  doc.text('GLORIX — B2B Trade Platform · Документ сформирован автоматически, требует подписи сторон', margin, footerY + 9);
  doc.text(`${pageNum} / ${totalPages}`, pageWidth - margin, footerY + 9, { align: 'right' });
}

// Извлекает заголовок документа (первая непустая строка) и номер (вторая строка
// или строка с "№") для отображения в шапке каждой страницы.
function extractTitleAndNum(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const title = lines[0] || 'GLORIX Документ';
  // Заголовок часто уже содержит "№ XXX" сам по себе — в этом случае отдельный
  // номер документа не нужен, чтобы не дублировать строку в шапке.
  if (title.includes('№')) return { title, num: '' };
  const numLine = lines.slice(1).find(l => l.includes('№'));
  return { title, num: numLine || '' };
}

function isHeading(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^[—\-•]/.test(trimmed)) return false; // пункты списка, даже если в верхнем регистре, не заголовки
  if (/^(Статья|СТАТЬЯ|Преамбула|ПРЕАМБУЛА|ДОГОВОР|ОФЕРТА|ПРЕТЕНЗИЯ|§)/.test(trimmed)) return true;
  if (/^\d+\.\s*[А-ЯA-Z]/.test(trimmed) && trimmed.length < 90) return true;
  if (trimmed === trimmed.toUpperCase() && /[А-ЯA-Z]/.test(trimmed) && trimmed.length < 70) return true;
  return false;
}

function isDivider(line) {
  // Строки-разделители из исходных шаблонов (длинные ряды ═ или ─ символов) —
  // заменяются на тонкое графическое правило вместо текстовых символов.
  const trimmed = line.trim();
  return trimmed.length > 10 && /^[═─_]+$/.test(trimmed);
}

export function downloadTextAsPdf(text, filename = 'document.pdf') {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  if (!fontsRegistered) registerFonts(doc); else registerFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 50;
  const maxWidth = pageWidth - margin * 2;
  const fontSize = 10.5;
  const lineHeight = fontSize * 1.55;

  const { title, num } = extractTitleAndNum(text);

  let pageContentTop = 0; // вычисляется после первой шапки
  let y = 0;
  let pageNum = 1;

  function startPage() {
    pageContentTop = drawHeader(doc, pageWidth, margin, title, num);
    y = pageContentTop + 26;
    doc.setFont('PTSerif', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(...TEXT_DARK);
  }

  function newPage() {
    doc.addPage();
    pageNum += 1;
    startPage();
  }

  function ensureSpace() {
    if (y > pageHeight - margin - 24) {
      newPage();
    }
  }

  startPage();

  const rawLines = text.split('\n');
  let skippedFirstTitleBlock = false;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();

    if (isDivider(trimmed)) {
      ensureSpace();
      doc.setDrawColor(...RULE_GRAY);
      doc.setLineWidth(0.6);
      doc.line(margin, y - lineHeight * 0.3, pageWidth - margin, y - lineHeight * 0.3);
      y += lineHeight * 0.4;
      continue;
    }

    if (trimmed === '') {
      y += lineHeight * 0.55;
      ensureSpace();
      continue;
    }

    const bold = isHeading(trimmed);
    doc.setFont('PTSerif', bold ? 'bold' : 'normal');
    if (bold) doc.setTextColor(...NAVY); else doc.setTextColor(...TEXT_DARK);

    const wrapped = doc.splitTextToSize(rawLine, maxWidth);
    for (const wLine of wrapped) {
      ensureSpace();
      doc.text(wLine, margin, y);
      y += lineHeight;
    }

    if (bold) y += lineHeight * 0.3;
  }

  const totalPages = pageNum;
  // Второй проход — расставляем номера страниц "X / N" (N узнаём только после рендера всех страниц).
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, pageWidth, pageHeight, margin, p, totalPages);
  }

  doc.save(filename);
}
