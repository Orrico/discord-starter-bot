import 'dotenv/config';
import config from './config.json' with { type: 'json' };
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { loadCommands, getCommand } from './src/utility/commandHandler.js';
import { initDatabase } from './src/utility/database.js';
import logger from './src/utility/logger.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = config.appPort || 3000;

// Use request logging middleware
app.use(logger.requestLogger);

// Simple rate limiting middleware
const rateLimit = new Map();
const RATE_LIMIT_RESET = 60000; // 60 seconds in ms
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

function rateLimiter(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  
  // Clean up old entries
  if (rateLimit.has(ip)) {
    const requests = rateLimit.get(ip).filter(time => now - time < RATE_LIMIT_RESET);
    rateLimit.set(ip, requests);
    
    // Check if too many requests
    if (requests.length >= 50) {
      logger.warn('Rate limit exceeded', { ip });
      return res.status(429).json({ error: 'Too many requests, please try again later' });
    }
    
    requests.push(now);
  } else {
    rateLimit.set(ip, [now]);
  }
  
  next();
}

// Add periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of rateLimit.entries()) {
    // Remove IP entries with no recent requests
    if (times.length === 0 || now - Math.max(...times) > RATE_LIMIT_RESET * 2) {
      rateLimit.delete(ip);
    }
  }
}, CLEANUP_INTERVAL);

// Use rate limiting middleware
app.use(rateLimiter);

// Initialize database
initDatabase();

// Load commands
loadCommands().then(() => {
  logger.info('Commands loaded successfully');
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
        // Log command execution
        logger.debug('Executing command', { 
          command: name, 
          user: req.body.member?.user?.id || 'unknown'
        });
        
        // Execute the command and send the response
        const response = await command.execute(req.body);
        return res.send(response);
      } catch (error) {
        logger.error(`Error executing command ${name}:`, { 
          error: error.message,
          stack: error.stack
        });
        return res.status(500).json({ error: 'Command execution failed' });
      }
    }

    logger.warn('Unknown command received', { command: name });
    return res.status(400).json({ error: 'unknown command' });
  }

  logger.warn('Unknown interaction type', { type });
  return res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`, {
    env: process.env.NODE_ENV || 'development',
    appName: config.appName
  });
});