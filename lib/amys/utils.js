import fs from 'fs';
import path from 'node:path';

async function getAllAmysItemNames() {
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const menu = JSON.parse(fs.readFileSync(path.join(__dirname, './menu.json')));
  return menu.map(i => {
    return i['itemName'];
  });
}


async function storeAllAmysItemNames() {
  const itemNames = await getAllAmysItemNames();
  const data = JSON.stringify(itemNames, null, 2);
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  // Write the string to a file
  fs.writeFile(path.join(__dirname, './all-items.json'), data, (err) => {
    if (err) {
      console.error('An error occurred:', err);
      return;
    }
    console.log('File has been saved!');
  });
}



export { getAllAmysItemNames, storeAllAmysItemNames };