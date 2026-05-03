# ErinnerMich Kalender-App

Diese Version kann Termine automatisch als Kalender-Abo bereitstellen.

## Neu

Die App erstellt einen persönlichen Kalender-Link:

```text
/calendar.ics
```

Wenn `CALENDAR_TOKEN` gesetzt ist, wird daraus ein geschützter Link:

```text
/calendar.ics?token=DEIN-CODE
```

Diesen Link kannst du auf dem iPhone als Kalender-Abo hinzufügen. Danach erscheinen die Termine aus ErinnerMich automatisch im iPhone-Kalender.

## Funktionen

- Termine eintragen
- Termine anzeigen
- Termine löschen
- Passwortschutz
- iPhone-/Android-App über Home-Bildschirm
- dunkles mystisches Design
- SMS-Erinnerungen, wenn Twilio eingetragen ist
- Kalender-Abo für iPhone-Kalender
- Kalender-Erinnerungen 60, 30 und 15 Minuten vorher

## iPhone-Kalender verbinden

1. ErinnerMich online öffnen
2. Kalender-Link aus der App kopieren
3. iPhone öffnen:
   - Einstellungen
   - Kalender
   - Accounts
   - Account hinzufügen
   - Andere
   - Kalenderabo hinzufügen
4. Link einfügen
5. Speichern

## Wichtig

Der iPhone-Kalender aktualisiert abonnierte Kalender nicht immer sofort. Neue Termine können also mit Verzögerung erscheinen.

Für eine direkte Synchronisierung in deinen privaten Apple-Kalender bräuchte man eine echte CalDAV-/Apple-Integration. Das ist deutlich aufwendiger. Für den Alltag ist das Kalender-Abo die einfachste Lösung.

## Online-Variablen

```text
APP_TIMEZONE=Europe/Berlin
DB_PATH=/var/data/appointments.db
APP_PASSWORD=dein-sicheres-passwort
SESSION_SECRET=ein-langer-geheimer-text
CALENDAR_TOKEN=ein-langer-zufallscode
SMS_TO=+49...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_SMS_FROM=...
```
