import { stderr } from 'node:process';
import { Command } from 'commander';
import { getApp } from '../lib/config-store.js';
import { getTenantAccessToken } from '../lib/feishu-client.js';
import { traverseAndCollect } from '../lib/traverser.js';
import { formatCsv, formatJson, writeOutput } from '../lib/formatter.js';

export function registerFetchCommand(program: Command) {
  program
    .command('fetch')
    .description('Fetch all user IDs within the app contact permission scope')
    .option('--app <name>', 'App name to use (default: first configured app)')
    .option('--format <fmt>', 'Output format: csv or json', 'csv')
    .option('--output <file>', 'Output file path (default: stdout)')
    .option('--department <id>', 'Start from a specific department (default: root)')
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

      stderr.write('Traversing departments and collecting users...\n');

      const rootDept = opts.department || '0';
      let users;
      try {
        users = await traverseAndCollect(token, rootDept);
      } catch (e: any) {
        stderr.write(`Error during traversal: ${e.message}\n`);
        process.exit(1);
      }

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
