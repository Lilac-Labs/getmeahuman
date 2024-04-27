import OrderService from '../../services/order-service-abstract.js';
import { itemNameTranslator } from './all-items.js';
import { loadMenu } from '../utils.js';

export default class PapasOrderService extends OrderService {

  constructor() {
    super();
    this.menu = loadMenu('papas');
  }

  //Overwrite
  addItem(functionArgs) {
    const itemName = functionArgs['itemName'];
    const specialInstruction = functionArgs['specialInstruction'] || '';

    const itemInfo = this.menu.find(e => e.name.en === (itemNameTranslator[itemName] ? itemNameTranslator[itemName] : itemName));
    if (!itemInfo) {
      return { success: false, errorMsg: 'Item does not exist' };
    }
    const price = Number(itemInfo['price']);
    this.order.push({ 'itemName': itemName, 'specialInstruction': specialInstruction, 'price': price });
    this.total += price;

    return { success: true, addedItemName: itemName, addedItemSpecialInstruction: specialInstruction, itemPrice: itemInfo['price'], currentTotal: this.total };
  }

  //Overwrite
  modifyItem(functionArgs) {

    const itemName = functionArgs['itemName'];
    const currentSpecialInstruction = functionArgs['currentSpecialInstruction'];
    const desiredSpecialInstruction = functionArgs['desiredSpecialInstruction'];

    // const itemInfo = this.menu.find(e => e.name.en === itemName);
    const item = this.order.find(i => i['itemName'] === itemName && i['specialInstruction'] === currentSpecialInstruction);
    if (!item) {
      return { success: true, itemName: itemName, errorMsg: 'This item does not exist in current order' };
    }
    item.specialInstruction = desiredSpecialInstruction;

    return { success: true, itemName: itemName, oldSpecialInstruction: currentSpecialInstruction, currentSpecialInstruction: desiredSpecialInstruction };
  }

  //Overwrite
  removeItem(functionArgs) {

    const itemName = functionArgs['itemName'];
    const specialInstruction = functionArgs['specialInstruction'];

    const idx = this.order.findIndex(i => i['itemName'] === itemName && i['specialInstruction'] === specialInstruction);

    if (idx === -1) {
      return { success: false, itemName: itemName, errorMsg: 'This item does not exist in current order' };
    }

    const itemInfo = this.menu.find(e => e.name.en === (itemNameTranslator[itemName] ? itemNameTranslator[itemName] : itemName));
    if (!itemInfo) {
      return { success: false, itemName: itemName, errorMsg: 'This item does not exist in menu' };
    }

    this.order.splice(idx, 1);

    this.total -= itemInfo['price'];

    return { success: true, removedItemName: itemName, removedItemSpecialInstruction: specialInstruction, removedItemPrice: itemInfo['price'], currentTotal: this.total };

  }

  //Overwrite
  checkPrice(functionArgs) {
    const itemName = functionArgs['itemName'];

    const itemInfo = this.menu.find(i => i['name']['en'] === (itemNameTranslator[itemName] ? itemNameTranslator[itemName] : itemName));
    if (!itemInfo) {
      console.log(`calling checkPrice failed with functionArgs ${JSON.stringify(functionArgs, null, 2)}`);
      return { success: false, itemName: itemName, errorMsg: 'could not find itemName\' price' };
    }
    const result = { success: true, itemName: itemName, price: itemInfo['price'] };
    console.log(result);
    return result;
  }

  //Overwrite
  orderToString() {
    let orderString = '';
    for (const item of this.order) {
      orderString += `- ${item.itemName}${item.specialInstruction ? ' \(' + item.specialInstruction + '\)' : ''}, $${item.price}\n`;
    }
    orderString += `\n Total: $${Number.parseFloat(this.total).toFixed(2)}`;
    return orderString;
  }

}
