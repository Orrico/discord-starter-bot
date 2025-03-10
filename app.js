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
import { DiscordRequest } from './src/utility/utils.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = config.appPort || 3000;

// Use request logging middleware
app.use(logger.requestLogger);

// Define the rate limit map (was missing)
const rateLimit = new Map();

// Improved rate limiting configuration
const RATE_LIMIT = {
  WINDOW_MS: 60000, // 1 minute window
  MAX_REQUESTS: 50, // Max requests per window
  CLEANUP_INTERVAL: 10 * 60 * 1000 // 10 minutes
};

function rateLimiter(req, res, next) {
  const ip = req.ip;
  const userId = req.body?.member?.user?.id || 'unknown';
  const now = Date.now();
  const key = `${ip}:${userId}`;
  
  // Clean up old entries
  if (rateLimit.has(key)) {
    const userRequests = rateLimit.get(key).filter(time => now - time < RATE_LIMIT.WINDOW_MS);
    rateLimit.set(key, userRequests);
    
    // Check if too many requests
    if (userRequests.length >= RATE_LIMIT.MAX_REQUESTS) {
      logger.warn('Rate limit exceeded', { ip, userId });
      return res.status(429).json({ 
        error: 'Too many requests', 
        retry_after: Math.ceil((RATE_LIMIT.WINDOW_MS - (now - userRequests[0])) / 1000)
      });
    }
    
    userRequests.push(now);
  } else {
    rateLimit.set(key, [now]);
  }
  
  next();
}

// Add periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, times] of rateLimit.entries()) {
    // Remove key entries with no recent requests
    if (times.length === 0 || now - Math.max(...times) > RATE_LIMIT.WINDOW_MS * 2) {
      rateLimit.delete(key);
    }
  }
}, RATE_LIMIT.CLEANUP_INTERVAL);

// Use rate limiting middleware
app.use(rateLimiter);

// Verify Discord connection at startup
async function verifyDiscordConnection() {
  try {
    // Make a simple API request to verify the token works
    const response = await DiscordRequest('applications/@me', { method: 'GET' });
    const data = await response.json();
    
    if (data && data.id) {
      logger.info(`✅ Successfully connected to Discord API as ${data.name} (${data.id})`);
      return true;
    } else {
      logger.error('❌ Failed to authenticate with Discord: Invalid response');
      return false;
    }
  } catch (error) {
    logger.error('❌ Failed to connect to Discord API:', { 
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

// Initialize database
initDatabase();

// Command loading status
let commandsLoaded = false;

// Load commands
loadCommands().then(() => {
  commandsLoaded = true;
  logger.info('Commands loaded successfully');
}).catch(err => {
  logger.error('Failed to load commands:', { error: err.message, stack: err.stack });
  // You might want to exit here if commands are critical
  // process.exit(1);
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
    // Check if commands are loaded
    if (!commandsLoaded) {
      logger.warn('Received command before commands were loaded');
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Bot is still initializing. Please try again in a moment.',
        },
      });
    }
    
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

// Unify the duplicate shutdown handlers into one function
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal} signal, shutting down gracefully`);
  try {
    const dbModule = await import('./src/utility/database.js');
    const db = dbModule.default;
    if (db) {
      db.close();
      logger.info('Database connection closed');
    }
    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown:', { error: err.message });
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start server and verify Discord connection
app.listen(PORT, async () => {
  logger.info(`Server started on port ${PORT}`, {
    env: process.env.NODE_ENV || 'development',
    appName: config.appName
  });
  
  // Call the Discord connection verification
  const connected = await verifyDiscordConnection();
  
  if (!connected) {
    logger.warn('⚠️ Server is running but Discord connection failed. Bot functionality will be limited.');
  }
});