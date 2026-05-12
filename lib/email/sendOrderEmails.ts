import { Resend } from 'resend';

// هذا السطر يمنع الخطأ إذا كان المفتاح مفقوداً مؤقتاً
const resend = new Resend(process.env.RESEND_API_KEY || 're_123');

export async function sendOrderEmails({ orderId, email }: { orderId: string, email: string }) {
  if (!process.env.RESEND_API_KEY) {
    console.log('Skipping email send: No API Key found');
    return;
  }

  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'تم استلام طلبك بنجاح!',
      html: `<p>شكراً لشرائك. رقم الطلب هو: ${orderId}</p>`
    });
  } catch (error) {
    console.error('Error sending email:', error);
  }
}
