const { getBarberCalendars } = require("./googleCalendar");

const SERVICE_DURATIONS_MINUTES = {
  coupe: 45,
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Validates POST /api/book body and computes endTime.
 * Does not touch Google Calendar or SQLite.
 * @returns {{ ok: true, data: object } | { ok: false, error: string }}
 */
function validateBookingInput(body = {}) {
  const {
    date,
    time,
    barber,
    service,
    customerName,
    customerPhone,
    customerEmail,
  } = body;

  if (typeof date !== "string" || !DATE_RE.test(date)) {
    return {
      ok: false,
      error: "Paramètre date invalide. Format attendu : YYYY-MM-DD",
    };
  }

  const [y, m, d] = date.split("-").map(Number);
  const parsed = new Date(y, m - 1, d);
  if (
    parsed.getFullYear() !== y ||
    parsed.getMonth() !== m - 1 ||
    parsed.getDate() !== d
  ) {
    return {
      ok: false,
      error: "Paramètre date invalide. Date calendaire impossible.",
    };
  }

  if (typeof time !== "string" || !TIME_RE.test(time)) {
    return {
      ok: false,
      error: "Paramètre time invalide. Format attendu : HH:MM (24h)",
    };
  }

  if (typeof barber !== "string" || !barber.trim()) {
    return {
      ok: false,
      error: "Paramètre barber requis (ex. coiffeur-1)",
    };
  }

  const barberSlug = barber.trim();
  const barberCalendars = getBarberCalendars();
  const calendarId = barberCalendars[barberSlug];
  if (!calendarId) {
    const known = Object.keys(barberCalendars);
    return {
      ok: false,
      error:
        known.length === 0
          ? "Aucun coiffeur configuré. Lancez scripts/setup-calendars.js d'abord."
          : `Coiffeur inconnu ou non configuré : "${barberSlug}". Valeurs attendues : ${known.join(", ")}`,
    };
  }

  if (typeof service !== "string" || !service.trim()) {
    return {
      ok: false,
      error: "Paramètre service requis (ex. coupe)",
    };
  }

  const serviceSlug = service.trim().toLowerCase();
  const durationMinutes = SERVICE_DURATIONS_MINUTES[serviceSlug];
  if (!durationMinutes) {
    return {
      ok: false,
      error: `Service inconnu : "${service}". Valeurs attendues : ${Object.keys(SERVICE_DURATIONS_MINUTES).join(", ")}`,
    };
  }

  if (typeof customerName !== "string" || !customerName.trim()) {
    return {
      ok: false,
      error: "Paramètre customerName requis",
    };
  }

  if (typeof customerPhone !== "string" || !customerPhone.trim()) {
    return {
      ok: false,
      error: "Paramètre customerPhone requis",
    };
  }

  let email = null;
  if (customerEmail !== undefined && customerEmail !== null && customerEmail !== "") {
    if (typeof customerEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      return {
        ok: false,
        error: "Paramètre customerEmail invalide",
      };
    }
    email = customerEmail.trim();
  }

  const endTime = addMinutesToHHMM(time, durationMinutes);

  return {
    ok: true,
    data: {
      date,
      time,
      endTime,
      durationMinutes,
      barber: barberSlug,
      service: serviceSlug,
      calendarId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: email,
    },
  };
}

function addMinutesToHHMM(time, minutesToAdd) {
  const [, hh, mm] = TIME_RE.exec(time);
  const total = Number(hh) * 60 + Number(mm) + minutesToAdd;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

module.exports = {
  validateBookingInput,
  SERVICE_DURATIONS_MINUTES,
};
