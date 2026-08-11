require("dotenv").config();
const fs = require("fs");
const path = require("path");
const {
  getCalendarClient,
  barberNameToEnvKey,
} = require("../src/googleCalendar");

// Usage: node scripts/setup-calendars.js votre-email@gmail.com "Coiffeur 1" "Coiffeur 2" ...
const ownerEmail = process.argv[2];
const barberNames = process.argv.slice(3);

if (!ownerEmail || barberNames.length === 0) {
  console.error(
    "Usage: node scripts/setup-calendars.js votre-email@gmail.com \"Coiffeur 1\" \"Coiffeur 2\" ...\n" +
      "(passez autant de noms de coiffeurs que vous voulez — 1, 2, 5…)"
  );
  process.exit(1);
}

async function main() {
  const calendar = await getCalendarClient();
  const results = [];

  for (const name of barberNames) {
    const created = await calendar.calendars.insert({
      requestBody: {
        summary: name,
        timeZone: "Africa/Casablanca",
      },
    });
    const calendarId = created.data.id;

    await calendar.acl.insert({
      calendarId,
      requestBody: {
        role: "owner",
        scope: { type: "user", value: ownerEmail },
      },
    });

    const key = barberNameToEnvKey(name);
    console.log(`✔ ${name} créé et partagé avec ${ownerEmail} — ID: ${calendarId}`);
    results.push({ key, calendarId });
  }

  const envPath = path.join(__dirname, "..", ".env");
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

  for (const { key, calendarId } of results) {
    const line = `${key}=${calendarId}`;
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, line);
    } else {
      envContent = envContent.replace(/\s*$/, "") + `\n${line}\n`;
    }
  }

  // Retire les anciennes lignes CALENDAR_ID_* vides (ex. placeholders à 4)
  envContent = envContent
    .split("\n")
    .filter((line) => !/^CALENDAR_ID_\w+=\s*$/.test(line))
    .join("\n");

  fs.writeFileSync(envPath, envContent.endsWith("\n") ? envContent : envContent + "\n");
  console.log(
    `\n.env mis à jour automatiquement avec ${results.length} identifiant(s) d'agenda.`
  );
  console.log("Redémarrez le serveur (npm start) puis testez /api/health.");
}

main().catch((err) => {
  console.error("Erreur:", err.message);
  process.exit(1);
});
