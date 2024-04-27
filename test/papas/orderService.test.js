import { addItem, removeItem, checkPrice } from '../../functions/index.js';

import { allPapaItems, itemNameTranslator } from '../../lib/papas/papa-items.js'; // should this be using utils?
import { getPapaMenu } from '../../lib/utils.js';

import { OrderService, GptService } from '../../services/index.js';


describe('Simple Functionality Test', () => {

  it('AddItem: House Basil Prawn w.Rice', async () => {
    // Create an instance of OrderService
    const orderService = new OrderService();
    // Define the function arguments
    const functionArgs = {
      // Specify the arguments for the addItem function
      itemName: 'House Basil Prawn w.Rice',
    };
    // Call the addItem function
    const result = await addItem(orderService, functionArgs);
    // Assert the result
    expect(result.success).toBe(true);
  });

  it('RemoveItem: House Basil Prawn w.Rice', async () => {
    // Create an instance of OrderService
    const orderService = new OrderService();
    // Define the function arguments
    const functionArgs = {
      // Specify the arguments for the removeItem function
      itemName: 'House Basil Prawn w.Rice',
      specialInstruction: ''
    };
    // Call the removeItem function
    const addResult = await addItem(orderService, functionArgs);
    expect(addResult.success).toBe(true);

    const removeResult = await removeItem(orderService, functionArgs);
    // Assert the result
    expect(removeResult.success).toBe(true);
  });

  it('CheckPrice: House Basil Prawn w.Rice', async () => {
    // Create an instance of OrderService
    const orderService = new OrderService();
    // Define the function arguments
    const functionArgs = {
      // Specify the arguments for the removeItem function
      itemName: 'House Basil Prawn w.Rice',
    };
    // Call the removeItem function
    const priceResult = await checkPrice(orderService, functionArgs);
    expect(priceResult['price']).toBe(14.5);
  });

});

describe('Comprehensive Functionality test', () => {

  it('Add All Items', async () => {
    const orderService = new OrderService();
    const menu = await getPapaMenu();

    let total = 0;
    for (const item of allPapaItems['allPapaItems']) {
      const itemInfo = menu.find(i => i['name']['en'] === itemNameTranslator[item] ? itemNameTranslator[item] : item);
      // console.log(itemInfo);
      const price = Number(itemInfo['price']);
      total = total + price;
      // console.log('total:', total);
      // console.log('price:', price);

      const result = await addItem(orderService, { itemName: item });
      expect(result.success).toBe(true);
    }
  });
});

xdescribe('Order Function Tests with GPT', () => {
  let gptService;

  beforeEach(() => {
    gptService = new GptService();
  });

  it.skip('addOrder with specialInstruction', async () => {
    await gptService.completion('I want Orange Chicken with Rice with no spice', 1);

    expect(gptService.order.order[0]['itemName']).toBe('Orange Chicken w.Rice');
    expect(gptService.order.order[0]['specialInstruction']).toBe('no spice');
  });

  it('addTwoItems', async () => {
    await gptService.completion('Can I have a order of Mongolian Beef and a order of Orange Chicken', 1);
    // console.log('order' + JSON.stringify(gptService.order.order));
    expect(gptService.order.order.length).toBe(2);
  }, 10000);
});
