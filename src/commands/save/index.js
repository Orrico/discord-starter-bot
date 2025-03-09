import { InteractionResponseType } from 'discord-interactions';
import { saveData } from '../../utility/database.js';
import logger from '../../utility/logger.js';
import { sanitizeInput } from '../../utility/sanitize.js';

// Command definition
export const data = {
  name: 'save',
  description: 'Save information to the database',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
  options: [
    {
      name: 'key',
      description: 'The key to store the data under',
      type: 3, // STRING type
      required: true
    },
    {
      name: 'value',
      description: 'The value to store',
      type: 3, // STRING type
      required: true
    }
  ]
};

// Command execution function
export async function execute(interaction) {
  try {
    const { user } = interaction.member;
    const keyRaw = interaction.data.options.find(opt => opt.name === 'key').value;
    const valueRaw = interaction.data.options.find(opt => opt.name === 'value').value;
    
    // Sanitize inputs
    const key = sanitizeInput(keyRaw);
    const value = sanitizeInput(valueRaw);

    // Add input validation
    if (key.length > 100) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Error: Key must be less than 100 characters.',
        },
      };
    }

    if (value.length > 1000) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Error: Value must be less than 1000 characters.',
        },
      };
    }

    // Save to database
    const result = saveData(user.id, key, value);

    if (!result.changes || result.changes === 0) {
      throw new Error('Failed to save data to database');
    }

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Successfully saved "${key}" with value "${value}"!`,
      },
    };
  } catch (error) {
    logger.error('Error saving data:', { error: error.message, stack: error.stack, userId: interaction.member?.user?.id });
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Sorry, there was an error saving your data.',
      },
    };
  }
}