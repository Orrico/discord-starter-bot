import 'dotenv/config';
import config from './config.json' with { type: 'json' };
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { loadCommands, getCommand } from './src/utility/commandHandler.js';
import { initDatabase } from './src/utility/database.js'; // Add this line

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = config.appPort || 3000;

// Initialize database
initDatabase();

// Load commands
loadCommands().then(() => {
  console.log('Commands loaded successfully');
});

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  // Interaction id, type and data
  const { id, type, data } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;
    
    // Get the command from our command handler
    const command = getCommand(name);
    
    if (command) {
      try {
        // Execute the command and send the response
        const response = await command.execute(req.body);
        return res.send(response);
      } catch (error) {
        console.error(`Error executing command ${name}:`, error);
        return res.status(500).json({ error: 'Command execution failed' });
      }
    }

    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});