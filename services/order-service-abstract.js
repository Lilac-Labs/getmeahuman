import { PutCommand } from '@aws-sdk/lib-dynamodb';

// Abstract OrderService
export default class OrderService {
  constructor() {
    if (new.target === OrderService) {
      throw new TypeError('Cannot construct Abstract instances directly');
    }
    this.order = [];
    this.total = 0;
    this.menu = [];
    this.callerName = '';
  }

  addItem(functionArgs) {
    throw new Error('Method \'addItem()\' must be implemented.');
  }

  modifyItem(functionArgs) {
    throw new Error('Method \'modifyItem()\' must be implemented.');
  }

  removeItem(functionArgs) {
    throw new Error('Method \'removeItem()\' must be implemented.');
  }

  checkPrice(functionArgs) {
    throw new Error('Method \'checkPrice()\' must be implemented.');
  }

  recordCallerName(callerName) {
    this.callerName = callerName;
    return { success: true };
  }

  orderToString() {
    throw new Error('Method \'orderToString()\' must be implemented.');
  }

  async submitOrder(callSid, caller, docClient) {
    const dbCommand = new PutCommand({
      TableName: `lilac-food-orders-${process.env.RESTAURANT}`,
      Item: {
        callSid: callSid,
        timestamp: Math.floor(Date.now() / 1000),
        caller: caller,
        callerName: this.callerName,
        order: JSON.stringify(this.order),
      },
    });

    try {
      await docClient.send(dbCommand);
    } catch (err) {
      console.error(`${callSid}: DB put Error: ${JSON.stringify(err)}`);
    }
  }
}
