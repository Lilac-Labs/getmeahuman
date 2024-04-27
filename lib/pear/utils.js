import fs from 'fs';
import { Buffer } from 'node:buffer';
// Preprocess the Papa's Kitchen Menu for the Chatbot
async function getPapaMenu() {
  const response = await fetch(
    'https://order.mealkeyway.com/merchant/312f2b50312f585a6350376533577a463371612b6e673d3d/menu?productLine=ONLINE_ORDER&posPlatform=POS',
    {
      method: 'GET',
    }
  ).then((res) => res.json());
  let menu = [];
  // const category = {};

  response['menuCategories'].forEach((c) => {
    // const saleItems = [];
    // category['name'] = c['name'];
    c['saleItems'].forEach((s) => {
      const item = {};
      item['hiddenItem'] = s['hiddenItem'];
      item['properties'] = s['properties'];
      item['id'] = s['id'];
      item['name'] = s['name'];
      item['outOfStock'] = s['outOfStock'];
      item['price'] = s['price'];
      item['soldOut'] = s['soldOut'];
      item['itemNumber'] = s['itemNumber'];


      // Flatten different sized meals and override
      if (s.hasOwnProperty('detailPrice')) {
        s['detailPrice']['prices'].forEach((p) => {

          // Deep copy the item object
          let itemCopy = JSON.parse(JSON.stringify(item));

          // Add the size to the item name
          itemCopy['name']['en'] = itemCopy['name']['en'] + ' ' + p['size']['en'];
          itemCopy['name']['zh-cn'] = itemCopy['name']['zh-cn'] + ' ' + p['size']['zh-cn'];

          // Add the price to the item
          itemCopy['price'] = p['price'];
          menu.push(itemCopy);
        }
        );
      } else {
        menu.push(item);
      }

    });
  });
  // console.log(JSON.stringify(menu, null, 4));
  return menu;
}

async function getAllPapaItemNames() {
  const menu = await getPapaMenu();
  return menu.map(i => {
    return i['name']['en'];
  });
}

async function getAllPapaItemNumbers() {
  const menu = await getPapaMenu();
  return menu.map(i => {
    return i['itemNumber']['en'];
  });
}

async function storePapaMenu() {
  const menu = await getPapaMenu();
  const data = JSON.stringify(menu, null, 2);
  // Write the string to a file
  fs.writeFile('./lib/papas/papaMenu.json', data, (err) => {
    if (err) {
      console.error('An error occurred:', err);
      return;
    }
    console.log('File has been saved!');
  });
}

async function storeAllPapaItemNames() {
  const itemNames = await getAllPapaItemNames();
  const data = JSON.stringify(itemNames, null, 2);
  // Write the string to a file
  fs.writeFile('./lib/papas/papaItemNames.json', data, (err) => {
    if (err) {
      console.error('An error occurred:', err);
      return;
    }
    console.log('File has been saved!');
  });
}

async function printMenu() {
  const menu = await getPapaMenu();
  console.log(JSON.stringify(menu, null, 4));
}


export { getPapaMenu, getAllPapaItemNames, getAllPapaItemNumbers, storePapaMenu, printMenu, storeAllPapaItemNames };