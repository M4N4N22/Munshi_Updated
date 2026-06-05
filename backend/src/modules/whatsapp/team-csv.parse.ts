import { TEAM_CSV_HEADERS } from './team-csv.constants';

export type TeamCsvRow = {
  line: number;
  name: string;
  phone: string;
  role: string;
  department: string;
  doj: string;
};

export type TeamCsvParseResult =
  | { ok: true; rows: TeamCsvRow[] }
  | { ok: false; error: string };

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '_');
}

export function parseTeamCsvText(raw: string): TeamCsvParseResult {
  const text = raw.replace(/^\uFEFF/, '').trim();
  if (!text) {
    return { ok: false, error: 'File khali hai.' };
  }

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return {
      ok: false,
      error: 'Kam se kam header aur ek employee row chahiye.',
    };
  }

  const headerCells = parseCsvLine(lines[0]).map(normalizeHeader);
  const expected = TEAM_CSV_HEADERS as readonly string[];
  const missing = expected.filter((h) => !headerCells.includes(h));
  if (missing.length) {
    return {
      ok: false,
      error:
        `Galat CSV format. Ye columns chahiye: ${expected.join(', ')}\n` +
        `Missing: ${missing.join(', ')}`,
    };
  }

  const idx = Object.fromEntries(
    expected.map((h) => [h, headerCells.indexOf(h)]),
  ) as Record<(typeof expected)[number], number>;

  const rows: TeamCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.every((c) => !c.trim())) {
      continue;
    }
    rows.push({
      line: i + 1,
      name: cells[idx.name] ?? '',
      phone: cells[idx.phone] ?? '',
      role: cells[idx.role] ?? '',
      department: cells[idx.department] ?? '',
      doj: cells[idx.doj] ?? '',
    });
  }

  if (!rows.length) {
    return { ok: false, error: 'Koi employee row nahi mili.' };
  }

  return { ok: true, rows };
}
