import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Command collection
const commands = new Map();

// Load all commands from the commands directory
export async function loadCommands() {
  const commandsPath = path.join(__dirname, '..', 'commands');
  const commandFolders = fs.readdirSync(commandsPath);

  for (const folder of commandFolders) {
    // Skip files that aren't directories
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;
    
    // Check if the folder has an index.js file
    const commandFile = path.join(folderPath, 'index.js');
    if (!fs.existsSync(commandFile)) continue;
    
    try {
      // Import the command module
      const commandModule = await import(`file://${commandFile}`);
      
      // Validate command structure
      if (commandModule.data && commandModule.execute) {
        commands.set(commandModule.data.name, commandModule);
        console.log(`Loaded command: ${commandModule.data.name}`);
      } else {
        console.warn(`Command at ${commandFile} is missing required properties`);
      }
    } catch (error) {
      console.error(`Error loading command from ${commandFile}:`, error);
    }
  }
  
  return commands;
}

// Get a specific command by name
export function getCommand(name) {
  return commands.get(name);
}

// Get all commands for registration
export function getAllCommandData() {
  return Array.from(commands.values()).map(command => command.data);
}