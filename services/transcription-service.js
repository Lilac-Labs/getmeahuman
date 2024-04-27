import chalk from 'chalk';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { Buffer } from 'node:buffer';
import { EventEmitter } from 'events';

export default class TranscriptionService extends EventEmitter {
  constructor() {
    super();
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    this.deepgramLive = deepgram.listen.live({
      encoding: 'mulaw',
      sample_rate: '8000',
      model: 'nova-2',
      punctuate: true,
      interim_results: true,
      endpointing: 600,
      utterance_end_ms: 1500,
      vad_events: true,
      smart_format: true
    });
    this.callSid;

    // Defines finalResult to accumulate the final transcription text and speechFinal as a flag to track if the end of speech has been detected.
    this.finalResult = '';
    this.speechFinal = false; // used to determine if we have seen speech_final=true indicating that deepgram detected a natural pause in the speakers speech. 

    // sometime is_final and speech_final becomes true but lose the text in the previous event
    this.lastText = '';

    this.deepgramLive.on(LiveTranscriptionEvents.Open, () => {

      // if we receive an UtteranceEnd and speech_final has not already happened then we should consider this the end of of the human speech and emit the transcription
      this.deepgramLive.on(LiveTranscriptionEvents.UtteranceEnd, (data) => {
        // console.log(chalk.cyan.underline('Utterance', JSON.stringify(data)));
        if (!this.speechFinal) {
          console.log(chalk.yellow(`${this.callSid}: UtteranceEnd received before speechFinal, emit the text collected so far: ${this.finalResult}`));
          this.emit('transcription', this.finalResult);
          return;
        } else if (!this.finalResult) {
          console.log(chalk.yellow(`${this.callSid}: STT -> Speech was already final when UtteranceEnd received`));
          return;
        }
      });

      this.deepgramLive.on(LiveTranscriptionEvents.Transcript, (data) => {
        // console.log('Transcript', JSON.stringify(data));
        const alternatives = data.channel?.alternatives;
        let text = '';
        if (alternatives) {
          text = alternatives[0]?.transcript;
        }

        // console.log(text, "is_final: ", transcription?.is_final, "speech_final: ", transcription.speech_final);
        // if is_final that means that this chunk of the transcription is accurate and we need to add it to the finalResult 
        if (data.is_final === true && (text.trim().length > 0 || this.lastText)) {
          if (text.trim().length > 0) {
            this.finalResult += ` ${text}`;
          } else {
            this.finalResult += ` ${this.lastText}`;
          }

          // if speech_final and is_final that means this text is accurate and it's a natural pause in the speakers speech. We need to send this to the assistant for processing
          if (data.speech_final === true) {
            this.speechFinal = true; // this will prevent a utterance end which shows up after speechFinal from sending another response
            this.emit('transcription', this.finalResult);
            this.finalResult = '';
            this.lastText = '';
          } else {
            // if we receive a message without speechFinal reset speechFinal to false, this will allow any subsequent utteranceEnd messages to properly indicate the end of a message
            this.speechFinal = false;
          }
        } else {
          this.lastText = text;
          this.emit('utterance', text);
        }
      });

      this.deepgramLive.on(LiveTranscriptionEvents.Error, (error) => {
        console.error(`${this.callSid}: STT -> deepgram error: ${error}`);
      });

      this.deepgramLive.on(LiveTranscriptionEvents.Warning, (warning) => {
        console.warn(`${this.callSid}: STT -> deepgram warning: ${JSON.stringify(warning)}`);
      });

      this.deepgramLive.on(LiveTranscriptionEvents.Metadata, (metadata) => {
        console.info(`${this.callSid}: STT -> deepgram metadata: ${JSON.stringify(metadata)}`);
      });

      this.deepgramLive.on(LiveTranscriptionEvents.Close, () => {
        console.log(chalk.yellow(`${this.callSid}: STT -> Deepgram connection closed`));
      });
    });
  }

  /**
   * Send the payload to Deepgram
   * @param {String} payload A base64 MULAW/8000 audio stream
   */
  send(payload) {
    // TODO: Buffer up the media and then send
    if (this.deepgramLive.getReadyState() === 1) {
      this.deepgramLive.send(Buffer.from(payload, 'base64'));
    }
  }

  setCallSid(callSid) {
    this.callSid = callSid;
  }
}
