import OrderService from '../../services/order-service-abstract.js';
import { loadMenu } from '../utils.js';

export default class PapasOrderService extends OrderService {

  constructor() {
    super();
    this.menu = loadMenu('amys');
  }

  //Overwrite
  addItem(functionArgs) {

    const itemName = functionArgs['itemName'];
    const dietOption = functionArgs['dietOption'];

    const itemInfo = this.menu.find(e => e.itemName === itemName);
    if (!itemInfo) {
      return { success: false, errorMsg: 'Item does not exist' };
    }
    const price = Number(itemInfo['price']);
    this.order.push({ 'itemName': itemName, 'dietOption': dietOption, 'price': price });
    this.total += price;

    return { success: true, addedItemName: itemName, addedItemDietOption: dietOption, itemPrice: itemInfo['price'], currentTotal: this.total };
  }

  //Overwrite
  modifyItem(functionArgs) {

    const itemName = functionArgs['itemName'];
    const currentDietOption = functionArgs['currentDietOption'];
    const desiredDietOption = functionArgs['desiredDietOption'];

    // const itemInfo = this.menu.find(e => e.name.en === itemName);
    const item = this.order.find(i => i['itemName'] === itemName && i['dietOption'] === currentDietOption);
    if (!item) {
      return { success: true, itemName: itemName, errorMsg: 'This item does not exist in current order' };
    }
    item.dietOption = desiredDietOption;

    return { success: true, itemName: itemName, oldDietOption: currentDietOption, currentDietOption: desiredDietOption, currentOrder: JSON.stringify(this.order) };
  }

  //Overwrite
  removeItem(functionArgs) {

    const itemName = functionArgs['itemName'];
    const dietOption = functionArgs['dietOption'];

    const idx = this.order.findIndex(i => i['itemName'] === itemName && i['dietOption'] === dietOption);

    if (idx === -1) {
      return { success: false, itemName: itemName, errorMsg: 'This item does not exist in current order' };
    }

    const itemInfo = this.menu.find(e => e.itemName === itemName);
    if (!itemInfo) {
      return { success: false, itemName: itemName, errorMsg: 'This item does not exist in menu' };
    }

    this.order.splice(idx, 1);

    this.total -= itemInfo['price'];

    return { success: true, removedItemName: itemName, removedItemDietOption: dietOption, removedItemPrice: itemInfo['price'], currentTotal: this.total };

  }

  //Overwrite
  checkPrice(functionArgs) {
    const itemName = functionArgs['itemName'];

    const itemInfo = this.menu.find(i => i[itemName] === itemName);
    if (!itemInfo) {
      console.log(`calling checkPrice failed with functionArgs ${JSON.stringify(functionArgs, null, 2)}`);
      return { success: false, itemName: itemName, errorMsg: 'could not find itemName\' price' };
    }
    const result = { success: true, itemName: itemName, price: itemInfo['price'] };
    return result;
  }

  //Overwrite
  orderToString() {
    let orderString = '';
    for (const item of this.order) {
      orderString += `- ${item.itemName}${item.specialInstruction ? ' \(' + item.specialInstruction + '\)' : ''}, $${Number.parseFloat(item.price).toFixed(2)}\n`;
    }
    orderString += `\n Total: $${this.total}`;
    return orderString;
  }

}
