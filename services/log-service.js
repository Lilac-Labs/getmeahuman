// const winston = require('winston');
import { config } from 'dotenv';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { fromEnv } from '@aws-sdk/credential-providers';
import chalk from 'chalk';

config();




export default class LogService {
  constructor(docClient, ttsProvider) {
    this.docClient = docClient;
    this.S3Client = new S3Client({ credentials: fromEnv(), region: 'us-west-1' });
    this.latencyTrace = { ttsProvider };
    this.callSid;

    // this.logger = winston.createLogger({
    //   level: 'info',
    //   format: winston.format.json(),
    //   defaultMeta: { service: 'user-service' },
    //   transports: [
    //     //
    //     // - Write all logs with importance level of `error` or less to `error.log`
    //     // - Write all logs with importance level of `info` or less to `combined.log`
    //     //
    //     // new winston.transports.File({ filename: 'error.log', level: 'error' }),
    //     // new winston.transports.File({ filename: 'combined.log' }),
    //     new winston.transports.Console({})
    //   ],
    // });

    // this.logger.info('winston');
  }

  setCallSid(callSid) {
    this.callSid = callSid;
  }

  logFunctionCallStart(interactionCount, id, functionName) {
    if (!this.latencyTrace[interactionCount]['completion']['fnCall']) {
      this.latencyTrace[interactionCount]['completion']['fnCall'] = {};
    }
    this.latencyTrace[interactionCount]['completion']['fnCall'][id] = { functionName: functionName, 'start': Date.now() };
  }


  logFunctionCallEnd(interactionCount, id, functionName) {
    if (!this.latencyTrace[interactionCount]['completion']['fnCall'][id]) {
      console.error(`${this.callSid}: logFunctionCallEnd failed with icount: ${interactionCount}, id: ${id}, functionName: ${functionName}`);
      return;
    }
    this.latencyTrace[interactionCount]['completion']['fnCall'][id]['end'] = Date.now();
    this.latencyTrace[interactionCount]['completion']['fnCall'][id]['delta'] = this.latencyTrace[interactionCount]['completion']['fnCall'][id]['end'] - this.latencyTrace[interactionCount]['completion']['fnCall'][id]['start'];
  }

  logStart(interactionCount, activity, partialIndex, chunkIndex = -1, size = 0) {

    if (!this.latencyTrace[interactionCount]) {
      this.latencyTrace[interactionCount] = {};
    }

    if (!this.latencyTrace[interactionCount][activity]) {
      this.latencyTrace[interactionCount][activity] = {};
    }

    if (chunkIndex > -1) {
      if (!this.latencyTrace[interactionCount][activity][partialIndex]) {
        this.latencyTrace[interactionCount][activity][partialIndex] = {};
      }
      this.latencyTrace[interactionCount][activity][partialIndex][chunkIndex] = { 'start': Date.now(), 'size': size };
    } else {
      this.latencyTrace[interactionCount][activity][partialIndex] = { 'start': Date.now() };
    }
  }

  logEnd(interactionCount, activity, partialIndex, chunkIndex = -1, size = 0) {

    const partialIndexTrace = this.latencyTrace[interactionCount][activity][partialIndex];

    if (!partialIndexTrace) {
      console.error(`${this.callSid}: logEnd failed with icount: ${interactionCount}, activity: ${activity}, partialIndex: ${partialIndex}`);
      return;
    }

    if (chunkIndex === -1) {
      partialIndexTrace['end'] = Date.now();
      partialIndexTrace['delta'] = partialIndexTrace['end'] - partialIndexTrace['start'];
    } else {
      if (!partialIndexTrace[chunkIndex]) {
        console.error(`${this.callSid}: logEnd failed with icount: ${interactionCount}, activity: ${activity}, partialIndex: ${partialIndex}, chunkIndex: ${chunkIndex}`);
        return;
      }
      partialIndexTrace[chunkIndex]['end'] = Date.now();
      partialIndexTrace[chunkIndex]['delta'] = partialIndexTrace[chunkIndex]['end'] - partialIndexTrace[chunkIndex]['start'];
      if (size > 0) {
        partialIndexTrace[chunkIndex]['size'] = size;
      }
    }
  }

  logAcknowledged(interactionCount, responseIndex) {
    if (!this.latencyTrace[interactionCount]['completion'][responseIndex]) {
      console.error(`${this.callSid}: logAcknowledged failed with icount: ${interactionCount}, responseIndex: ${responseIndex}`);
    }

    this.latencyTrace[interactionCount]['completion'][responseIndex]['acknowledged'] = { 'timestamp': Date.now(), 'delta': Date.now() - this.latencyTrace[interactionCount]['completion'][responseIndex]['start'] };
  }

  async addToTable(callSid, caller, callerName, transcript, record) {

    const dbCommand = new PutCommand({
      TableName: 'lilac-call',
      Item: {
        CallSid: callSid,
        timestamp: Math.floor(Date.now() / 1000),
        caller: caller,
        callerName: callerName,
        transcript: JSON.stringify(transcript, null, 2),
        latencyTrace: this.latencyTrace
      },
    });

    try {
      await this.docClient.send(dbCommand);
    } catch (err) {
      console.error(`${callSid}: DB put Error: ${JSON.stringify(err)}`);
    }

  }
}
