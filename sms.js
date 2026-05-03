require("dotenv").config();
const twilio = require("twilio");

function getClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }

  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

async function sendSms(message) {
  const client = getClient();

  if (!client || !process.env.SMS_TO || !process.env.TWILIO_SMS_FROM) {
    console.log("\n--- SMS-Testnachricht ---");
    console.log(message);
    console.log("-------------------------\n");
    return;
  }

  await client.messages.create({
    from: process.env.TWILIO_SMS_FROM,
    to: process.env.SMS_TO,
    body: message
  });
}

module.exports = { sendSms };
