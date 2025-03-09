import 'dotenv/config';
import config from './config.json' with { type: 'json' };
import { InstallGlobalCommands } from './src/utility/utils.js';
import { loadCommands, getAllCommandData } from './src/utility/commandHandler.js';
import logger from './src/utility/logger.js';

// Load all commands and register them
async function registerCommands() {
  await loadCommands();
  const ALL_COMMANDS = getAllCommandData();
  
  logger.info(`Registering ${ALL_COMMANDS.length} commands...`);
  await InstallGlobalCommands(config.appID, ALL_COMMANDS);
  logger.info('Commands registered successfully!');
}

registerCommands().catch(error => logger.error('Error registering commands:', { error: error.message, stack: error.stack }));