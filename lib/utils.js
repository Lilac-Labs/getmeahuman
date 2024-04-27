import fs from 'fs';
import { Buffer } from 'node:buffer';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';


function loadMenu(restaurant) {

  // The path to your file
  const filePath = path.join(`./lib/${restaurant}/menu.json`);

  try {
    // Synchronously read the file
    const data = fs.readFileSync(filePath, 'utf8');

    // Parse the JSON string to an array of objects
    const menu = JSON.parse(data);

    return menu;
  } catch (err) {
    console.error('An error occurred:', err);
  }
}

function currentPSTHour() {
  return Number((new Date()).toLocaleString('en-US', {
    hour: '2-digit',
    hour12: false,
    timeZone: 'America/Los_Angeles'
  }));
}

function wait(milliseconds) {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}
/**
 * Store Audio into a file
 * @param {String} callSid 
 * @param {String} audio A base64 MULAW/8000 audio stream
 */
function storeAudio(callSid, audio) {


  // Decode the Base64 string to binary data
  const audioBuffer = Buffer.from(audio, 'base64');

  // Path to the output file
  const outputPath = `./${callSid}.pcm`; // Use .wav or other formats as needed

  // Write the decoded audio data to a file
  fs.appendFile(outputPath, audioBuffer, (err) => {
    if (err) {
      console.error('Error writing the file:', err);
    } else {
      console.log('File has been saved:', outputPath);
    }
  });

}

/**
 * Store Audio into a file
 * @param {String} callSid 
 * @param {Buffer} audio A base64 MULAW/8000 audio stream
 */
function storeAudioBuffer(callSid, buffer) {
  // Path to the output file
  const outputPath = `./${callSid}.pcm`; // Use .wav or other formats as needed

  // Write the decoded audio data to a file
  fs.appendFile(outputPath, buffer, (err) => {
    if (err) {
      console.error('Error writing the file:', err);
    } else {
      console.log('File has been saved:', outputPath);
    }
  });

}

function wavToUlaw8000(wavAudio) {
  return ffmpeg(wavAudio).audioCodec('pcm_mulaw').audioFrequency(8000).format('mulaw').on('data', (chunk) => {
    console.log(chunk);

  }).on('end', () => {
    console.log('end');
  });
}

// helper function to convert stream to audio buffer for DEEPGRAM TTS output
const getAudioBuffer = async (response) => {
  const reader = response.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
  }

  const dataArray = chunks.reduce(
    (acc, chunk) => Uint8Array.from([...acc, ...chunk]),
    new Uint8Array(0)
  );

  return Buffer.from(dataArray.buffer);
};

export { loadMenu, wait, currentPSTHour, storeAudio, storeAudioBuffer, wavToUlaw8000, getAudioBuffer };