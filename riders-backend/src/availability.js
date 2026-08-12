const { getCalendarClient } = require("./googleCalendar");
const {
  TIME_ZONE,
  zonedDateTimeToUtc,
  formatHHMMInZone,
} = require("./timeZone");

const SLOT_MINUTES = 45;
const OPEN_HOUR = 9;
const CLOSE_HOUR = 19;

/**
 * Returns free 45-min slots for a calendar on a given date (YYYY-MM-DD).
 * Closed on Sunday (getDay() === 0). Times are Africa/Casablanca wall-clock.
 * @returns {Promise<string[]>} e.g. ["09:00", "09:45", ...]
 */
async function getAvailableSlots({ date, calendarId }) {
  const noonUtc = zonedDateTimeToUtc(date, "12:00");
  if (Number.isNaN(noonUtc.getTime())) {
    throw new Error(`Date invalide : ${date}`);
  }

  // Sunday check in calendar timezone
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
  }).format(noonUtc);
  if (weekday === "Sun") {
    return [];
  }

  const open = String(OPEN_HOUR).padStart(2, "0") + ":00";
  const close = String(CLOSE_HOUR).padStart(2, "0") + ":00";
  const timeMin = zonedDateTimeToUtc(date, open);
  const timeMax = zonedDateTimeToUtc(date, close);

  const calendar = await getCalendarClient();
  const fb = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      timeZone: TIME_ZONE,
      items: [{ id: calendarId }],
    },
  });

  const busy = (fb.data.calendars?.[calendarId]?.busy || []).map((b) => ({
    start: new Date(b.start).getTime(),
    end: new Date(b.end).getTime(),
  }));

  const slots = [];
  const slotMs = SLOT_MINUTES * 60 * 1000;
  let cursor = timeMin.getTime();
  const endMs = timeMax.getTime();

  while (cursor + slotMs <= endMs) {
    const slotEnd = cursor + slotMs;
    const overlaps = busy.some((b) => cursor < b.end && slotEnd > b.start);
    if (!overlaps) {
      slots.push(formatHHMMInZone(new Date(cursor)));
    }
    cursor += slotMs;
  }

  return slots;
}

module.exports = { getAvailableSlots, SLOT_MINUTES, OPEN_HOUR, CLOSE_HOUR };
