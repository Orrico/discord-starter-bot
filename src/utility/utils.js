import 'dotenv/config';
import config from '../../config.json' with { type: 'json' };
import logger from './logger.js';

export async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = 'https://discord.com/api/v10/' + endpoint;
  
  // Set default timeout
  const requestOptions = {
    timeout: 10000, // 10 second timeout
    ...options
  };
  
  // Stringify payloads
  if (requestOptions.body) {
    requestOptions.body = JSON.stringify(requestOptions.body);
  }
  
  // Use fetch to make requests
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'User-Agent': `${config.appName}/${process.env.npm_package_version}`,
      },
      ...requestOptions
    });
    
    // throw API errors
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const status = res.status;
      
      // Handle rate limiting specially
      if (status === 429) {
        const retryAfter = res.headers.get('retry-after') || 5;
        logger.warn(`Discord API rate limited. Retry after ${retryAfter}s`, { status, endpoint });
        throw new Error(`Discord API rate limited. Retry after ${retryAfter}s`);
      }
      
      logger.error(`Discord API Error (${status}):`, { status, data, endpoint });
      throw new Error(`Discord API Error: ${status} - ${data.message || 'Unknown error'}`);
    }
    
    // return original response
    return res;
  } catch (err) {
    if (!err.message.includes('Discord API Error')) {
      logger.error('Network or parsing error:', { error: err.message, stack: err.stack, endpoint });
    }
    throw err;
  }
}

export async function InstallGlobalCommands(appId, commands) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`;

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(endpoint, { method: 'PUT', body: commands });
  } catch (err) {
    logger.error('Error installing commands:', { error: err.message, stack: err.stack });
  }
}

// Simple method that returns a random emoji from list
export function getRandomEmoji() {
  const emojiList = ['😭','😄','😌','🤓','😎','😤','🤖','😶‍🌫️','🌏','📸','💿','👋','🌊','✨'];
  return emojiList[Math.floor(Math.random() * emojiList.length)];
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
