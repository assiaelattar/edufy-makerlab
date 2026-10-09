import type { ResourceQuizQuestion } from '../types.ts';

export const resourceQuizCsvHeaders = ['question_id', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option', 'explanation'] as const;

export const resourceQuizCsvTemplate = `${resourceQuizCsvHeaders.join(',')}\nq1,"What should you do before changing a wire?","Disconnect power","Add water","Run the code","","A","Disconnect power before changing the circuit."\nq2,"Which label identifies the ground connection?","3V","GND","Signal","Data","B","GND is the ground connection."\n`;

const normalizeHeader = (value: string) => value.replace(/^\uFEFF/, '').trim().toLocaleLowerCase().replace(/[\s-]+/g, '_');

export function parseCsvRows(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"') {
      if (quoted && input[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
      continue;
    }
    if (char === ',' && !quoted) { row.push(cell); cell = ''; continue; }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[index + 1] === '\n') index += 1;
      row.push(cell); cell = '';
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      continue;
    }
    cell += char;
  }
  if (quoted) throw new Error('The CSV has an unclosed quoted value.');
  row.push(cell);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

export function parseResourceQuizCsv(input: string): ResourceQuizQuestion[] {
  const rows = parseCsvRows(input);
  if (rows.length < 2) throw new Error('The CSV needs a header row and at least one question.');
  if (rows.length > 101) throw new Error('Import up to 100 quiz questions at a time.');

  const headers = rows[0].map(normalizeHeader);
  const column = (name: typeof resourceQuizCsvHeaders[number]) => headers.indexOf(name);
  const required = ['question', 'option_a', 'option_b', 'correct_option'] as const;
  const missing = required.filter(name => column(name) < 0);
  if (missing.length) throw new Error(`Missing CSV column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`);

  const ids = new Set<string>();
  return rows.slice(1).map((values, rowIndex) => {
    const csvRow = rowIndex + 2;
    const get = (name: typeof resourceQuizCsvHeaders[number]) => {
      const index = column(name);
      return index < 0 ? '' : String(values[index] || '').trim();
    };
    const prompt = get('question');
    const rawOptions = [get('option_a'), get('option_b'), get('option_c'), get('option_d')];
    const options = rawOptions.filter(Boolean);
    if (!prompt) throw new Error(`Row ${csvRow}: add a question.`);
    if (options.length < 2) throw new Error(`Row ${csvRow}: add at least option_a and option_b.`);

    const answer = get('correct_option');
    const letterIndex = /^[A-D]$/i.test(answer) ? answer.toUpperCase().charCodeAt(0) - 65 : -1;
    const numberIndex = /^[1-4]$/.test(answer) ? Number(answer) - 1 : -1;
    const rawCorrectIndex = letterIndex >= 0 ? letterIndex : numberIndex >= 0 ? numberIndex : rawOptions.findIndex(option => option.toLocaleLowerCase() === answer.toLocaleLowerCase());
    if (rawCorrectIndex < 0 || !rawOptions[rawCorrectIndex]) throw new Error(`Row ${csvRow}: correct_option must be A–D, 1–4, or the exact option text.`);
    const correctOptionIndex = rawOptions.slice(0, rawCorrectIndex).filter(Boolean).length;

    const suppliedId = get('question_id').replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const baseId = suppliedId || `question-${rowIndex + 1}`;
    let id = baseId;
    let suffix = 2;
    while (ids.has(id)) { id = `${baseId}-${suffix}`; suffix += 1; }
    ids.add(id);

    return { id, prompt, options, correctOptionIndex, explanation: get('explanation') };
  });
}
