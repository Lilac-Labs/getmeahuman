import { LogService, TextToSpeechService } from '../services/index.js';
import fs from 'fs';
import { v4 } from 'uuid';
import { wait } from '../lib/utils.js';


async function ttsBenchmark() {
  const elevenlabsLog = new LogService(null);
  const elevenlabs = new TextToSpeechService({}, elevenlabsLog);

  const whisperLog = new LogService(null);
  const whisper = new TextToSpeechService({}, whisperLog, 'OPENAI');

  const deepgramLog = new LogService(null);
  const deepgram = new TextToSpeechService({}, deepgramLog, 'DEEPGRAM');

  const elevenlabsStreamLog = new LogService(null);
  const elevenlabsStream = new TextToSpeechService({}, elevenlabsStreamLog, 'ELEVENLABSSTREAM');

  const numIterations = 10;
  const csvData = [];
  const text = 'In the quiet hours of early morning, the world seems to hold its breath, embracing a serene tranquility.The gentle murmur of a distant stream blends with the soft chirping of awakening birds, crafting a symphony of subtle sounds.';

  elevenlabs.on('speech', (responseIndex, chunkIndex, audio, label, icount, final = false) => {
    csvData.push({
      uuid: responseIndex,
      service: 'Elevenlabs',
      size: audio.length,
      latency: elevenlabsLog.latencyTrace[icount]['tts'][responseIndex]['delta'],
      firstArrive: elevenlabsLog.latencyTrace[icount]['tts'][responseIndex]['delta'],
      text: label.length
    });
  });

  whisper.on('speech', (responseIndex, chunkIndex, audio, label, icount, final = false) => {
    csvData.push({
      uuid: responseIndex,
      service: 'Whisper',
      size: audio.length,
      latency: whisperLog.latencyTrace[icount]['tts'][responseIndex]['delta'],
      firstArrive: whisperLog.latencyTrace[icount]['tts'][responseIndex]['delta'],
      text: label.length
    });
  });

  deepgram.on('speech', (responseIndex, chunkIndex, audio, label, icount, final = false) => {
    csvData.push({
      uuid: responseIndex,
      service: 'Deepgram',
      size: audio.length,
      latency: deepgramLog.latencyTrace[icount]['tts'][responseIndex]['delta'],
      firstArrive: deepgramLog.latencyTrace[icount]['tts'][responseIndex]['delta'],
      text: label.length
    });
  });

  elevenlabsStream.on('speech', (responseIndex, chunkIndex, audio, label, icount, final = false) => {


    if (final) {
      csvData.push({
        uuid: responseIndex,
        service: 'Elevenlabs Stream',
        size: 0,
        latency: elevenlabsStreamLog.latencyTrace[icount]['tts'][responseIndex]['delta'],
        firstArrive: elevenlabsStreamLog.latencyTrace[icount]['tts'][responseIndex][0]['delta'],
        text: label.length
      });
    } else {
      csvData.push({
        uuid: responseIndex,
        service: 'Elevenlabs Stream',
        size: audio.length,
        latency: elevenlabsStreamLog.latencyTrace[icount]['tts'][responseIndex][chunkIndex]['delta'],
        firstArrive: elevenlabsStreamLog.latencyTrace[icount]['tts'][responseIndex][chunkIndex]['delta'],
        text: '',
        chunkIndex: chunkIndex,
      });
    }

  });

  for (let i = 0; i < numIterations; i++) {

    let uuid = v4();

    // await elevenlabs.generate({ partialResponseIndex: uuid, partialResponse: text }, i);

    // await whisper.generate({ partialResponseIndex: uuid, partialResponse: text }, i);

    // await elevenlabsStream.generate({ partialResponseIndex: uuid, partialResponse: text }, i);
    await deepgram.generate({ partialResponseIndex: uuid, partialResponse: text }, i);

  }

  // Write csvData to a CSV file
  const csvFilePath = './tts-benchmark.csv';
  const columnNames = ['uuid', 'service', 'size', 'latency', 'firstArrive', 'text', 'chunkIndex'];
  const csvHeader = columnNames.join(',');
  csvData.unshift(columnNames.reduce((obj, name) => ({ ...obj, [name]: name }), {}));

  await wait(3000);

  const csvContent = csvData.map(row => columnNames.map(name => row[name]).join(',')).join('\n');
  // fs.writeFile(csvFilePath, csvHeader + '\n' + csvContent, (err) => {
  //   if (err) {
  //     console.error('Error writing to CSV file:', err);
  //   } else {
  //     console.log('CSV file updated successfully.');
  //   }
  // });


  fs.appendFile(csvFilePath, csvContent, (err) => {
    if (err) {
      console.error('Error writing to CSV file:', err);
    } else {
      console.log('CSV file updated successfully.');
    }
  });

  console.log('TTS audio generation complete.');




}

async function showResult() {
  const csvFilePath = './tts-benchmark.csv';
  const columnNames = ['uuid', 'service', 'size', 'latency', 'firstArrive', 'text', 'chunkIndex'];

  // Read the CSV file
  const csvData = fs.readFileSync(csvFilePath, 'utf-8').split('\n');

  // Remove the header row
  csvData.shift();

  // Calculate the average latency for each service
  const averageLatency = {};
  csvData.forEach(row => {
    const values = row.split(',');
    const service = values[columnNames.indexOf('service')];
    const latency = parseFloat(values[columnNames.indexOf('latency')]);
    const firstArrive = parseFloat(values[columnNames.indexOf('firstArrive')]);
    if (!averageLatency[service]) {
      averageLatency[service] = {
        total: 0,
        count: 0,
        firstArrive: 0
      };
    }
    if (service === 'Elevenlabs Stream') {
      const size = parseFloat(values[columnNames.indexOf('size')]);
      if (size === 0) {
        averageLatency[service].total += latency;
        averageLatency[service].firstArrive += firstArrive;
        averageLatency[service].count++;
      }
    } else {
      averageLatency[service].total += latency;
      averageLatency[service].firstArrive += firstArrive;
      averageLatency[service].count++;
    }


  });

  // Calculate the average latency and display the results
  for (const service in averageLatency) {
    const average = averageLatency[service].total / averageLatency[service].count;
    const firstArrive = averageLatency[service].firstArrive / averageLatency[service].count;
    console.log(`Average latency for ${service}: ${average.toFixed(2)} ms`);
    console.log(`Average firstArrive for ${service}: ${firstArrive.toFixed(2)} ms`);
  }
}


showResult();
// ttsBenchmark();
