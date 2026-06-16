import { multiselect, isCancel } from '@clack/prompts';
import type { DeptNode } from '../types.js';

interface FlatItem {
  id: string;
  name: string;
  depth: number;
}

function flattenWithDepth(nodes: DeptNode[], depth = 0): FlatItem[] {
  const result: FlatItem[] = [];
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, depth });
    result.push(...flattenWithDepth(node.children, depth + 1));
  }
  return result;
}

export function renderTree(nodes: DeptNode[], options?: { numbered?: boolean }): string {
  const lines: string[] = [];
  const numbered = options?.numbered ?? false;
  let counter = 0;

  function walk(list: DeptNode[], prefix: string) {
    for (let i = 0; i < list.length; i++) {
      const node = list[i];
      const isLast = i === list.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      counter++;
      const label = numbered ? `[${counter}] ${node.name} (${node.id})` : `${node.name} (${node.id})`;
      lines.push(`${prefix}${connector}${label}`);
      const childPrefix = prefix + (isLast ? '    ' : '│   ');
      walk(node.children, childPrefix);
    }
  }

  walk(nodes, '');
  return lines.join('\n');
}

export function renderFlat(nodes: DeptNode[]): string {
  const lines: string[] = [];

  function walk(list: DeptNode[], pathPrefix: string) {
    for (const node of list) {
      const path = pathPrefix ? `${pathPrefix}/${node.name}` : node.name;
      lines.push(`${node.id}\t${path}`);
      walk(node.children, path);
    }
  }

  walk(nodes, '');
  return lines.join('\n');
}

export async function selectDepartments(nodes: DeptNode[]): Promise<DeptNode[]> {
  const flat = flattenWithDepth(nodes);

  if (flat.length === 0) {
    return [];
  }

  const nodeMap = new Map<string, DeptNode>();
  function buildMap(list: DeptNode[]) {
    for (const n of list) {
      nodeMap.set(n.id, n);
      buildMap(n.children);
    }
  }
  buildMap(nodes);

  const options = flat.map(item => ({
    value: item.id,
    label: `${'  '.repeat(item.depth)}${item.name}`,
    hint: item.id === '0' ? 'fetch all users' : item.id,
  }));

  const selected = await multiselect({
    message: 'Select department(s) to fetch (space to toggle, enter to confirm)',
    options,
    required: true,
  });

  if (isCancel(selected)) {
    process.exit(0);
  }

  return (selected as string[])
    .map(id => nodeMap.get(id))
    .filter((n): n is DeptNode => n !== undefined);
}
