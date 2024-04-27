import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
config();
let restaurantSystem;

try {
  restaurantSystem = fs.readFileSync(`./lib/${process.env.RESTAURANT}/restaurant-system.txt`, 'utf8');
} catch (err) {
  console.error(err);
}

let system;

try {
  system = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '/system.txt'), 'utf8');
} catch (err) {
  console.error(err);
}

let menuInstructions;
try {
  menuInstructions = fs.readFileSync(`./lib/${process.env.RESTAURANT}/menu-instructions.txt`, 'utf8');
} catch (err) {
  console.error(err);
}

const systemContent = restaurantSystem + ' ' + system + '\n' + menuInstructions;
console.log(systemContent);

const greetingMessages = {
  'papas': 'Hello! This is Papa\'s Kitchen, may I take your order?',
  'amys': 'Welcome to Amy\'s! How may I help you today?',
  'pear': "Hi, I'm your phone agent. How may I help you today?"
};

const restaurantFullNames = {
  'papas': 'Papa\'s Kitchen',
  'amys': 'Amy\'s Drive Thru'
};

const msgEnabled = {
  'papas': true,
  'amys': false
};

const ttsCacheFile = {
  'DEEPGRAM': 'deepgram-asteria',
  'ELEVENLABS': 'elevenlabs',
  'ELEVENLABSSTREAM': 'elevenlabs',
};

export { systemContent, greetingMessages, restaurantFullNames, msgEnabled, ttsCacheFile };
