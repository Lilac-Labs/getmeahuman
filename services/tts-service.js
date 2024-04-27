import { EventEmitter } from 'events';
import { Buffer } from 'node:buffer';
import fetch from 'node-fetch';
import fs from 'fs';
import { getAudioBuffer, wait } from '../lib/utils.js';
import OpenAI from 'openai';
import chalk from 'chalk';
import axios from 'axios';
import { createClient } from '@deepgram/sdk';
import { ttsCacheFile } from '../lib/system-content.js';

export default class TextToSpeechService extends EventEmitter {
  constructor(config, logService, provider = 'ELEVENLABS') {
    super();
    this.config = config;
    this.logService = logService;
    this.config.voiceId ||= process.env.VOICE_ID;
    this.nextExpectedIndex = 0;
    this.speechBuffer = {};
    this.openAIClient;
    this.deepgramClient;
    this.setProvider(provider);
    this.chunkThreshold = 10000;
    this.maxRetries = 3;
  }

  setProvider(provider) {
    if (provider === 'OPENAI') {
      this.openAIClient = new OpenAI();
    }
    if (provider === 'DEEPGRAM') {
      this.deepgramClient = createClient(process.env.DEEPGRAM_API_KEY);
    }

    this.provider = provider;
  }

  async generate(gptReply, interactionCount) {
    const { partialResponseIndex, partialResponse } = gptReply;

    if (!partialResponse) { return; }
    const outputFormat = 'ulaw_8000';

    try {
      let response;
      let audioArrayBuffer;
      let chunkIndex = 0;
      let chunkData = Buffer.alloc(0);
      let chunkSize = 0;

      // track timestamp when ttsStream starts
      this.logService.logStart(interactionCount, 'tts', partialResponseIndex);

      switch (this.provider) {
        case 'ELEVENLABSSTREAM':
          //track when chunks arrives
          this.logService.logStart(interactionCount, 'tts', partialResponseIndex, chunkIndex);

          axios.post(`https://api.elevenlabs.io/v1/text-to-speech/${this.config.voiceId}/stream?output_format=${outputFormat}&optimize_streaming_latency=3`, {
            model_id: process.env.XI_MODEL_ID,
            text: partialResponse,
          }, {
            headers: {
              'xi-api-key': process.env.XI_API_KEY,
              'Content-Type': 'application/json',
              'Accept': 'audio/wav'
            },
            responseType: 'stream'
          }).then(response => {
            response.data.on('data', (c) => {
              const buffer = Buffer.from(c, 'base64');

              chunkData = Buffer.concat([chunkData, buffer]);
              chunkSize += buffer.length;

              if (chunkSize >= this.chunkThreshold) {
                // let base64String = buffer.toString('base64');
                this.logService.logEnd(interactionCount, 'tts', partialResponseIndex, chunkIndex, chunkSize);
                this.emit('speech', partialResponseIndex, chunkIndex, chunkData, partialResponse, interactionCount);
                chunkData = Buffer.alloc(0);
                chunkSize = 0;
                chunkIndex++;
                this.logService.logStart(interactionCount, 'tts', partialResponseIndex, chunkIndex);
              }
            });
            response.data.on('end', () => {
              // if (chunkSize > 0) {

              // }
              this.logService.logEnd(interactionCount, 'tts', partialResponseIndex, chunkIndex, chunkSize);
              this.logService.logEnd(interactionCount, 'tts', partialResponseIndex);
              this.emit('speech', partialResponseIndex, chunkIndex, chunkData, partialResponse, interactionCount, true);

            });
          }).catch(error => {
            console.error('Error with stream handling:', error);
          });


          break;
        // TODO: this doesn't work rn
        case 'OPENAI':
          response = await this.openAIClient.audio.speech.create({
            model: 'tts-1',
            voice: 'alloy',
            input: partialResponse,
            outputFormat: 'WAV'
          });
          // audioArrayBuffer = wavToUlaw8000(response);
          audioArrayBuffer = await response.arrayBuffer();
          this.logService.logEnd(interactionCount, 'tts', partialResponseIndex);
          this.emit('speech', partialResponseIndex, 0, Buffer.from(audioArrayBuffer), partialResponse, interactionCount, true);
          break;

        case 'DEEPGRAM':
          let retryCount = 0;
          while (retryCount < this.maxRetries) {
            try {
              response = await this.deepgramClient.speak.request(
                { text: partialResponse },
                {
                  model: 'aura-asteria-en',
                  encoding: 'mulaw',
                  container: 'none',
                  sample_rate: 8000,
                }
              );
              let audioBuffer = await getAudioBuffer(await response.getStream());

              this.logService.logEnd(interactionCount, 'tts', partialResponseIndex);
              this.emit('speech', partialResponseIndex, 0, audioBuffer, partialResponse, interactionCount, true);
              break;
            } catch (err) {
              console.error(chalk.blue(`Error occurred in TextToSpeech service, DEEPGRAM. retryCount: ${retryCount} partialResponse: ${partialResponse}, partialResponseIndex: ${partialResponseIndex} ErrorMSG: ${err}`));
              retryCount++;
            }
          }



          break;

        default:
          response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${this.config.voiceId}/stream?output_format=${outputFormat}&optimize_streaming_latency=3`,
            {
              method: 'POST',
              headers: {
                'xi-api-key': process.env.XI_API_KEY,
                'Content-Type': 'application/json',
                accept: 'audio/wav',
              },
              // TODO: Pull more config? https://docs.elevenlabs.io/api-reference/text-to-speech-stream
              body: JSON.stringify({
                model_id: process.env.XI_MODEL_ID,
                text: partialResponse,
              }),
            }
          );
          audioArrayBuffer = await response.arrayBuffer();
          this.logService.logEnd(interactionCount, 'tts', partialResponseIndex);
          this.emit('speech', partialResponseIndex, 0, Buffer.from(audioArrayBuffer), partialResponse, interactionCount, true);
      }

      // this.emit('speech', partialResponseIndex, Buffer.from(audioArrayBuffer).toString('base64'), partialResponse, interactionCount);
      // track timestamp when tts ends

    } catch (err) {
      console.error('Error occurred in TextToSpeech service');
      console.error(err);
    }
  }

  async loadCached(gptReply, interactionCount) {
    const { partialResponseIndex, partialResponse, cachedFilename } = gptReply;
    // track timestamp when tts starts
    this.logService.logStart(interactionCount, 'ttsCache', partialResponseIndex);


    try {
      const audio = fs.readFileSync(`./lib/${process.env.RESTAURANT}/audios/${ttsCacheFile[this.provider]}/${cachedFilename}.mp3`, { encoding: 'base64' }).toString('base64');
      if (cachedFilename === 'greeting') {
        await wait(1000);
      }
      this.emit('speech', partialResponseIndex, 0, Buffer.from(audio, 'base64'), 'cached: ' + partialResponse, interactionCount, true);

      // track timestamp when tts starts
      this.logService.logEnd(interactionCount, 'ttsCache', partialResponseIndex);
    } catch (err) {
      console.error(`Error occurred in TextToSpeech service, loadCached. ErrorMSG: ${err}`);
    }
  }
}

