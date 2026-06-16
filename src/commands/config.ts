import { createInterface } from 'node:readline/promises';
import { stdin, stdout, stderr } from 'node:process';
import { Command } from 'commander';
import { addApp, loadConfig, removeApp } from '../lib/config-store.js';

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stderr });
  try {
    const answer = await rl.question(question);
    return answer.trim();
  } finally {
    rl.close();
  }
}

export function registerConfigCommand(program: Command) {
  const config = program.command('config').description('Manage app configurations');

  config
    .command('add')
    .description('Add a new Feishu app configuration')
    .option('--name <name>', 'Friendly name for this app')
    .option('--app-id <id>', 'Feishu App ID')
    .option('--app-secret <secret>', 'Feishu App Secret')
    .action(async (opts) => {
      let { name, appId, appSecret } = opts;

      if (!name || !appId || !appSecret) {
        stderr.write('Interactive mode — enter app details:\n');
        if (!name) name = await prompt('App name (e.g. prod, test): ');
        if (!appId) appId = await prompt('App ID: ');
        if (!appSecret) appSecret = await prompt('App Secret: ');
      }

      if (!name || !appId || !appSecret) {
        stderr.write('Error: All fields are required.\n');
        process.exit(1);
      }

      try {
        await addApp({ name, appId, appSecret });
        stderr.write(`✓ App "${name}" added successfully.\n`);
      } catch (e: any) {
        stderr.write(`Error: ${e.message}\n`);
        process.exit(1);
      }
    });

  config
    .command('list')
    .description('List all configured apps')
    .action(async () => {
      const cfg = await loadConfig();
      if (cfg.apps.length === 0) {
        stderr.write('No apps configured. Run "feishu-fetcher config add" to add one.\n');
        return;
      }
      stderr.write('\nConfigured apps:\n');
      for (const app of cfg.apps) {
        const marker = app.name === cfg.defaultApp ? ' (default)' : '';
        const maskedId = app.appId.slice(0, 6) + '...' + app.appId.slice(-4);
        stderr.write(`  ${app.name}${marker}  app_id: ${maskedId}\n`);
      }
      stderr.write('\n');
    });

  config
    .command('remove')
    .description('Remove an app configuration')
    .argument('<name>', 'App name to remove')
    .action(async (name: string) => {
      try {
        await removeApp(name);
        stderr.write(`✓ App "${name}" removed.\n`);
      } catch (e: any) {
        stderr.write(`Error: ${e.message}\n`);
        process.exit(1);
      }
    });
}
