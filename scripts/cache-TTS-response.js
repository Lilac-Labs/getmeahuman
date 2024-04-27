import { TextToSpeechService, LogService } from '../services/index.js';
import fs from 'fs';
import { config } from 'dotenv';
import { tools } from '../lib/amys/function-manifest.js';
import { greetingMessages } from '../lib/system-content.js';
config();


async function cacheTTSResponse() {
  const logService = new LogService(null, 'DEEPGRAM');
  const ttsService = new TextToSpeechService({}, logService, 'DEEPGRAM');

  // tools.forEach((t) => {
  //   ttsService.generate({ partialResponseIndex: t.function.name, partialResponse: t.function.say }, 1);
  // });

  // ttsService.generate({ partialResponseIndex: 'general', partialResponse: 'Got it, one moment please!' }, 1);
  ttsService.generate({ partialResponseIndex: 'greeting', partialResponse: greetingMessages['amys'] }, 1);
  // ttsService.generateBuffer('Got it!', 'recordCallerName');
  ttsService.on('speech', (responseIndex, chunkIndex, audio, label, icount, final = false) => {
    fs.writeFileSync(`./lib/amys/audios/deepgram-asteria/${responseIndex}.mp3`, audio.toString('base64'), { encoding: 'base64' });
    console.log(`Saved ${label}`);
  });
}

cacheTTSResponse();
