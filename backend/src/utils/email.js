/**
 * Handles email delivery for password reset verification via Postmark.
 *
 * Uses the Postmark API client to send transactional emails.
 * Reads sender and API credentials from environment variables:
 *   - POSTMARK_API_KEY
 *   - EMAIL_FROM
 * sendResetCodeEmail(to, code)
 *   -- Sends a 6-digit password reset code to the specified email.
 *   -- Includes expiry information (30-minute validity) in the message body.
 */

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