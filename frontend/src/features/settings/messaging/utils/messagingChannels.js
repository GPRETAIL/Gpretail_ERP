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
    help: "Uses the app's mail server. The customer needs an email address on their record.",
    fields: [
      { key: "from_name", label: "From name", help: "For example your store name" },
      { key: "reply_to", label: "Reply-to address" },
    ],
  },
];

export const messagingErrorMessage = (err) => {
  const data = err?.response?.data;
  return (data?.errors && Object.values(data.errors).flat()[0]) || data?.message || "Something went wrong.";
};
