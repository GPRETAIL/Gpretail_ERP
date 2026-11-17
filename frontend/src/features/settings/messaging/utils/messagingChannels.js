/** Settings > Messaging: the three channels and their fields (secret ones come back masked). */
export const CHANNELS = [
  {
    key: "sms", title: "SMS (MSG91)",
    help: "Needs an MSG91 account with a DLT-approved OTP template. In the template use ##otp##, ##points##, ##amount## and ##store##.",
    fields: [
      { key: "auth_key", label: "MSG91 auth key", secret: true },
      { key: "otp_template_id", label: "OTP template ID (Flow)", help: "From MSG91 > Flows" },
      { key: "sender_id", label: "Sender ID", help: "6 letters, as registered on DLT" },
      { key: "country_code", label: "Country code", help: "Added to 10-digit numbers (default 91)" },
    ],
  },
  {
    key: "whatsapp", title: "WhatsApp (Meta Cloud API)",
    help: "Needs a WhatsApp Business number on Meta Cloud API and an approved Authentication template (code in the body and a copy-code button).",
    fields: [
      { key: "access_token", label: "Access token", secret: true, help: "A permanent system-user token" },
      { key: "phone_number_id", label: "Phone number ID" },
      { key: "otp_template", label: "OTP template name" },
      { key: "language", label: "Template language", help: "For example en or en_US" },
      { key: "country_code", label: "Country code", help: "Added to 10-digit numbers (default 91)" },
    ],
  },
  {
    key: "email", title: "Email",
    help: "OTPs, reminders and scheduled reports (Settings > Scheduler). Leave the SMTP fields empty to use the server's mail account; or enter your own, e.g. your Hostinger mailbox (smtp.hostinger.com, 465, SSL) or Gmail with an app password.",
    fields: [
      { key: "from_name", label: "From name", help: "For example your store name" },
      { key: "reply_to", label: "Reply-to address" },
      { key: "from_address", label: "From address (optional)", help: "Usually the SMTP mailbox itself" },
      { key: "smtp_host", label: "SMTP host (optional)", help: "e.g. smtp.hostinger.com" },
      { key: "smtp_port", label: "SMTP port", help: "465 for SSL, 587 for TLS" },
      { key: "smtp_encryption", label: "Encryption", help: "ssl or tls" },
      { key: "smtp_username", label: "SMTP username", help: "The full mailbox address" },
      { key: "smtp_password", label: "SMTP password", secret: true },
    ],
  },
];

export const messagingErrorMessage = (err) => {
  const data = err?.response?.data;
  return (data?.errors && Object.values(data.errors).flat()[0]) || data?.message || "Something went wrong.";
};
