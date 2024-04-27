import { checkPrice } from '../functions/index.js';

test('Expect Airpods Pro to cost $249', () => {

  const promise = checkPrice({ model: 'airpods pro' });
  promise.then(result => {
    expect(result).toBe('{"price":249}');
  });


});

test('Expect Airpods Max to cost $549', () => {
  const promise = checkPrice({ model: 'airpods max' });
  promise.then(result => {
    expect(result).toBe('{"price":549}');
  });
});

test('Expect all other models to cost $149', () => {
  const promise = checkPrice({ model: 'anything' });
  promise.then(result => {
    expect(result).toBe('{"price":149}');
  });
});