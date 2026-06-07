import * as fs from 'fs';
import * as path from 'path';

export const BACKEND_CONTRACTS_ROOT = path.join(process.cwd(), 'contracts');
export const ML_CONTRACTS_ROOT = path.join(process.cwd(), '..', 'ml', 'contracts');

export function readContractJson(
  relativePath: string,
  root: string = BACKEND_CONTRACTS_ROOT,
): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.join(root, relativePath), 'utf-8'),
  ) as Record<string, unknown>;
}

export function readTextContract(
  relativePath: string,
  root: string = BACKEND_CONTRACTS_ROOT,
): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf-8');
}

export function assertJsonDeepEqual(
  left: unknown,
  right: unknown,
  label: string,
): void {
  expect(left).toEqual(right);
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw new Error(`Contract drift detected: ${label}`);
  }
}

export function sortedStringArray(values: unknown): string[] {
  return [...(values as string[])].sort();
}

export function schemaPropertyNames(schema: Record<string, unknown>): string[] {
  const props = schema.properties as Record<string, unknown> | undefined;
  return props ? Object.keys(props).sort() : [];
}

export function schemaRequiredFields(schema: Record<string, unknown>): string[] {
  return sortedStringArray(schema.required ?? []);
}

export function enumValuesWithoutNull(schemaProperty: Record<string, unknown>): string[] {
  const values = (schemaProperty.enum as (string | null)[] | undefined) ?? [];
  return values.filter((v): v is string => v != null).sort();
}

export function extractTsConstArray(source: string, constName: string): string[] {
  const pattern = new RegExp(
    `export const ${constName}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as const`,
  );
  const match = source.match(pattern);
  if (!match?.[1]) {
    throw new Error(`Could not parse ${constName} from TypeScript contract`);
  }
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
}

export function extractPythonLiteralEnum(
  source: string,
  fieldName: string,
): string[] {
  const pattern = new RegExp(
    `${fieldName}:\\s*Optional\\[Literal\\[([^\\]]+)\\]\\]`,
  );
  const match = source.match(pattern);
  if (!match?.[1]) {
    throw new Error(`Could not parse Python Literal for ${fieldName}`);
  }
  return match[1]
    .split(',')
    .map((v) => v.trim().replace(/^"|"$/g, ''))
    .sort();
}
