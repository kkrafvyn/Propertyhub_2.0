/**
 * Email Configuration & Testing Guide
 * 
 * BaytMiftah uses Nodemailer with Gmail SMTP for transactional emails.
 */

// ========== GMAIL SETUP ==========

/*
1. Enable 2-Factor Authentication on Gmail:
   - Go to myaccount.google.com/security
   - Enable 2-Step Verification

2. Create App Password:
   - Visit myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer" (or your OS)
   - Copy the generated password (16 characters)
   - This is your SMTP_PASS in .env

3. Set .env variables:
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   FROM_EMAIL=your-email@gmail.com
*/

// ========== EMAIL TYPES ==========

/**
 * 1. INVITATION EMAIL
 * Sent when: Team member invited to agency
 * Recipient: New team member
 * Includes: Agency name, acceptance link, role
 */

/**
 * 2. DEVICE ALERT EMAIL
 * Sent when: Smart device triggers critical alert
 * Recipient: Property owner
 * Includes: Device name, alert message, status link
 */

/**
 * 3. AGENCY VERIFICATION EMAIL
 * Sent when: Admin approves/rejects agency
 * Recipient: Agency owner
 * Includes: Status, rejection reason (if rejected), next steps
 */

/**
 * 4. WEEKLY REPORT EMAIL
 * Sent when: Weekly cron job runs (optional)
 * Recipient: Agency managers
 * Includes: Leads, listings, sales, conversion rate
 */

// ========== TESTING EMAILS LOCALLY ==========

/*
Option 1: Use Mailtrap (recommended for development)
- Sign up at mailtrap.io
- Get SMTP credentials
- Emails captured in UI, no actual sending

Option 2: Use EtherealEmail
- Sign up at etherealmail.com
- Get SMTP credentials
- Emails captured, preview links provided

Option 3: Use MailHog (local)
- Run locally: docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog
- SMTP: localhost:1025
- Web UI: http://localhost:8025
*/

// ========== IMPLEMENTATION EXAMPLE ==========

/*
import { sendInvitationEmail } from './services/email.service'

// Send invitation when adding team member
await sendInvitationEmail(
  'newmember@example.com',
  'Sunset Realty Agency',
  `${process.env.FRONTEND_URL}/agency/accept-invite?token=xyz123`
)
*/

// ========== EMAIL VERIFICATION IN PRODUCTION ==========

/*
Recommended email service providers:

1. SendGrid
   - Best for volume (reliable, high deliverability)
   - 100 emails/day free tier
   - nodemailer compatible

2. Mailgun
   - Great for developers
   - Free tier available
   - Strong API

3. AWS SES
   - Enterprise solution
   - Pay-per-email
   - High deliverability

4. Twilio SendGrid
   - Owned by Twilio
   - Integration with other services
*/

// ========== SWITCH TO SENDGRID EXAMPLE ==========

/*
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

export const sendEmail = async (to, subject, htmlContent) => {
  const msg = {
    to,
    from: process.env.FROM_EMAIL,
    subject,
    html: htmlContent,
  }
  
  await sgMail.send(msg)
}
*/

// ========== RATE LIMITING ==========

/*
Prevent email spam with Bull job queue:
- Queue emails in Redis
- Process with rate limiting
- Retry on failure
*/

export default {}
