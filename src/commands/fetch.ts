import { stderr, stdin } from 'node:process';
import { Command } from 'commander';
import { getApp } from '../lib/config-store.js';
import { getTenantAccessToken } from '../lib/feishu-client.js';
import { traverseAndCollect, buildDeptTree } from '../lib/traverser.js';
import { formatCsv, formatJson, writeOutput } from '../lib/formatter.js';
import { selectDepartments } from '../lib/dept-tree.js';
import type { DeptNode, FeishuUser } from '../types.js';

export function registerFetchCommand(program: Command) {
  program
    .command('fetch')
    .description('Fetch all user IDs within the app contact permission scope')
    .option('--app <name>', 'App name to use (default: first configured app)')
    .option('--format <fmt>', 'Output format: csv or json', 'csv')
    .option('--output <file>', 'Output file path (default: stdout)')
    .option('--department <id>', 'Fetch from a specific department directly (skip interactive)')
    .action(async (opts) => {
      const format = opts.format as 'csv' | 'json';
      if (format !== 'csv' && format !== 'json') {
        stderr.write('Error: --format must be "csv" or "json"\n');
        process.exit(1);
      }

      let app;
      try {
        app = await getApp(opts.app);
      } catch (e: any) {
        stderr.write(`Error: ${e.message}\n`);
        process.exit(1);
      }

      stderr.write(`Using app: ${app.name}\n`);
      stderr.write('Authenticating...\n');

      let token: string;
      try {
        token = await getTenantAccessToken(app.appId, app.appSecret);
      } catch (e: any) {
        stderr.write(`Error: ${e.message}\n`);
        process.exit(1);
      }

      let targetDepts: string[];

      if (opts.department) {
        // Non-interactive: use specified department directly
        targetDepts = [opts.department];
      } else if (stdin.isTTY) {
        // Interactive: show tree and let user choose
        targetDepts = await interactiveSelect(token);
      } else {
        // Piped/non-TTY: default to root
        targetDepts = ['0'];
      }

      stderr.write('Traversing departments and collecting users...\n');

      const allUsers = new Map<string, FeishuUser>();
      for (const deptId of targetDepts) {
        try {
          const users = await traverseAndCollect(token, deptId);
          for (const u of users) {
            if (!allUsers.has(u.open_id)) {
              allUsers.set(u.open_id, u);
            }
          }
        } catch (e: any) {
          stderr.write(`\n  Warning: Skipped department ${deptId} — ${e.message}\n`);
        }
      }

      const users = Array.from(allUsers.values());

      if (users.length === 0) {
        stderr.write('Warning: No users found. Check app contact permission scope.\n');
        return;
      }

      stderr.write(`Done! ${users.length} unique users collected.\n`);

      const content = format === 'json' ? formatJson(users) : formatCsv(users);
      await writeOutput(content, opts.output);

      if (opts.output) {
        stderr.write(`Output written to: ${opts.output}\n`);
      }
    });
}

async function interactiveSelect(token: string): Promise<string[]> {
  stderr.write('Fetching department tree...\n');

  let tree: DeptNode[];
  try {
    tree = await buildDeptTree(token, '0');
  } catch (e: any) {
    stderr.write(`Warning: Cannot fetch department tree — ${e.message}\n`);
    stderr.write('Falling back to root department.\n');
    return ['0'];
  }

  if (tree.length === 0) {
    stderr.write('No sub-departments found. Using root department.\n');
    return ['0'];
  }

  // Add a virtual "all (root)" option
  const rootNode: DeptNode = { id: '0', name: '全部 (root)', children: [] };
  const treeWithRoot = [rootNode, ...tree];

  const selected = await selectDepartments(treeWithRoot);
  return selected.map(n => n.id);
}
