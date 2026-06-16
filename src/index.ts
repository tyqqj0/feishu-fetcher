import { Command } from 'commander';
import { registerConfigCommand } from './commands/config.js';
import { registerFetchCommand } from './commands/fetch.js';
import { registerDeptCommand } from './commands/dept.js';

const program = new Command();

program
  .name('feishu-fetcher')
  .description('Batch fetch user IDs (open_id, user_id, union_id) from Feishu apps')
  .version('0.1.0');

registerConfigCommand(program);
registerFetchCommand(program);
registerDeptCommand(program);

program.parse();
