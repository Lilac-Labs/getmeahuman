import { config } from 'dotenv';
import chalk from 'chalk';
import express from 'express';
import ExpressWs from 'express-ws';

import { GptService, StreamService, TranscriptionService, TextToSpeechService, MessageService, LogService } from './services/index.js';
import { Buffer } from 'node:buffer';
import consoleStamp from 'console-stamp';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { fromEnv } from '@aws-sdk/credential-providers';
import { v4 } from 'uuid';
import { greetingMessages } from './lib/system-content.js';
config();

const { default: OrderService } = await import(`./lib/pear/order-service.js`);

// if --test flag is passed, then use timestamped console logs
if (process.argv.includes('--test')) {
  consoleStamp(console, { pattern: 'HH:MM:ss.l' });
}

// Server Setup: An Express app is created, and WebSocket support is added to it.
// he server listens on a port defined in the environment variables or defaults to 3000.
const app = express();
ExpressWs(app);

const PORT = process.env.PORT || 3000;

// Parse incoming POST params with Express middleware
app.use(express.urlencoded({ extended: false }));

const AWSClient = new DynamoDBClient({ credentials: fromEnv(), region: 'us-west-1' });
const docClient = DynamoDBDocumentClient.from(AWSClient);

/* Webhook Endpoint for Incoming Connections:
An endpoint /incoming is set up to handle POST requests.
When a request is received, it responds with an XML structure
that includes a <Connect> element pointing to a WebSocket URL.
This setup is likely for initiating a stream connection from a service (e.g., Twilio)
that supports real-time audio streaming. */
app.post('/incoming', (req, res) => {  res.status(200);
  res.type('text/xml');
  //TODO use VoiceResponse in 'twilio' lib. https://www.twilio.com/docs/voice/twiml/stream#bi-directional-media-streams
  res.end(`
  <Response>
    <Connect>
      <Stream url="wss://${process.env.SERVER}/connection" >
        <Parameter name="caller" value="${req.body.Caller}" />
      </Stream>
    </Connect>
  </Response>
  `);
});

// import WebSocket from 'ws';
// const clients = new Map();
// function broadcastToUpdates(message) {
//   // clients.forEach(client => {
//   //   if (client.readyState === WebSocket.OPEN) {
//   //     client.send(message);
//   //   }
//   // });
// }

// app.ws('/updates', (ws) => {
//   const uuid = v4();
//   clients.set(uuid, { timestamp: Date.now(), ws });
//   console.log(chalk.redBright('New client connected for updates.', JSON.stringify(ws)));

//   ws.on('close', () => {
//     clients.delete(uuid);
//     console.log(chalk.redBright('Client disconnected.'));
//   });
// });

