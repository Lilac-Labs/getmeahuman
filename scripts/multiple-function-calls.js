import { GptService } from '../services/gpt-service.js';

async function multipleFunctionCalls() {
  const gptService = new GptService();
  gptService.completion('What is the price for Airpods pro and Airpods Max?', 1);

  gptService.on('gptreply', async (gptReply, icount) => {
    console.log(`Interaction ${icount}: GPT: ${gptReply.partialResponse}`.green);
  });
}

multipleFunctionCalls();