import chalk from 'chalk';
import { EventEmitter } from 'events';
import { OpenAI } from 'openai';
import { greetingMessages, systemContent } from '../lib/system-content.js';
import { currentPSTHour } from '../lib/utils.js';
import * as availableFunctions from '../functions/index.js';
const { tools } = await import(`../lib/${process.env.RESTAURANT}/function-manifest.js`);



export default class GptService extends EventEmitter {
  constructor(logService, orderService) {
    super();
    this.logService = logService;
    this.order = orderService;
    this.openai = new OpenAI();
    this.userContext = [{ 'role': 'system', 'content': systemContent }, {
      'role': 'system', 'content': JSON.stringify({ 'lunch special available': currentPSTHour() > 11 && currentPSTHour < 16 })
    }, { 'role': 'assistant', 'content': greetingMessages[process.env.RESTAURANT] }];
    this.partialResponseIndex = 0;
    this.callSid;

    this.functionCalls = [];
    this.acknowledged = false;
  }

  // Add the callSid to the chat context in case
  // ChatGPT decides to transfer the call.
  setCallSid(callSid) {
    this.callSid = callSid;
    this.userContext.push({ 'role': 'system', 'content': `callSid: ${callSid}` });
  }

  validateFunctionArgs(args) {
    try {
      return JSON.parse(args);
    } catch (error) {
      console.log('Warning: Double function arguments returned by OpenAI:', args);
      // Seeing an error where sometimes we have two sets of args
      if (args.indexOf('{') != args.lastIndexOf('{')) {
        return JSON.parse(args.substring(args.indexOf(''), args.indexOf('}') + 1));
      }
    }
  }

  updateUserContext(name, role, text, id) {
    // only function context has 'name'
    if (name) {
      this.userContext.push({ 'role': role, 'name': name, 'content': text, 'tool_call_id': id });
    } else {
      this.userContext.push({ 'role': role, 'content': text });
    }
  }

  collectToolInformation(deltas, icount) {
    const idx = deltas.tool_calls[0].index;
    const id = deltas.tool_calls[0].id;
    const name = deltas.tool_calls[0]?.function?.name || '';

    if (name != '') {
      // functionName = name;
      this.functionCalls.push({ id: id, functionName: name, functionArgs: '' });
      if (!this.acknowledged) {
        this.acknowledged = true;

        let say = '';
        // functionName or general
        let cachedFilename;

        say = 'Got it, one moment please!';
        cachedFilename = 'general';

        // if (functionCalls.length > 1) {
        //   say = 'Got it, one moment please!';
        //   cachedFilename = 'general';

        // } else {
        //   // Say a pre-configured message from the function manifest
        //   // before running the function.
        //   const toolData = tools.find(tool => tool.function.name === functionCalls[0].functionName);
        //   say = toolData.function.say;
        //   cachedFilename = toolData.function.name;
        // }

        this.emit('gptreply', {
          partialResponseIndex: this.partialResponseIndex,
          partialResponse: say,
          cachedFilename: cachedFilename
        }, icount);

        // add the default response to the context
        this.updateUserContext(null, 'assistant', say, null);

        this.logService.logAcknowledged(icount, this.partialResponseIndex);

      }
    }
    const args = deltas.tool_calls[0]?.function?.arguments || '';
    if (args != '') {
      // args are streamed as JSON string so we need to concatenate all chunks
      // functionArgs += args;
      this.functionCalls[idx].functionArgs += args;
    }
  }

  async completion(text, interactionCount, role = 'user') {
    // console.log(JSON.stringify(this.userContext));
    // track when completion starts
    this.logService.logStart(interactionCount, 'completion', this.partialResponseIndex);

    if (role === 'user') {
      this.updateUserContext(null, role, text, null);
    }

    // console.log(JSON.stringify(this.userContext, null, 2));
    // Step 1: Send user transcription to Chat GPT

    const stream = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: this.userContext,
      tools: role === 'user' ? tools : null,
      stream: true,
    });

    let completeResponse = '';
    let partialResponse = '';

    let finishReason = '';



    for await (const chunk of stream) {
      // console.log(`chunk: ${JSON.stringify(chunk.choices[0], null, 2)}`.red);
      let content = chunk.choices[0]?.delta?.content || '';
      let deltas = chunk.choices[0].delta;
      finishReason = chunk.choices[0].finish_reason;

      // Step 2: check if GPT wanted to call a function
      if (deltas.tool_calls) {
        // Step 3: Collect the tokens containing function data
        this.collectToolInformation(deltas, interactionCount);
      }

      // need to call function on behalf of Chat GPT with the arguments it parsed from the conversation
      if (finishReason === 'tool_calls') {
        // console.log(`functionCalls: ${JSON.stringify(functionCalls, null, 4)}`.red);
        // parse JSON string of args into JSON object

        for await (const call of this.functionCalls) {
          this.logService.logFunctionCallStart(interactionCount, call.id, call.functionName);
          const functionToCall = availableFunctions[call.functionName];
          const validatedArgs = this.validateFunctionArgs(call.functionArgs);

          let functionResponse = await functionToCall(this.order, validatedArgs);

          console.log(chalk.cyan(`${this.callSid}: Toolcall: ${JSON.stringify(call, null, 2)} with response ${JSON.stringify(functionResponse, null, 2)}`));
          this.emit('fn');

          // Step 4: send the info on the function call and function response to GPT
          this.updateUserContext(call.functionName, 'function', JSON.stringify(functionResponse, null, 2), call.id);
          this.logService.logFunctionCallEnd(interactionCount, call.id, call.functionName);
        }


        this.logService.logEnd(interactionCount, 'completion', this.partialResponseIndex);
        this.partialResponseIndex++;
        this.functionCalls = [];
        this.acknowledged = false;

        // call the completion function again with function responses
        await this.completion('', interactionCount + 1, 'function');
      } else {
        // We use completeResponse for userContext
        completeResponse += content;
        // We use partialResponse to provide a chunk for TTS
        partialResponse += content;
        // Emit last partial response and add complete response to userContext
        if (content.trim().slice(-1) === '•' || finishReason === 'stop') {
          const gptReply = {
            partialResponseIndex: this.partialResponseIndex,
            partialResponse: partialResponse.toLowerCase()
          };
          this.emit('gptreply', gptReply, interactionCount);

          this.logService.logEnd(interactionCount, 'completion', this.partialResponseIndex);


          this.partialResponseIndex++;
          this.logService.logStart(interactionCount, 'completion', this.partialResponseIndex);

          partialResponse = '';

        }
      }
    }
    if (finishReason === 'stop') {
      this.userContext.push({ 'role': 'assistant', 'content': completeResponse });
    }

    console.log(chalk.green(`${this.callSid}: GPT -> Interaction: ${interactionCount}, user context length: ${this.userContext.length}`));

  }
  // async completion(text, interactionCount, role = 'user') {
  //   this.emit('gptreply', {
  //     partialResponseIndex: this.partialResponseIndex,
  //     partialResponse: 'Got it, one moment please!',
  //     cachedFilename: 'general'
  //   }, interactionCount);
  // }
}

// module.exports = { GptService };