/* WebSocket Connection Handling:
*/
app.ws('/connection', (ws) => {
  ws.on('error', console.error);
  // Filled in from start message
  let streamSid;
  let callSid;
  let caller;
  let record = Buffer.from('');
  const ttsProvider = 'DEEPGRAM';

  const logService = new LogService(docClient, ttsProvider);
  const orderService = new OrderService();
  const gptService = new GptService(logService, orderService);
  const streamService = new StreamService(ws, logService);
  const transcriptionService = new TranscriptionService();
  const ttsService = new TextToSpeechService({}, logService, ttsProvider);
  const messageService = new MessageService();

  // Marks are used to track audio segments
  let marks = [];

  let interactionCount = 1;

  /* Handling 'message' -  Incoming from MediaStream Service (Twilio)
  The server listens for various events from the WebSocket connection:
  - start: Initializes services and sends a greeting using the text-to-speech service.
  - media: Carries audio data, which is sent to the transcription service.
  - mark: Tracks audio segments.
  - stop: Indicates the end of the stream.
  */
  ws.on('message', function message(data) {
    const msg = JSON.parse(data);
    if (msg.event === 'start') { // Upon receiving a start message, it initializes services and sends a greeting using the text-to-speech service.
      streamSid = msg.start.streamSid;
      callSid = msg.start.callSid;
      caller = msg.start.customParameters.caller;

      streamService.setStreamSid(streamSid);
      gptService.setCallSid(callSid);
      transcriptionService.setCallSid(callSid);
      logService.setCallSid(callSid);

      console.log(chalk.red.underline(`${callSid}: Twilio -> Starting Media Stream for ${streamSid}`));

      ttsService.loadCached({ partialResponseIndex: -1, partialResponse: greetingMessages[process.env.RESTAURANT], cachedFilename: 'greeting' }, 0);

    } else if (msg.event === 'media') { // Media events carries audio data, which is sent to the transcription service.
      transcriptionService.send(msg.media.payload);
      record = Buffer.concat([record, Buffer.from(msg.media.payload, 'base64')]);

    } else if (msg.event === 'mark') { // Marks when the audio segment is completed.
      const label = msg.mark.name;

      const mark = marks.find(m => m.markLabel === msg.mark.name);

      console.log(chalk.red(`${callSid}: Interaction ${mark.icount} Twilio -> Audio completed mark (${msg.sequenceNumber}): responseIndex: ${mark.responseIndex} chunkIndex: ${mark.chunkIndex}`));

      logService.logEnd(mark.icount, 'Twilio', mark.responseIndex, mark.chunkIndex);

      if (mark.final) {
        logService.logEnd(mark.icount, 'Twilio', mark.responseIndex);
      }
      marks = marks.filter(m => m.markLabel !== msg.mark.name);


    } else if (msg.event === 'stop') { // Stop event indicates the end of the stream. Customer has hung up.
      console.log(chalk.red.underline(`${callSid}: Twilio -> Media stream ${streamSid} ended.`));
      console.log(`${callSid}: ${chalk.cyan(JSON.stringify(logService.latencyTrace))}`);

      transcriptionService.deepgramLive.finish();

      // orderService.submitOrder(callSid, caller, docClient);
      messageService.sendOrderConfirmation(caller, orderService.orderToString(), orderService.callerName);
      // store the transcript to DB when the call ends.
      logService.addToTable(callSid, caller, orderService.callerName, gptService.userContext, record);
      messageService.sendSlackNotification(callSid, caller, orderService.callerName, gptService.userContext);

      if (process.env.NODE_ENV === 'production') {

      }

    }
  });

  /* Handling 'utterance' - Incoming from Transcription Service
  */
  transcriptionService.on('utterance', async (text) => {
    // This is a bit of a hack to filter out empty utterances
    if (marks.length > 0 && text?.length > 5) {
      console.log(chalk.red(`${callSid}: Twilio -> Interruption, Clearing stream`));
      ws.send(
        JSON.stringify({
          streamSid,
          event: 'clear',
        })
      );
    }
  });

  /* Handling 'transcription' - Incoming from Transcription Service
  */
  transcriptionService.on('transcription', async (text) => {
    if (!text) { return; }
    console.log(chalk.yellow(`${callSid}: Interaction ${interactionCount} – STT -> GPT: ${text}`));
    gptService.completion(text, interactionCount);
  });

  /* Handling 'gptreply' - Incoming from GPT Service
  */
  gptService.on('gptreply', async (gptReply, icount) => {
    console.log(chalk.green(`${callSid}: Interaction ${icount}: GPT -> TTS: ${gptReply.partialResponse}`));
    if (gptReply.cachedFilename) {
      ttsService.loadCached(gptReply, icount);
    } else {
      ttsService.generate(gptReply, icount);
    }
    interactionCount += 1;
  });

  // gptService.on('fn', async () => {
  //   broadcastToUpdates(JSON.stringify({ order: orderService.order, total: orderService.total }));
  // });

  /* Handling 'speech' - Incoming from Text-to-Speech Service
  */
  ttsService.on('speech', (responseIndex, chunkIndex, audio, label, icount, final = false) => {
    console.log(chalk.blue(`${callSid}: Interaction ${icount} - TTS -> TWILIO: , chunk: ${chunkIndex} responseIndex ${responseIndex}, final: ${final}: ${label}`));
    streamService.buffer(responseIndex, chunkIndex, audio, icount, final);
    record = Buffer.concat([record, audio]);


  });

  /* Handling 'audiosent' - Incoming from Stream Service
  */
  streamService.on('audiosent', (markLabel, responseIndex, chunkIndex, icount, final) => {
    marks.push({ markLabel, responseIndex, chunkIndex, icount, final });
  });
});

app.listen(PORT);
console.log(`Server running on port ${PORT}`);
