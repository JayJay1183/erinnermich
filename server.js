require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const db = require("./db");
const { startScheduler } = require("./scheduler");
const { sendSms } = require("./sms");

function escapeIcsText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

function toIcsDate(value) {
  return dayjs(value).utc().format("YYYYMMDDTHHmmss[Z]");
}

function makeUid(row) {
  return `erinnermich-${row.id}@erinnermich.local`;
}

dayjs.extend(utc);
dayjs.extend(timezone);

const app = express();
const PORT = process.env.PORT || 3000;
const TZ = process.env.APP_TIMEZONE || "Europe/Berlin";

app.set("view engine", "ejs");
app.set("views", __drname);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__drname));

app.use(cookieSession({
  name: "erinnermich_session",
  keys: [process.env.SESSION_SECRET || "bitte-aendern"],
  maxAge: 30 * 24 * 60 * 60 * 1000
}));

function requireLogin(req, res, next) {
  if (!process.env.APP_PASSWORD) return next();
  if (req.session && req.session.loggedIn) return next();
  return res.redirect("/login");
}

app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", (req, res) => {
  const { password } = req.body;
  if (password === process.env.APP_PASSWORD) {
    req.session.loggedIn = true;
    return res.redirect("/");
  }
  res.render("login", { error: "Das Passwort stimmt nicht." });
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/login");
});


app.get("/calendar.ics", (req, res) => {
  const token = process.env.CALENDAR_TOKEN;

  if (token && req.query.token !== token) {
    res.status(403).send("Kalender-Link ist nicht gültig.");
    return;
  }

  db.all(
    `SELECT * FROM appointments ORDER BY start_time ASC`,
    [],
    (err, rows) => {
      if (err) {
        res.status(500).send("Kalender konnte nicht erstellt werden.");
        return;
      }

      const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//ErinnerMich//Termin Kalender//DE",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:ErinnerMich",
        "X-WR-TIMEZONE:Europe/Berlin",
        "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
        "X-PUBLISHED-TTL:PT15M"
      ];

      rows.forEach((row) => {
        const start = dayjs(row.start_time);
        const end = start.add(1, "hour");
        const descriptionParts = [];
        if (row.notes) descriptionParts.push(row.notes);
        descriptionParts.push("Erstellt mit ErinnerMich.");

        lines.push("BEGIN:VEVENT");
        lines.push(`UID:${makeUid(row)}`);
        lines.push(`DTSTAMP:${toIcsDate(new Date())}`);
        lines.push(`DTSTART:${toIcsDate(start)}`);
        lines.push(`DTEND:${toIcsDate(end)}`);
        lines.push(`SUMMARY:${escapeIcsText(row.title)}`);
        if (row.location) lines.push(`LOCATION:${escapeIcsText(row.location)}`);
        lines.push(`DESCRIPTION:${escapeIcsText(descriptionParts.join("\\n"))}`);
        lines.push("BEGIN:VALARM");
        lines.push("TRIGGER:-PT60M");
        lines.push("ACTION:DISPLAY");
        lines.push(`DESCRIPTION:${escapeIcsText("ErinnerMich: " + row.title)}`);
        lines.push("END:VALARM");
        lines.push("BEGIN:VALARM");
        lines.push("TRIGGER:-PT30M");
        lines.push("ACTION:DISPLAY");
        lines.push(`DESCRIPTION:${escapeIcsText("ErinnerMich: " + row.title)}`);
        lines.push("END:VALARM");
        lines.push("BEGIN:VALARM");
        lines.push("TRIGGER:-PT15M");
        lines.push("ACTION:DISPLAY");
        lines.push(`DESCRIPTION:${escapeIcsText("ErinnerMich: " + row.title)}`);
        lines.push("END:VALARM");
        lines.push("END:VEVENT");
      });

      lines.push("END:VCALENDAR");

      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Content-Disposition", "inline; filename=erinnermich.ics");
      res.send(lines.join("\\r\\n"));
    }
  );
});

app.get("/", requireLogin, (req, res) => {
  db.all(
    `SELECT * FROM appointments ORDER BY start_time ASC`,
    [],
    (err, rows) => {
      if (err) {
        res.status(500).send("Fehler beim Laden der Termine.");
        return;
      }

      const calendarToken = process.env.CALENDAR_TOKEN || "";
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const calendarUrl = calendarToken
        ? `${baseUrl}/calendar.ics?token=${encodeURIComponent(calendarToken)}`
        : `${baseUrl}/calendar.ics`;

      res.render("index", {
        appointments: rows,
        dayjs,
        timezone: TZ,
        calendarUrl
      });
    }
  );
});

app.post("/appointments", requireLogin, (req, res) => {
  const { title, date, time, location, notes } = req.body;

  if (!title || !date || !time) {
    res.status(400).send("Titel, Datum und Uhrzeit sind Pflichtfelder.");
    return;
  }

  const startTime = dayjs.tz(`${date} ${time}`, "YYYY-MM-DD HH:mm", TZ).toISOString();

  db.run(
    `INSERT INTO appointments (title, location, notes, start_time) VALUES (?, ?, ?, ?)`,
    [title, location || "", notes || "", startTime],
    (err) => {
      if (err) {
        res.status(500).send("Termin konnte nicht gespeichert werden.");
        return;
      }
      res.redirect("/");
    }
  );
});

app.post("/appointments/:id/delete", requireLogin, (req, res) => {
  db.run(`DELETE FROM appointments WHERE id = ?`, [req.params.id], (err) => {
    if (err) {
      res.status(500).send("Termin konnte nicht gelöscht werden.");
      return;
    }
    res.redirect("/");
  });
});

app.post("/test-sms", requireLogin, async (req, res) => {
  await sendSms("Test-SMS aus deiner Termin-Erinnerungs-App.");
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`App läuft auf http://localhost:${PORT}`);
  startScheduler();
});
