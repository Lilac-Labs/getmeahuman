import { config } from 'dotenv';
import twilio from 'twilio';
config();

export default async function transferCall(_, callSid) {

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = twilio(accountSid, authToken);

  const response = new twilio.twiml.VoiceResponse();
  const dial = response.dial();
  dial.number('+17144255363');
  dial.conference('test');

  // wait 5 seconds for GPT to respond (Hack version)
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // transfer the call to the transfer number
  return await client.calls(callSid['callSid'])
    .update({ twiml: response.toString() })
    .then(() => {
      return { success: true, transferredTo: process.env.TRANSFER_NUMBER, message: 'The call was transferred successfully, say goodbye to the customer.' };
    })
    .catch((e) => { // catch and print the error
      console.error(`${callSid}: transferCall ERROR: ${e}`);
      return { success: false, message: 'The call was not transferred successfully, advise customer to call back later.', errorMsg: JSON.stringify(e, null, 2) };
    });
};