#!/usr/bin/env python3
"""
parse_pdf_explanations.py — GLORIX
Конвертер официальных Пояснений к ТН ВЭД ЕАЭС (PDF → SQLite)

Использование:
  1. Поместите PDF-файлы глав в папку docs/explanations/
     Формат имён файлов (любой из поддерживаемых):
       chapter_01.pdf, chapter_1.pdf, 01.pdf, glave_01.pdf, section01.pdf
       Глава 1.pdf, глава_01.pdf — также распознаются
  2. Запустите из корня проекта:
       python parse_pdf_explanations.py
  3. Скрипт обновит public/tnved_complete.db:
       - добавит колонку `explanation` (TEXT) если её нет
       - впишет текст разъяснения к каждой главе
       - обновит tnved_db.json для офлайн-поиска в браузере
"""

import os, re, json, sqlite3, sys

try:
    import pdfplumber
except ImportError:
    print("Установка pdfplumber...")
    os.system(f"{sys.executable} -m pip install pdfplumber --break-system-packages -q")
    import pdfplumber

# ── Пути ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PDF_DIR      = os.path.join(SCRIPT_DIR, 'docs', 'explanations')
DB_PATH      = os.path.join(SCRIPT_DIR, 'public', 'tnved_complete.db')
JSON_PATH    = os.path.join(SCRIPT_DIR, 'public', 'tnved_db.json')

# ── Определение номера главы из имени файла ───────────────────────────────────
def detect_chapter(filename):
    """Извлекает номер главы (1–97) из имени PDF-файла."""
    stem = os.path.splitext(filename)[0]
    # Ищем 1–2 цифры в имени файла
    m = re.search(r'(?<!\d)(\d{1,2})(?!\d)', stem)
    if m:
        ch = int(m.group(1))
        if 1 <= ch <= 97:
            return ch
    return None

# ── Извлечение текста из PDF ──────────────────────────────────────────────────
def extract_pdf_text(path):
    """Извлекает и очищает текст из PDF через pdfplumber."""
    pages_text = []
    try:
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    pages_text.append(t)
    except Exception as e:
        print(f"  ⚠ Ошибка чтения {os.path.basename(path)}: {e}")
        return ''

    raw = '\n'.join(pages_text)

    # Очистка текста
    raw = re.sub(r'\f',            '\n', raw)           # form feed
    raw = re.sub(r'[ \t]{2,}',    ' ',  raw)           # множественные пробелы
    raw = re.sub(r'\n{3,}',        '\n\n', raw)        # пустые строки
    raw = re.sub(r'^\s*(стр\.|стр|page|страниц).{0,20}$', '', raw,
                 flags=re.MULTILINE | re.IGNORECASE)    # колонтитулы страниц
    return raw.strip()

# ── Основная логика ───────────────────────────────────────────────────────────
def main():
    if not os.path.isdir(PDF_DIR):
        print(f"Папка {PDF_DIR} не найдена. Создайте её и поместите туда PDF-файлы.")
        sys.exit(1)

    if not os.path.isfile(DB_PATH):
        print(f"База данных {DB_PATH} не найдена. Запустите сначала import_tws_base.py")
        sys.exit(1)

    # Собираем PDF-файлы
    pdf_files = sorted(
        f for f in os.listdir(PDF_DIR)
        if f.lower().endswith('.pdf')
    )
    if not pdf_files:
        print(f"В папке {PDF_DIR} нет PDF-файлов.")
        sys.exit(0)

    print(f"Найдено PDF-файлов: {len(pdf_files)}")

    # Открываем БД
    conn = sqlite3.connect(DB_PATH)
    cur  = conn.cursor()

    # Добавляем колонку explanation (если нет)
    cols = [r[1] for r in cur.execute("PRAGMA table_info(tnved)").fetchall()]
    if 'explanation' not in cols:
        cur.execute("ALTER TABLE tnved ADD COLUMN explanation TEXT")
        print("Добавлена колонка explanation в таблицу tnved")

    # Добавляем отдельную таблицу для полных текстов по главам
    cur.execute('''
        CREATE TABLE IF NOT EXISTS chapters (
            chapter     INTEGER PRIMARY KEY,
            explanation TEXT NOT NULL,
            source_file TEXT
        )
    ''')

    stats = {'ok': 0, 'skip': 0, 'err': 0}

    for fname in pdf_files:
        chapter = detect_chapter(fname)
        if chapter is None:
            print(f"  ? Не удалось определить главу для: {fname} — пропускаем")
            stats['skip'] += 1
            continue

        fpath = os.path.join(PDF_DIR, fname)
        print(f"  Глава {chapter:02d}: {fname} ...", end='', flush=True)

        text = extract_pdf_text(fpath)
        if not text:
            print(" пусто")
            stats['err'] += 1
            continue

        # Сохраняем полный текст главы в таблицу chapters
        cur.execute('''
            INSERT OR REPLACE INTO chapters (chapter, explanation, source_file)
            VALUES (?, ?, ?)
        ''', (chapter, text, fname))

        # Обновляем поле explanation для всех кодов данной главы (первые 2 цифры)
        chapter_prefix = f'{chapter:02d}'
        # Краткая выжимка (первые 2 000 символов) — для inline в таблицу tnved
        snippet = text[:2000]
        cur.execute('''
            UPDATE tnved SET explanation = ?
            WHERE code LIKE ?
        ''', (snippet, chapter_prefix + '%'))

        affected = conn.execute(
            "SELECT changes()"
        ).fetchone()[0]
        print(f" {len(text):,} символов → {affected} кодов обновлено ✓")
        stats['ok'] += 1

    conn.commit()

    # Проверка
    total_with_exp = cur.execute(
        "SELECT COUNT(*) FROM tnved WHERE explanation IS NOT NULL"
    ).fetchone()[0]
    chapters_loaded = cur.execute(
        "SELECT COUNT(*) FROM chapters"
    ).fetchone()[0]
    conn.close()

    print(f"\n{'─'*60}")
    print(f"Глав обработано: {stats['ok']} | Пропущено: {stats['skip']} | Ошибок: {stats['err']}")
    print(f"Кодов с разъяснением: {total_with_exp:,}")
    print(f"Глав в таблице chapters: {chapters_loaded}")

    # Обновляем JSON для браузера (добавляем краткое пояснение)
    if total_with_exp > 0:
        print("\nОбновляем tnved_db.json...", end='', flush=True)
        conn2 = sqlite3.connect(DB_PATH)
        rows = conn2.execute(
            "SELECT code, desc, explanation FROM tnved ORDER BY code"
        ).fetchall()
        conn2.close()

        # Формат: [code, desc, explanation_snippet_or_null]
        data = [
            [r[0], r[1], r[2][:500] if r[2] else None]
            for r in rows
        ]
        with open(JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        print(f" {os.path.getsize(JSON_PATH)//1024} KB")

    print("\nГотово! База обновлена.")

if __name__ == '__main__':
    main()
