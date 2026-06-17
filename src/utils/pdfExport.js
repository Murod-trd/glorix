import { jsPDF } from 'jspdf';
import { ROBOTO_REGULAR_BASE64, ROBOTO_BOLD_BASE64 } from './robotoFont';

let fontsRegistered = false;

function registerFonts(doc) {
  if (!fontsRegistered) {
    doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD_BASE64);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
    fontsRegistered = true;
  } else {
    // jsPDF VFS/font registry is per-instance, so re-register on every new doc.
    doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD_BASE64);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
  }
}

// Генерирует и скачивает настоящий текстовый PDF (не растровое изображение) с
// поддержкой кириллицы через встроенный шрифт Roboto. Жирные строки (начинающиеся
// с **текст** или ВСЕ ЗАГЛАВНЫЕ с короткой длиной похожие на заголовки статей)
// выделяются полужирным.
export function downloadTextAsPdf(text, filename = 'document.pdf') {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  registerFonts(doc);
  doc.setFont('Roboto', 'normal');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 50;
  const maxWidth = pageWidth - margin * 2;
  const fontSize = 10.5;
  const lineHeight = fontSize * 1.5;
  doc.setFontSize(fontSize);

  let y = margin;

  const rawLines = text.split('\n');

  function isHeading(line) {
    const trimmed = line.trim();
    if (!trimmed) return false;
    // Заголовки статей/секций: начинаются с "Статья", "СТАТЬЯ", "Ст.", цифры с точкой,
    // или строка целиком в верхнем регистре и короче 70 символов.
    if (/^(Статья|СТАТЬЯ|Преамбула|ПРЕАМБУЛА|ДОГОВОР|ОФЕРТА|ПРЕТЕНЗИЯ)/.test(trimmed)) return true;
    if (/^\d+\.\s*[А-ЯA-Z]/.test(trimmed) && trimmed.length < 90) return true;
    if (trimmed === trimmed.toUpperCase() && /[А-ЯA-Z]/.test(trimmed) && trimmed.length < 70) return true;
    return false;
  }

  function addNewPageIfNeeded() {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();

    if (trimmed === '') {
      y += lineHeight * 0.6;
      addNewPageIfNeeded();
      continue;
    }

    const bold = isHeading(trimmed);
    doc.setFont('Roboto', bold ? 'bold' : 'normal');

    const wrapped = doc.splitTextToSize(rawLine, maxWidth);
    for (const wLine of wrapped) {
      addNewPageIfNeeded();
      doc.text(wLine, margin, y);
      y += lineHeight;
    }

    if (bold) y += lineHeight * 0.25; // небольшой отступ после заголовка
  }

  doc.save(filename);
}
