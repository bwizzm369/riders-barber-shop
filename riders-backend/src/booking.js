const { getCalendarClient } = require("./googleCalendar");
const { getAvailableSlots } = require("./availability");
const { insertBooking } = require("./db");
const { TIME_ZONE } = require("./timeZone");

const SERVICE_TITLES = {
  coupe: "Coupe",
};

/**
 * Re-checks Google Calendar, creates the event if free, then persists to SQLite.
 * Rolls back the Google event if SQLite insert fails.
 *
 * @returns {Promise<
 *   | { ok: true, bookingId: number, googleEventId: string, barber: string, date: string, time: string, service: string, endTime: string }
 *   | { ok: false, status: 409, error: "slot_unavailable" }
 * >}
 */
async function bookSlotOnGoogleCalendar(validated) {
  const {
    date,
    time,
    endTime,
    barber,
    service,
    calendarId,
    customerName,
    customerPhone,
    customerEmail,
  } = validated;

  const slots = await getAvailableSlots({ date, calendarId, service });
  if (!slots.includes(time)) {
    return { ok: false, status: 409, error: "slot_unavailable" };
  }

  const serviceTitle = SERVICE_TITLES[service] || service;
  const summary = `${serviceTitle} - ${customerName}`;

  const descriptionLines = [
    `Téléphone : ${customerPhone}`,
    customerEmail ? `Email : ${customerEmail}` : null,
    `Service : ${serviceTitle}`,
    "Riders Barber Shop",
  ].filter(Boolean);

  const calendar = await getCalendarClient();
  const created = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary,
      description: descriptionLines.join("\n"),
      start: {
        dateTime: `${date}T${time}:00`,
        timeZone: TIME_ZONE,
      },
      end: {
        dateTime: `${date}T${endTime}:00`,
        timeZone: TIME_ZONE,
      },
    },
  });

  const googleEventId = created.data.id;

  let bookingId;
  try {
    ({ id: bookingId } = insertBooking({
      googleEventId,
      barber,
      service,
      bookingDate: date,
      startTime: time,
      endTime,
      customerName,
      customerPhone,
      customerEmail,
      status: "confirmed",
    }));
  } catch (dbErr) {
    try {
      await calendar.events.delete({ calendarId, eventId: googleEventId });
    } catch (rollbackErr) {
      console.error("[book] rollback Google event failed", rollbackErr);
      const err = new Error(
        `SQLite a échoué et le rollback Google Calendar a aussi échoué (eventId=${googleEventId}): ${dbErr.message}`
      );
      err.cause = { dbErr, rollbackErr };
      throw err;
    }
    const err = new Error(
      `Événement Google créé puis annulé car l'enregistrement SQLite a échoué: ${dbErr.message}`
    );
    err.cause = dbErr;
    throw err;
  }

  return {
    ok: true,
    bookingId,
    googleEventId,
    barber,
    date,
    time,
    endTime,
    service,
  };
}

module.exports = {
  bookSlotOnGoogleCalendar,
  TIME_ZONE,
};
