/** Default calendar timezone used by setup-calendars.js */
const TIME_ZONE = "Africa/Casablanca";

/**
 * Returns the UTC Date for a wall-clock date+time in TIME_ZONE.
 * @param {string} date YYYY-MM-DD
 * @param {string} time HH:MM
 */
function zonedDateTimeToUtc(date, time) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, 0);

  const offsetMs = tzOffsetMs(TIME_ZONE, new Date(asUtc));
  let utcMs = asUtc - offsetMs;

  // Refine once in case of DST boundary edge cases
  const offsetMs2 = tzOffsetMs(TIME_ZONE, new Date(utcMs));
  utcMs = asUtc - offsetMs2;

  return new Date(utcMs);
}

function tzOffsetMs(timeZone, date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const map = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }

  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) % 24,
    Number(map.minute),
    Number(map.second)
  );

  return asUTC - date.getTime();
}

function formatHHMMInZone(date, timeZone = TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

module.exports = {
  TIME_ZONE,
  zonedDateTimeToUtc,
  formatHHMMInZone,
};
