# Auslagenformular

Eine vollständig clientseitige React-Anwendung zur Erfassung und Erstellung von Auslagenformularen. Die Anwendung ersetzt ein ausfüllbares PDF durch eine komfortablere Datenerfassung mit automatischer Berechnung, Validierung, lokaler Speicherung und direktem PDF-Download.

## Technologien

- Vite
- React
- TypeScript mit `strict: true`
- React Hook Form
- Zod
- pdf-lib
- tesseract.js
- PDF.js
- Vitest und Testing Library
- ESLint und Prettier

## Installation

```bash
npm install
```

## Entwicklungsstart

```bash
npm run dev
```

## Build

```bash
npm run build
```

Die erzeugten Dateien liegen danach in `dist/` und können als statische Webseite über GitHub Pages, Netlify oder vergleichbare Anbieter bereitgestellt werden. Ein Server ist zur Laufzeit nicht erforderlich.

## Tests

```bash
npm test
```

Abgedeckt sind Berechnungen, Summen, IBAN-Validierung, Währungsformatierung und zentrale Formularinteraktionen.

## Projektstruktur

```text
src/
  components/        Kleine Präsentations- und Formularabschnitte
  pdf/               Clientseitige PDF-Erzeugung
  receiptImport/     Lokale OCR und regelbasierte Belegerkennung
  types/             Zentrales Datenmodell
  utils/             Berechnungen, IBAN, Währung und Local Storage
  validation/        Formularvalidierung
```

## Belegimport

Version 1.1 unterstützt einen lokalen Einzelimport pro Ausgabenzeile. Über `Beleg erkennen` kann ein Bild oder eine PDF-Datei ausgewählt werden. Die Datei wird im Browser verarbeitet, per OCR gelesen und anschließend regelbasiert ausgewertet. Erkannte Werte werden zunächst in einer Vorschau angezeigt und können korrigiert werden. Erst `Erkannte Werte übernehmen` schreibt die Daten in das Formular.

Erkannt werden:

- Rechnungsdatum
- Lieferant / Belegname
- Nettobetrag
- Mehrwertsteuerbetrag
- Bruttobetrag

Die Standardregeln liegen in `src/receiptImport/receiptRules.ts`. Dort können Stichwörter für Datum, Netto, MwSt., Brutto sowie bevorzugte MwSt.-Sätze angepasst werden. Die eigentliche Extraktion ist in `src/receiptImport/receiptExtraction.ts` testbar gekapselt.

## Datenstruktur

Das zentrale Modell besteht aus `ExpenseReport`, `Expense`, `PaymentMethod` und `BankAccount`. Komponenten, Validierung, Speicherung und PDF-Erzeugung arbeiten auf denselben Typen. Dadurch bleibt die Anwendung erweiterbar, ohne Formularfelder direkt in der PDF-Schicht auslesen zu müssen.

## PDF-Vorlage

Die Anwendung verwendet `basepdf/Auslagenerstattung.pdf` als originale PDF-Vorlage. `src/pdf/generatePdf.ts` mappt die bestehenden `ExpenseReport`-Daten auf die Formularfelder der Vorlage und flacht das Ergebnis ab, sodass die heruntergeladene PDF keine editierbaren Formularfelder enthält.

Der Downloadname folgt dem Schema `Auslagenerstattung_[Name]_[Datum].pdf`, zum Beispiel `Auslagenerstattung_Erika_Muster_2026-07-31.pdf`. Wichtig: Die PDF-Erzeugung erhält ausschließlich fertige Daten über `generatePdf(report)`. Sie kennt keine React-Komponenten und greift nicht direkt auf Formularfelder zu.

## Architekturentscheidungen

- Business-Logik liegt außerhalb der React-Komponenten in `src/utils`.
- OCR-Regeln und Belegextraktion liegen außerhalb der React-Komponenten in `src/receiptImport`.
- Formularstatus bleibt lokal über React Hook Form, `useState`, `useMemo` und `useEffect`.
- Es wird kein globales State-Management eingesetzt.
- Änderungen werden automatisch im Local Storage gespeichert.
- Der Zurücksetzen-Button löscht gespeicherte Daten und startet mit einem leeren Formular.
- Validierungsfehler werden direkt an den Feldern angezeigt.

## Bekannte Einschränkungen

- Die PDF-Tabelle ist durch die Vorlage auf zehn Ausgabenzeilen begrenzt. Sehr lange Listen benötigen später Pagination oder eine mehrseitige Vorlage.
- Der Belegimport verarbeitet in Version 1.1 jeweils einen Beleg. Mehrfachimport und ZIP-Export sind für Version 2.0 vorgesehen.
- Die OCR läuft lokal im Browser und lädt die mitgelieferten Sprachdaten aus `public/tessdata`.

## Lizenz

Noch keine Lizenz festgelegt.
