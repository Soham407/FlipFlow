# 📧 Email Setup Guide

## Email Addresses Used in FlipFlow

Your Contact page references these email addresses. You need to set up email forwarding or create these mailboxes:

### Primary Support Emails
- **support@flipflow.com** - General support (mentioned in Privacy, Terms, Refund, Contact)
- **pro@flipflow.com** - Priority support for Pro users
- **business@flipflow.com** - Business inquiries and partnerships
- **abuse@flipflow.com** - Report content violations

---

## Setup Options

### Option 1: Email Forwarding (Easiest)
If you have a domain, forward all emails to your personal email:

**Example with Namecheap/GoDaddy:**
1. Go to domain email settings
2. Create email forwards:
   - support@flipflow.com → your-email@gmail.com
   - pro@flipflow.com → your-email@gmail.com
   - business@flipflow.com → your-email@gmail.com
   - abuse@flipflow.com → your-email@gmail.com

**Example with Vercel Domains:**
```bash
# In Vercel, go to your domain → Email
# Add email forwards
```

### Option 2: Use Aliases (Free)
Many email providers let you create aliases:

**Gmail:**
- Use `+` tags: youremail+support@gmail.com, youremail+pro@gmail.com
- Or use filters to organize

### Option 3: Professional Email (Recommended)
Use Google Workspace or Zoho Mail for professional email hosting:

**Google Workspace** (~₹125/month):
- support@flipflow.com
- pro@flipflow.com
- business@flipflow.com

**Zoho Mail** (Free for 5 users):
- Create multiple mailboxes
- Professional email management

---

## Temporary Solution

Until you set up proper emails, you can:

1. **Update Contact.tsx** to use your current email for all addresses:
   ```tsx
   href="mailto:your.actual.email@gmail.com"
   ```

2. **Or use a single support email** everywhere:
   ```bash
   # Find and replace in all legal pages
   support@flipflow.com → your.actual.email@gmail.com
   ```

---

## Email Response Templates

### Support Request Template
```
Subject: Re: [User's Subject]

Hi [Name],

Thank you for contacting FlipFlow support.

[Answer to their question]

If you have any other questions, feel free to reply to this email.

Best regards,
FlipFlow Support Team
```

### Refund Request Template
```
Subject: Refund Request Processed

Hi [Name],

Your refund request has been approved and processed.

- Amount: ₹100
- Expected in account: 7-10 business days
- Transaction ID: [ID]

Your account will continue to have Pro access until [end of billing period].

Best regards,
FlipFlow Support Team
```

### Abuse Report Template
```
Subject: Content Report Received

Hi [Name],

Thank you for reporting this content. We take violations seriously.

We will review the reported content within 24 hours and take appropriate action.

Report ID: [ID]

Best regards,
FlipFlow Moderation Team
```

---

## Automation (Advanced)

### Use Zapier/Make.com for:
- Auto-reply to support emails
- Create tickets in a system
- Forward urgent emails to phone (SMS)

### Example Zapier Flow:
1. New email to support@flipflow.com
2. Create ticket in your task manager
3. Send auto-reply: "We received your message and will respond within 24 hours"

---

## Quick Setup (5 minutes)

**For now, do this:**

1. Choose ONE email you'll use for everything
2. Update all references in your code:

```bash
# In VS Code, press Ctrl+Shift+H (Find and Replace in Files)
# Find: support@flipflow.com
# Replace: your.actual.email@gmail.com
# Replace All
```

3. Later, when you have proper email forwarding, change it back

---

**Note:** For Razorpay activation, they will verify that the support email on your website actually works, so make sure it's a real, working email address!
