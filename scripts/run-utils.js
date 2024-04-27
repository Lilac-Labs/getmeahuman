import { getTools } from '../lib/function-manifest.js';
import { storeMenu, loadMenu, storeAllPapaItemNames } from '../lib/utils';
import { printMenu } from '../lib/utils';



async function main() {
  // console.log(JSON.stringify(await getTools(), null, 4));
  storeMenu();

  // const menu = loadMenue();
  // console.log(JSON.stringify(menu, null, 4));

  // printMenu();

  storeAllPapaItemNames();
}

main();

