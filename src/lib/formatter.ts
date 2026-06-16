import { writeFile } from 'node:fs/promises';
import { stdout } from 'node:process';
import type { FeishuUser } from '../types.js';

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function formatCsv(users: FeishuUser[]): string {
  const header = 'name,open_id,user_id,union_id';
  const rows = users.map(u =>
    [u.name, u.open_id, u.user_id, u.union_id].map(escapeCsvField).join(',')
  );
  return [header, ...rows].join('\n') + '\n';
}

export function formatJson(users: FeishuUser[]): string {
  return JSON.stringify(users, null, 2) + '\n';
}

export async function writeOutput(content: string, outputPath?: string): Promise<void> {
  if (outputPath) {
    await writeFile(outputPath, content, 'utf-8');
  } else {
    stdout.write(content);
  }
}
