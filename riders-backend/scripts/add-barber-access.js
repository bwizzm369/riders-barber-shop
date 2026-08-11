require("dotenv").config();
const {
  getCalendarClient,
  getBarberCalendars,
} = require("../src/googleCalendar");

// Usage:
//   node scripts/add-barber-access.js email@gmail.com
//   node scripts/add-barber-access.js email@gmail.com coiffeur-1 coiffeur-2
// Accorde le rôle "writer" sur les agendas coiffeurs déjà présents dans .env
// (tous si aucun slug n'est précisé).
const email = process.argv[2];
const slugs = process.argv.slice(3);

if (!email) {
  console.error(
    "Usage: node scripts/add-barber-access.js email@gmail.com [coiffeur-1] [coiffeur-2] ...\n" +
      "(sans slug : partage tous les agendas déjà configurés dans .env)"
  );
  process.exit(1);
}

async function main() {
  const barberCalendars = getBarberCalendars();
  const allSlugs = Object.keys(barberCalendars);

  if (allSlugs.length === 0) {
    console.error(
      "Aucun agenda dans .env. Créez-en d'abord avec scripts/setup-calendars.js"
    );
    process.exit(1);
  }

  const targets = slugs.length > 0 ? slugs : allSlugs;
  const calendar = await getCalendarClient();

  for (const slug of targets) {
    const calendarId = barberCalendars[slug];
    if (!calendarId) {
      console.error(
        `✖ Coiffeur inconnu : "${slug}". Connus : ${allSlugs.join(", ")}`
      );
      process.exit(1);
    }

    await calendar.acl.insert({
      calendarId,
      requestBody: {
        role: "writer",
        scope: { type: "user", value: email },
      },
    });

    console.log(`✔ Accès writer accordé à ${email} sur ${slug} (${calendarId})`);
  }
}

main().catch((err) => {
  console.error("Erreur:", err.message);
  process.exit(1);
});
