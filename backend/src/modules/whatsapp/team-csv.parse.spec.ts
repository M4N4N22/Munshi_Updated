import { parseTeamCsvText } from './team-csv.parse';

describe('parseTeamCsvText', () => {
  it('parses valid template rows', () => {
    const csv = `name,phone,role,department,doj
Ram,919876543210,WORKER,production,
`;
    const result = parseTeamCsvText(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe('Ram');
    }
  });

  it('rejects wrong headers', () => {
    const result = parseTeamCsvText('full_name,mobile\nx,1');
    expect(result.ok).toBe(false);
  });
});
