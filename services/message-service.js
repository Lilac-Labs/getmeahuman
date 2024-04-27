import chalk from 'chalk';
import { config } from 'dotenv';
import twilio from 'twilio';
import SlackNotify from 'slack-notify';
import { msgEnabled, restaurantFullNames } from '../lib/system-content.js';
config();
export default class MessageService {
  constructor() {
    this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    this.slack = SlackNotify(process.env.MY_SLACK_WEBHOOK_URL);
  }

  /**
   * Store Audio into a file
   * @param {String} caller caller's number
   * @param {String} order order string form OrderService.orderToString
   * @param {String} callerName caller's name
   */
  sendOrderConfirmation(caller, order, callerName) {
    if (!msgEnabled[process.env.RESTAURANT]) return;
    if (!callerName) return;
    if (['+13319990314'].includes(caller) && process.env.NODE_ENV !== 'production') return;
    const body = `${callerName ? callerName + ', t' : 'T'}hank you for calling ${restaurantFullNames[process.env.RESTAURANT]}. Your order will be ready for pick up shortly. Please call us back if there's a mistake in your order.\n\n` + order;
    this.client.messages
      .create({
        body: body,
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        to: caller,
        from: process.env.FROM_NUMBER
      })
      .then(message => console.log(chalk.cyan(`Sent message to ${caller}`))).catch((err) => {
        console.error(`Failed to send confirmation text, errMsg: ${err}`);
      });
  }

  sendSlackNotification(callSid, caller, callerName, context) {
    if (['+13319990314', '+19495003485'].includes(caller)) return;
    this.slack.send(JSON.stringify({ callSid, caller, callerName, context }, null, 2))
      .then(() => {
        console.log(chalk.cyan(`${callSid}: Notified Slack`));
      }).catch((err) => {
        console.error(`${callSid}: Failed to notified Slack with errorMSg: ${err}`);
      });
  }


}