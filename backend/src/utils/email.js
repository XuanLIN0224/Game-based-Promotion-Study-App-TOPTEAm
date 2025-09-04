const postmark = require('postmark');

const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY);
const FROM = process.env.EMAIL_FROM;

async function sendResetCodeEmail(to, code) {
  const text = `Your password reset verification code is: ${code}\nThis code expires in 30 minutes.`;
  await client.sendEmail({
    From: FROM,
    To: to,
    Subject: 'Password Reset Verification Code',
    TextBody: text
  });
}

module.exports = { sendResetCodeEmail };