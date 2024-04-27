import checkInventory from '../functions/checkInventory.js';

test('Expect Airpods Pro to have 10 units', () => {
  checkInventory({ model: 'airpods pro' }).then(result => {
    expect(result).toBe('{"stock":10}');
  });
});

test('Expect Airpods Max to have 0 units', () => {
  checkInventory({ model: 'airpods max' }).then(result => {
    expect(result).toBe('{"stock":0}');
  });
});

test('Expect all other values to have 100 units', () => {
  checkInventory({ model: 'anything' }).then(result => {
    expect(result).toBe('{"stock":100}');
  });
});