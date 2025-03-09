import 'dotenv/config';
import config from './config.json' with { type: 'json' };
import { InstallGlobalCommands } from './src/utility/utils.js';
import { loadCommands, getAllCommandData } from './src/utility/commandHandler.js';

// Load all commands and register them
async function registerCommands() {
  await loadCommands();
  const ALL_COMMANDS = getAllCommandData();
  
  console.log(`Registering ${ALL_COMMANDS.length} commands...`);
  await InstallGlobalCommands(config.appID, ALL_COMMANDS);
  console.log('Commands registered successfully!');
}

registerCommands().catch(console.error);