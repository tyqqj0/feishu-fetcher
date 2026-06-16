import { stderr } from 'node:process';
import { Command } from 'commander';
import { getApp } from '../lib/config-store.js';
import { getTenantAccessToken } from '../lib/feishu-client.js';
import { buildDeptTree } from '../lib/traverser.js';
import { renderTree, renderFlat } from '../lib/dept-tree.js';

export function registerDeptCommand(program: Command) {
  program
    .command('dept')
    .description('List accessible departments as a tree')
    .option('--app <name>', 'App name to use')
    .option('--flat', 'Output as flat list (id\\tpath) for scripting')
    .action(async (opts) => {
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

      stderr.write('Fetching department tree...\n');

      let tree;
      try {
        tree = await buildDeptTree(token, '0');
      } catch (e: any) {
        stderr.write(`Error: ${e.message}\n`);
        process.exit(1);
      }

      if (tree.length === 0) {
        stderr.write('No accessible departments found. Check app contact permission scope.\n');
        process.exit(1);
      }

      stderr.write('\n');
      if (opts.flat) {
        stderr.write(renderFlat(tree) + '\n');
      } else {
        stderr.write(renderTree(tree) + '\n');
      }
      stderr.write(`\n${countNodes(tree)} departments total.\n`);
    });
}

function countNodes(nodes: import('../types.js').DeptNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count += 1 + countNodes(node.children);
  }
  return count;
}
