import { InteractionResponseType } from 'discord-interactions';
import { saveData } from '../../utility/database.js';

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
    const key = interaction.data.options.find(opt => opt.name === 'key').value;
    const value = interaction.data.options.find(opt => opt.name === 'value').value;

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
    console.error('Error saving data:', error);
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Sorry, there was an error saving your data.',
      },
    };
  }
}