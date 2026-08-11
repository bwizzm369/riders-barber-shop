const { google } = require("googleapis");

function getAuth() {
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  const inlineKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON;

  if (inlineKey) {
    const credentials = JSON.parse(inlineKey);
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
  }

  if (keyFile) {
    return new google.auth.GoogleAuth({
      keyFile,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
  }

  throw new Error(
    "Missing Google credentials: set GOOGLE_SERVICE_ACCOUNT_KEY_PATH (path to the JSON key file) " +
      "or GOOGLE_SERVICE_ACCOUNT_KEY_JSON (the JSON content itself) in .env"
  );
}

async function getCalendarClient() {
  const auth = getAuth();
  const authClient = await auth.getClient();
  return google.calendar({ version: "v3", auth: authClient });
}

/** "Coiffeur 1" → "coiffeur-1" */
function barberNameToSlug(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/** "Coiffeur 1" → "CALENDAR_ID_COIFFEUR_1" */
function barberNameToEnvKey(name) {
  return (
    "CALENDAR_ID_" +
    String(name)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_")
      .replace(/[^A-Z0-9_]/g, "")
  );
}

/**
 * Lit dynamiquement tous les CALENDAR_ID_* du .env.
 * Ex. CALENDAR_ID_COIFFEUR_1=... → { "coiffeur-1": "..." }
 */
function getBarberCalendars() {
  const calendars = {};
  for (const [key, value] of Object.entries(process.env)) {
    const match = /^CALENDAR_ID_(.+)$/.exec(key);
    if (!match || !String(value || "").trim()) continue;
    const slug = match[1].toLowerCase().replace(/_/g, "-");
    calendars[slug] = String(value).trim();
  }
  return calendars;
}

module.exports = {
  getCalendarClient,
  getBarberCalendars,
  barberNameToSlug,
  barberNameToEnvKey,
};
