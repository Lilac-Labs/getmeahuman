import { allPhoneNumbers } from './all-items.js';

export const tools = [
  // {
  //   type: 'function',
  //   function: {
  //     name: 'addItem',
  //     say: 'Let me add that for you.',
  //     description: 'Add one quantity of food item to the order.',
  //     parameters: {
  //       type: 'object',
  //       properties: {
  //         itemName: {
  //           type: 'string',
  //           'enum': allPapaItems,
  //           description: 'The name of the food item',
  //         },
  //         specialInstruction: {
  //           type: 'string',
  //           description: 'Special instruction for this item.'
  //         }
  //       },
  //       required: ['itemName'],
  //     },
  //   },
  // },
  // {
  //   type: 'function',
  //   function: {
  //     name: 'modifyItem',
  //     say: 'Let me change that for you.',
  //     description: 'Modify the specialInstruction of one single food item thats already in the order.',
  //     parameters: {
  //       type: 'object',
  //       properties: {
  //         itemName: {
  //           type: 'string',
  //           description: 'The name of the food item. It has to match the item name in the existing order',
  //         },
  //         currentSpecialInstruction: {
  //           type: 'string',
  //           description: 'the special instruction of this item that\' currently in the order. This has to be exact as the \'specialInstruction\' when this item is added or last modified.'
  //         },
  //         desiredSpecialInstruction: {
  //           type: 'string',
  //           description: 'Desired Special instruction for this item if successful'
  //         }
  //       },
  //       required: ['itemName', 'currentSpecialInstruction', 'specialInstruction'],
  //     },
  //   },
  // },
  // {
  //   type: 'function',
  //   function: {
  //     name: 'removeItem',
  //     say: 'Let me remove that for you.',
  //     description: 'remove one quantity food item from the order.',
  //     parameters: {
  //       type: 'object',
  //       properties: {
  //         itemName: {
  //           type: 'string',
  //           description: 'The name of the food item. It has to match the item name in the existing order',
  //         },
  //         specialInstruction: {
  //           type: 'string',
  //           description: 'the special instruction of this item that\' currently in the order. This has to be exact as the \'specialInstruction\' when this item is added or last modified.'
  //         }
  //       },
  //       required: ['itemName', 'specialInstruction'],
  //     },
  //   },
  // },
  // {
  //   type: 'function',
  //   function: {
  //     name: 'checkPrice',
  //     say: 'Let me check the price, one moment.',
  //     description: 'Check the price of an item on the menu',
  //     parameters: {
  //       type: 'object',
  //       properties: {
  //         itemName: {
  //           type: 'string',
  //           description: 'The name of the food item',
  //         },
  //       },
  //       required: ['itemName'],
  //     },
  //   },
  // },
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
