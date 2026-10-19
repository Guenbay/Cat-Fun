# 🐾 Purrdex — Cat Fact Collector

Eine moderne, verspielte Web-App rund um Katzenfakten. Statt nur einen Fakt
anzuzeigen, macht Purrdex ein kleines Sammelspiel daraus: jeder Fakt ist eine
Karte mit eigener Seltenheit, bringt XP und Fischli, treibt Combo und Streak
und schaltet nach und nach Achievements frei.

Hervorgegangen aus dem Mini-Projekt [cat-funfact](https://github.com/Guenbay/cat-funfact).

---

## ✨ Was drin steckt

**Gamification**

| System | Beschreibung |
|---|---|
| 🎴 Seltenheiten | Jeder Fakt wird über einen Hash seines Textes fest einer Stufe zugeordnet — Common, Selten, Episch, Legendär. Derselbe Fakt hat bei jedem Spieler dieselbe Karte. |
| ⭐ XP & Level | Exponentielle Levelkurve mit neun Rängen vom *Streunerkätzchen* bis zu *Neunfach Beseelt*. |
| ⚡ Combo | Wer schnell hintereinander zieht, baut einen Multiplikator bis ca. 3× auf. Das Zeitfenster läuft sichtbar ab. |
| 🔥 Streak | Tage in Folge. Ein Tag Pause setzt zurück. |
| ✅ Tagesaufgaben | Drei Aufgaben pro Tag, deterministisch aus dem Datum gezogen — gleicher Tag, gleiche Aufgaben. |
| 🏆 Achievements | 17 Stück, von *Erster Pfotenabdruck* bis *Nachtschwärmer*. |
| 🐟 Fischli | Weichwährung als Fortschrittsanzeige. |
| 📚 Sammlung | Alle gezogenen Karten mit Filtern nach Seltenheit und Favoriten, jede mit Sprach-Abzeichen. |
| 🌍 Drei Sprachen | Umschalter in der Kopfzeile zwischen **Deutsch**, **English** und **Türkçe**. Er übersetzt die komplette Oberfläche samt Rängen, Achievements und Tagesaufgaben — und wechselt zugleich die Faktenquelle. Alle Sprachen füllen dieselbe Sammlung, jede Karte trägt ihr Sprach-Abzeichen. |

**Oberfläche**

- Aurora-Hintergrund mit treibenden Pfoten auf Canvas und feiner Film-Körnung
- Glassmorphism-Panels, Fortschrittsring, Partikel-Ausbrüche je nach Seltenheit
- Zwei Themes: *Midnight* (dunkel) und *Daylight* (hell)
- `<html lang>` folgt der gewählten Sprache
- Synthetischer Sound über die WebAudio-API — keine einzige Audiodatei im Repo
- Tastatur: `Leertaste` zieht, `F` setzt Favorit, `C` kopiert
- Eigener Bestätigungs-Dialog statt `confirm()` — native Dialoge sind in
  eingebetteten Kontexten wie sandboxed iframes gesperrt
- Responsive bis Handybreite, respektiert `prefers-reduced-motion`

**Technik**

- Reines Vanilla JS mit ES-Modulen — kein Build, kein Framework, keine Abhängigkeit
- Fortschritt im `localStorage`, jeder Zugriff gegen blockierte Site-Daten abgesichert
- Drei Faktenquellen: kuratierte Pools im Projekt für Deutsch (98 Fakten) und
  Türkisch (98 Fakten) — für diese Sprachen gibt es keine Katzenfakten-API —
  sowie [catfact.ninja](https://catfact.ninja) für Englisch, mit Timeout und
  englischem Offline-Vorrat als Rückfallebene
- Alle sichtbaren Texte liegen in `js/data/i18n.js`; kein Modul schreibt Text
  selbst. Statische Texte sind im Markup mit `data-i18n` ausgezeichnet

---

## 🚀 Starten

Weil die App ES-Module nutzt, braucht sie einen kleinen Server —
ein Doppelklick auf `index.html` reicht wegen der `file://`-Beschränkungen nicht.

```bash
git clone https://github.com/Guenbay/Cat-Fun.git
cd Cat-Fun

python3 -m http.server 8080
# oder: npx serve .
```

Dann `http://localhost:8080` im Browser öffnen.

Live: **https://guenbay.github.io/Cat-Fun/**

### GitHub Pages

In den Repository-Einstellungen unter **Settings → Pages** als Quelle den
Branch wählen und `/` als Ordner. Die App ist komplett statisch und läuft
ohne weitere Konfiguration.

---

## 📁 Aufbau

```
index.html                  Markup und Seitenstruktur
css/styles.css              Design-Tokens, Layout, Komponenten, Animationen
assets/favicon.svg          Katzen-Icon
js/
  app.js                    Orchestrierung: State, Spielregeln, Ereignisse
  core/
    api.js                  Faktenquellen je Sprache, Timeout, Offline-Rückfall
    audio.js                Synthetische Soundeffekte (WebAudio)
    rarity.js               Hash, Seltenheitsstufen, Karten-IDs
    storage.js              localStorage, abgesichert
  game/
    achievements.js         Definitionen und Auswertung
    quests.js               Tagesaufgaben-Pool und Tagesauswahl
    xp.js                   Levelkurve und Rangschwellen
  ui/
    effects.js              Pfoten-Canvas und Partikel
    render.js               DOM-Zeichnen, kennt keine Spiellogik
    toast.js                Meldungen
  data/
    i18n.js                 Alle Oberflächentexte in DE / EN / TR
    facts-de.js             Kuratierter deutscher Pool (98 Fakten)
    facts-en.js             Englischer Offline-Vorrat
    facts-tr.js             Kuratierter türkischer Pool (98 Fakten)
```

Die Trennung ist bewusst: `core` weiß nichts über das Spiel, `game` nichts
über das DOM, `ui` nichts über die Regeln. Nur `app.js` kennt alles.

---

## 🐈‍⬛ Lizenz

MIT — mach damit, was du willst.

Gebaut von **Guenbay** 🐾
