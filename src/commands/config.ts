import { createInterface } from 'node:readline/promises';
import { stdin, stderr } from 'node:process';
import { Command } from 'commander';
import { addApp, loadConfig, removeApp } from '../lib/config-store.js';
import { getTenantAccessToken, getAppName } from '../lib/feishu-client.js';

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
    .option('--name <name>', 'Friendly name for this app (auto-fetched if omitted)')
    .option('--app-id <id>', 'Feishu App ID')
    .option('--app-secret <secret>', 'Feishu App Secret')
    .action(async (opts) => {
      let { name, appId, appSecret } = opts;

      // Step 1: Collect credentials
      if (!appId || !appSecret) {
        stderr.write('Interactive mode — enter app credentials:\n');
        if (!appId) appId = await prompt('App ID: ');
        if (!appSecret) appSecret = await prompt('App Secret: ');
      }

      if (!appId || !appSecret) {
        stderr.write('Error: App ID and App Secret are required.\n');
        process.exit(1);
      }

      // Step 2: Verify credentials and fetch app name
      stderr.write('Verifying credentials...\n');
      let token: string;
      try {
        token = await getTenantAccessToken(appId, appSecret);
      } catch (e: any) {
        stderr.write(`Error: ${e.message}\n`);
        process.exit(1);
      }
      stderr.write('✓ Credentials valid.\n');

      let fetchedName = '';
      try {
        fetchedName = await getAppName(token);
      } catch {
        // Non-fatal — app info API might require extra permissions
      }

      // Step 3: Determine final name
      if (!name) {
        if (fetchedName) {
          const input = await prompt(`App name [${fetchedName}]: `);
          name = input || fetchedName;
        } else {
          name = await prompt('App name (e.g. prod, test): ');
        }
      }

      if (!name) {
        stderr.write('Error: App name is required.\n');
        process.exit(1);
      }

      // Step 4: Save
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
