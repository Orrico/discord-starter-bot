import { InteractionResponseType } from 'discord-interactions';
import { getRandomEmoji } from '../../utility/utils.js';

// Command definition (same as in commands.js)
export const data = {
  name: 'test',
  description: 'Basic command for testing if the bot is working',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// Command execution function
export async function execute(interaction) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      // Fetches a random emoji to send from a helper function
      content: `hello world ${getRandomEmoji()}`,
    },
  };
}