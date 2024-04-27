import chalk from 'chalk';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export default class StreamService extends EventEmitter {
  constructor(websocket, logService) {
    super();
    this.ws = websocket;
    this.logService = logService;
    this.streamSid = '';
    this.expectedResponseIndex = -1;
    this.expectedChunkIndex = 0;
    this.audioBufferMap = {};

    this.chunkData = Buffer.alloc(0);
    this.chunkSize = 0;

  }

  setStreamSid(streamSid) {
    this.streamSid = streamSid;
  }



  // audio is a Buffer
  buffer(responseIndex, chunkIndex, audio, icount, final) {
    // console.log(chalk.cyan('resIdx:', responseIndex, 'chunkIndex', chunkIndex, 'icount', icount));
    // console.log(chalk.cyan('expectedResponseIndex:', this.expectedResponseIndex, 'expectedChunkIndex', this.expectedChunkIndex));

    // If it's the intro message, send it immediately
    if (responseIndex === -1) {
      this.sendAudio(audio, responseIndex, chunkIndex, icount, final);
    } else if (responseIndex === this.expectedResponseIndex && chunkIndex === this.expectedChunkIndex) {
      this.sendAudio(audio, responseIndex, chunkIndex, icount, final);
      this.expectedChunkIndex++;
    } else {
      // If it's not the expected chunk, store it for later
      this.audioBufferMap[responseIndex] = this.audioBufferMap[responseIndex] || {};
      this.audioBufferMap[responseIndex][chunkIndex] = audio;
    }

    // Check if we have the next expected chunk in the buffer map
    while (this.audioBufferMap[this.expectedResponseIndex] && this.audioBufferMap[this.expectedResponseIndex][this.expectedChunkIndex]) {
      this.sendAudio(this.audioBufferMap[this.expectedResponseIndex][this.expectedChunkIndex], responseIndex, chunkIndex, icount, final);
      delete this.audioBufferMap[this.expectedResponseIndex][this.expectedChunkIndex];
      this.expectedChunkIndex++;
    }
    // If receive speech end.
    if (final) {
      this.expectedResponseIndex++;
      this.expectedChunkIndex = 0;
    }
  }

  sendAudio(audio, responseIndex, chunkIndex, icount, final) {
    if (audio.length === 0) {
      return;
    }

    if (chunkIndex === 0) {
      this.logService.logStart(icount, 'Twilio', responseIndex);
    }

    this.logService.logStart(icount, 'Twilio', responseIndex, chunkIndex, audio.length);

    this.ws.send(
      JSON.stringify({
        streamSid: this.streamSid,
        event: 'media',
        media: {
          payload: audio.toString('base64'),
        },
      })
    );
    // When the media completes you will receive a `mark` message with the label
    const markLabel = uuidv4();
    this.ws.send(
      JSON.stringify({
        streamSid: this.streamSid,
        event: 'mark',
        mark: {
          name: markLabel,
        },
      })
    );
    this.emit('audiosent', markLabel, responseIndex, chunkIndex, icount, final);
  }
}
