import placeOrder from '../functions/placeOrder.js';

test('Expect placeOrder to return an object with a price and order number', () => {
  // console.log(placeOrder({model: 'airpods pro', quantity: 10}));
  const promise = placeOrder({ model: 'airpods pro', quantity: 10 });
  promise.then(result => {
    // console.log(result);
    const order = JSON.parse(result);
    expect(order).toHaveProperty('orderNumber');
    expect(order).toHaveProperty('price');
  });
});