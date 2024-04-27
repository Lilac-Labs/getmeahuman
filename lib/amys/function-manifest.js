import fs from 'fs';
import path from 'node:path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const allItems = JSON.parse(fs.readFileSync(path.join(__dirname, './all-items.json')));;

export const tools = [
  {
    type: 'function',
    function: {
      name: 'addItem',
      say: 'Let me add that for you.',
      description: 'Add one quantity of food item to the order.',
      parameters: {
        type: 'object',
        properties: {
          itemName: {
            type: 'string',
            'enum': allItems,
            description: 'The name of the food item',
          },
          dietOption: {
            type: 'string',
            description: 'the diet option for this item.',
            'enum': ['REG', 'GLUTEN-FREE', 'VEGAN', 'GF&V']
          }
        },
        required: ['itemName', 'dietOptions'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'modifyItem',
      say: 'Let me change that for you.',
      description: 'Modify the dietOption of one single food item thats already in the order.',
      parameters: {
        type: 'object',
        properties: {
          itemName: {
            type: 'string',
            description: 'The name of the food item. It has to match the item name in the existing order',
          },
          currentDietOption: {
            type: 'string',
            description: 'the diet option of this item that\' currently in the order. This has to be exact as the \'dieOption\' when this item is added or last modified.',
            'enum': ['REG', 'GLUTEN-FREE', 'VEGAN', 'GF&V']
          },
          desiredDietOption: {
            type: 'string',
            description: 'Desired diet option for this item if successful',
            'enum': ['REG', 'GLUTEN-FREE', 'VEGAN', 'GF&V']
          }
        },
        required: ['itemName', 'currentDietOptions', 'desiredDietOptions'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'removeItem',
      say: 'Let me remove that for you.',
      description: 'remove one quantity food item from the order.',
      parameters: {
        type: 'object',
        properties: {
          itemName: {
            type: 'string',
            description: 'The name of the food item. It has to match the item name in the existing order',
          },
          dietOption: {
            type: 'string',
            description: 'the diet option of this item that\' currently in the order. This has to be exact as the \'dieOption\' when this item is added or last modified.',
            'enum': ['REG', 'GLUTEN-FREE', 'VEGAN', 'GF&V']
          }
        },
        required: ['itemName', 'dietOptions'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'checkPrice',
      say: 'Let me check the price, one moment.',
      description: 'Check the price of an item on the menu',
      parameters: {
        type: 'object',
        properties: {
          itemName: {
            type: 'string',
            description: 'The name of the food item',
          },
        },
        required: ['itemName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'transferCall',
      say: 'One moment while I transfer your call.',
      description: 'Transfers the customer to a live agent in case they request help from a real person.',
      parameters: {
        type: 'object',
        properties: {
          callSid: {
            type: 'string',
            description: 'The unique identifier for the active phone call.',
          },
        },
        required: ['callSid'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recordCallerName',
      say: 'Got it!',
      description: 'Record caller\'s name in system',
      parameters: {
        type: 'object',
        properties: {
          callerName: {
            type: 'string',
            description: 'Caller\'s name',
          },
        },
        required: ['callerName'],
      },
    },
  },
];
