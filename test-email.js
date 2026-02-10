require('dotenv').config();
const { sendOtpEmail } = require('./src/utils/email');

async function testEmail() {
  try {
    console.log('Testing email send...');
    const result = await sendOtpEmail('surajsharma424255@gmail.com', '123456');
    console.log('Email sent successfully:', result);
  } catch (error) {
    console.error('Email send failed:', error.message);
    console.error('Full error:', error);
  }
}

testEmail();
