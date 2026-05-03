require("dotenv").config();
const cron = require("node-cron");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const db = require("./db");
const { sendSms } = require("./sms");

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = process.env.APP_TIMEZONE || "Europe/Berlin";

function formatAppointment(row) {
  const time = dayjs(row.start_time).tz(TZ).format("HH:mm");
  const date = dayjs(row.start_time).tz(TZ).format("DD.MM.YYYY");
  const location = row.location ? `\nOrt: ${row.location}` : "";
  const notes = row.notes ? `\nNotiz: ${row.notes}` : "";
  return `${date}, ${time} Uhr: ${row.title}${location}${notes}`;
}

function checkReminders() {
  const now = dayjs().tz(TZ);

  db.all(
    `SELECT * FROM appointments WHERE start_time >= ?`,
    [now.toISOString()],
    async (err, rows) => {
      if (err) {
        console.error(err);
        return;
      }

      for (const row of rows) {
        const start = dayjs(row.start_time).tz(TZ);
        const minutesUntil = start.diff(now, "minute");

        const reminderMap = [
          { minutes: 60, field: "reminder_60_sent" },
          { minutes: 30, field: "reminder_30_sent" },
          { minutes: 15, field: "reminder_15_sent" }
        ];

        for (const reminder of reminderMap) {
          if (minutesUntil <= reminder.minutes && minutesUntil > reminder.minutes - 2 && row[reminder.field] === 0) {
            const message = `Terminerinnerung: In ${reminder.minutes} Minuten beginnt dein Termin.\n\n${formatAppointment(row)}`;
            await sendSms(message);

            db.run(
              `UPDATE appointments SET ${reminder.field} = 1 WHERE id = ?`,
              [row.id]
            );
          }
        }
      }
    }
  );
}

function sendDailySummary() {
  const tomorrow = dayjs().tz(TZ).add(1, "day").format("YYYY-MM-DD");

  db.get(
    `SELECT * FROM daily_summaries WHERE summary_date = ?`,
    [tomorrow],
    (summaryErr, existing) => {
      if (summaryErr) {
        console.error(summaryErr);
        return;
      }

      if (existing) return;

      const start = dayjs.tz(`${tomorrow} 00:00`, "YYYY-MM-DD HH:mm", TZ);
      const end = start.add(1, "day");

      db.all(
        `SELECT * FROM appointments WHERE start_time >= ? AND start_time < ? ORDER BY start_time ASC`,
        [start.toISOString(), end.toISOString()],
        async (err, rows) => {
          if (err) {
            console.error(err);
            return;
          }

          let message = `Deine Termine für morgen, ${start.format("DD.MM.YYYY")}:`;

          if (rows.length === 0) {
            message += "\n\nKeine Termine eingetragen.";
          } else {
            message += "\n\n" + rows.map((row, index) => `${index + 1}. ${formatAppointment(row)}`).join("\n\n");
          }

          await sendSms(message);

          db.run(
            `INSERT OR IGNORE INTO daily_summaries (summary_date) VALUES (?)`,
            [tomorrow]
          );
        }
      );
    }
  );
}

function startScheduler() {
  cron.schedule("* * * * *", checkReminders, { timezone: TZ });
  cron.schedule("0 20 * * *", sendDailySummary, { timezone: TZ });

  console.log("Termin-Erinnerungen laufen.");
}

module.exports = { startScheduler };
