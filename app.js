// ===================================================
//  Wurst & Speck – App für Tata
//  Alle Daten werden auf dem Handy gespeichert (localStorage).
//  Jedes Jahr hat seine eigenen Preise und Bestellungen.
// ===================================================

const SPEICHER_KEY = "wurst-speck-daten-v2";
const ALTER_KEY = "wurst-speck-daten"; // Version 1 (nur Speck + Wurst)

// ---------- Produkte ----------
// Neues Produkt? Einfach hier eine Zeile dazuschreiben.
const PRODUKTE = [
  { key: "bauchspeck",  name: "Bauchspeck",  gruppe: "Speck" },
  { key: "hammenspeck", name: "Hammenspeck", gruppe: "Speck" },
  { key: "kaminwurst",  name: "Kaminwurst",  gruppe: "Wurst" },
  { key: "hauswurst",   name: "Hauswurst",   gruppe: "Wurst" }
];
const GRUPPEN = ["Speck", "Wurst"];

// ---------- Daten ----------
// So sehen die Daten aus:
// {
//   jahr: "2026",                       <- das gerade ausgewählte Jahr
//   personen: [ { id: 1, name: "Anna" } ],
//   naechsteId: 2,
//   jahre: {
//     "2026": {
//       preise: { bauchspeck: 24, hammenspeck: 26, kaminwurst: 20, hauswurst: 18 },
//       bestellungen: { "1": { bauchspeck: "1,5", hauswurst: "2", bezahlt: false } }
//     }
//   }
// }
let daten = {
  jahr: String(new Date().getFullYear()),
  personen: [],
  naechsteId: 1,
  jahre: {}
};

let aktuellePersonId = null;

function leeresJahr() {
  const preise = {};
  PRODUKTE.forEach(p => (preise[p.key] = 0));
  return { preise: preise, bestellungen: {} };
}

function laden() {
  const gespeichert = localStorage.getItem(SPEICHER_KEY);
  if (gespeichert) {
    try {
      daten = JSON.parse(gespeichert);
    } catch (e) {
      console.error("Daten konnten nicht geladen werden", e);
    }
  } else {
    // Von Version 1 übernehmen: die Namen bleiben, die alten Mengen nicht
    // (damals gab es nur "Speck" und "Wurst" ohne Sorte).
    const alt = localStorage.getItem(ALTER_KEY);
    if (alt) {
      try {
        const v1 = JSON.parse(alt);
        daten.personen = (v1.personen || []).map(p => ({ id: p.id, name: p.name }));
        daten.naechsteId = v1.naechsteId || daten.personen.length + 1;
      } catch (e) {
        console.error("Alte Daten konnten nicht übernommen werden", e);
      }
    }
  }
  if (!daten.jahre) daten.jahre = {};
  jahrDaten(); // sorgt dafür, dass das aktuelle Jahr existiert
  speichern();
}

function speichern() {
  localStorage.setItem(SPEICHER_KEY, JSON.stringify(daten));
}

// Daten vom ausgewählten Jahr (wird angelegt, falls es fehlt)
function jahrDaten() {
  if (!daten.jahre[daten.jahr]) daten.jahre[daten.jahr] = leeresJahr();
  const j = daten.jahre[daten.jahr];
  PRODUKTE.forEach(p => { if (j.preise[p.key] == null) j.preise[p.key] = 0; });
  return j;
}

// Bestellung einer Person im ausgewählten Jahr
function bestellungVon(id, anlegen) {
  const j = jahrDaten();
  if (!j.bestellungen[id] && anlegen) {
    const b = { bezahlt: false };
    PRODUKTE.forEach(p => (b[p.key] = ""));
    j.bestellungen[id] = b;
  }
  return j.bestellungen[id] || { bezahlt: false };
}

// ---------- Hilfsfunktionen ----------

// "1,5" -> 1.5   (Komma wird zu Punkt)
function zahl(text) {
  const n = parseFloat(String(text || "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

// 12.5 -> "12,50 €"
function euro(betrag) {
  return betrag.toFixed(2).replace(".", ",") + " €";
}

// 1.5 -> "1,5 kg"
function kilo(menge) {
  return String(Math.round(menge * 1000) / 1000).replace(".", ",") + " kg";
}

// Nur Ziffern, Komma und Punkt erlauben
function nurZahlen(text) {
  return text.replace(/[^0-9.,]/g, "");
}

function preisVon(id) {
  const b = bestellungVon(id);
  const preise = jahrDaten().preise;
  let summe = 0;
  PRODUKTE.forEach(p => (summe += zahl(b[p.key]) * preise[p.key]));
  return summe;
}

function hatBestellung(id) {
  const b = bestellungVon(id);
  return PRODUKTE.some(p => zahl(b[p.key]) > 0);
}

function beschreibung(id) {
  const b = bestellungVon(id);
  return PRODUKTE
    .filter(p => zahl(b[p.key]) > 0)
    .map(p => kilo(zahl(b[p.key])) + " " + p.name)
    .join(" · ");
}

function keinePreise() {
  const preise = jahrDaten().preise;
  return PRODUKTE.every(p => !preise[p.key]);
}

function findePerson(id) {
  return daten.personen.find(p => p.id === id);
}

// ---------- Screens wechseln ----------
function zeige(name) {
  document.querySelectorAll(".screen").forEach(s => (s.hidden = true));
  document.getElementById("screen-" + name).hidden = false;
  window.scrollTo(0, 0);

  if (name === "liste") zeichneListe();
  if (name === "eintragen") zeichneEintragen();
  if (name === "uebersicht") zeichneUebersicht();
  if (name === "einstellungen") zeichneEinstellungen();
}

// ---------- Jahr auswählen ----------
function zeichneJahrAuswahl() {
  const select = document.getElementById("jahr");
  select.innerHTML = "";

  const jahre = Object.keys(daten.jahre).sort();
  jahre.forEach(j => {
    const opt = document.createElement("option");
    opt.value = j;
    opt.textContent = j;
    select.append(opt);
  });

  const naechstes = String(Math.max(...jahre.map(Number)) + 1);
  const neu = document.createElement("option");
  neu.value = "neu";
  neu.textContent = "+ Neues Jahr (" + naechstes + ")";
  select.append(neu);

  select.value = daten.jahr;
}

function jahrGewechselt(event) {
  const wert = event.target.value;
  if (wert === "neu") {
    const jahre = Object.keys(daten.jahre).map(Number);
    daten.jahr = String(Math.max(...jahre) + 1);
    jahrDaten();
    speichern();
    zeige("einstellungen"); // neues Jahr -> gleich Preise eintragen
  } else {
    daten.jahr = wert;
    speichern();
    zeichneListe();
  }
}

// ---------- Screen 1: Namensliste ----------
function zeichneListe() {
  zeichneJahrAuswahl();

  const ul = document.getElementById("namensliste");
  ul.innerHTML = "";

  // Alphabetisch sortieren
  const sortiert = [...daten.personen].sort((a, b) => a.name.localeCompare(b.name, "de"));

  let offen = 0;

  sortiert.forEach(person => {
    const li = document.createElement("li");
    const knopf = document.createElement("button");
    knopf.type = "button";
    knopf.className = "person";

    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = person.name.charAt(0).toUpperCase();

    const text = document.createElement("span");
    text.className = "person-text";
    const name = document.createElement("span");
    name.className = "person-name";
    name.textContent = person.name;
    const sub = document.createElement("span");
    sub.className = "person-sub";
    text.append(name, sub);

    knopf.append(avatar, text);

    if (hatBestellung(person.id)) {
      const preis = preisVon(person.id);
      const bezahlt = bestellungVon(person.id).bezahlt;
      sub.textContent = euro(preis) + " · " + beschreibung(person.id);

      const badge = document.createElement("span");
      badge.className = "badge " + (bezahlt ? "bezahlt" : "offen");
      badge.textContent = bezahlt ? "Bezahlt" : "Offen";
      knopf.append(badge);

      if (!bezahlt) offen += preis;
    } else {
      sub.textContent = "Noch nichts eingetragen";
    }

    const pfeil = document.createElement("span");
    pfeil.className = "pfeil";
    pfeil.setAttribute("aria-hidden", "true");
    pfeil.textContent = "›";
    knopf.append(pfeil);

    knopf.addEventListener("click", () => {
      aktuellePersonId = person.id;
      zeige("eintragen");
    });

    li.append(knopf);
    ul.append(li);
  });

  document.getElementById("offen-summe").textContent = euro(offen);

  // Hinweis, wenn für dieses Jahr noch keine Preise eingestellt sind
  document.getElementById("hinweis-text").textContent =
    "Bitte zuerst die Preise für " + daten.jahr + " einstellen.";
  document.getElementById("hinweis-preise").hidden = !keinePreise();

  // Formular zuklappen
  document.getElementById("form-neu").hidden = true;
  document.getElementById("btn-neu").hidden = false;
}

function neuePersonAnzeigen() {
  document.getElementById("btn-neu").hidden = true;
  document.getElementById("form-neu").hidden = false;
  document.getElementById("neuer-name").focus();
}

function neuePersonHinzufuegen(event) {
  event.preventDefault();
  const feld = document.getElementById("neuer-name");
  const name = feld.value.trim();
  if (!name) return;

  // Gibt es den Namen schon?
  const schonDa = daten.personen.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (schonDa) {
    alert(name + " gibt es schon in der Liste.");
    return;
  }

  const person = { id: daten.naechsteId, name: name };
  daten.naechsteId++;
  daten.personen.push(person);
  speichern();

  feld.value = "";
  aktuellePersonId = person.id;
  zeige("eintragen");
}

// ---------- Screen 2: Kilos eintragen ----------
function zeichneEintragen() {
  const person = findePerson(aktuellePersonId);
  if (!person) return zeige("liste");

  document.getElementById("eintragen-name").textContent = person.name;
  document.getElementById("eintragen-jahr").textContent = "(" + daten.jahr + ")";

  const b = bestellungVon(person.id);
  const preise = jahrDaten().preise;
  const box = document.getElementById("produkt-karten");
  box.innerHTML = "";

  GRUPPEN.forEach(gruppe => {
    const titel = document.createElement("h2");
    titel.className = "gruppe-titel";
    titel.textContent = gruppe;
    box.append(titel);

    PRODUKTE.filter(p => p.gruppe === gruppe).forEach(p => {
      const karte = document.createElement("section");
      karte.className = "karte";

      const kopf = document.createElement("div");
      kopf.className = "karte-kopf";
      const label = document.createElement("label");
      label.className = "karte-titel";
      label.htmlFor = "kg-" + p.key;
      label.textContent = p.name;
      const preis = document.createElement("span");
      preis.className = "grau klein";
      preis.textContent = euro(preise[p.key]) + " pro kg";
      kopf.append(label, preis);

      const zeile = document.createElement("div");
      zeile.className = "eingabe-zeile";
      const input = document.createElement("input");
      input.id = "kg-" + p.key;
      input.type = "text";
      input.inputMode = "decimal";
      input.placeholder = "0,0";
      input.autocomplete = "off";
      input.value = b[p.key] || "";
      input.addEventListener("input", () => {
        input.value = nurZahlen(input.value);
        bestellungVon(person.id, true)[p.key] = input.value;
        speichern();
        rechneEintragen();
      });
      const einheit = document.createElement("span");
      einheit.className = "einheit";
      einheit.textContent = "kg";
      zeile.append(input, einheit);

      const zwischen = document.createElement("div");
      zwischen.className = "zwischen";
      const zText = document.createElement("span");
      zText.textContent = "Zwischensumme";
      const zSumme = document.createElement("strong");
      zSumme.id = "summe-" + p.key;
      zwischen.append(zText, zSumme);

      karte.append(kopf, zeile, zwischen);
      box.append(karte);
    });
  });

  rechneEintragen();
}

function rechneEintragen() {
  const preise = jahrDaten().preise;
  let gesamt = 0;
  PRODUKTE.forEach(p => {
    const summe = zahl(document.getElementById("kg-" + p.key).value) * preise[p.key];
    document.getElementById("summe-" + p.key).textContent = euro(summe);
    gesamt += summe;
  });
  document.getElementById("gesamt-preis").textContent = euro(gesamt);
}

function personLoeschen() {
  const person = findePerson(aktuellePersonId);
  if (!person) return;
  if (!confirm(person.name + " wirklich löschen? Die Bestellungen aus allen Jahren werden auch gelöscht.")) return;

  daten.personen = daten.personen.filter(p => p.id !== person.id);
  Object.values(daten.jahre).forEach(j => delete j.bestellungen[person.id]);
  speichern();
  zeige("liste");
}

// ---------- Screen 3: Übersicht ----------
function zeichneUebersicht() {
  document.getElementById("uebersicht-titel").textContent = "Übersicht " + daten.jahr;

  const ul = document.getElementById("uebersicht-liste");
  ul.innerHTML = "";

  const mitBestellung = daten.personen
    .filter(p => hatBestellung(p.id))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));

  let gesamt = 0, bezahlt = 0, offen = 0;

  if (mitBestellung.length === 0) {
    const li = document.createElement("li");
    li.className = "leer";
    li.textContent = "Noch keine Bestellungen für " + daten.jahr + ".";
    ul.append(li);
  }

  mitBestellung.forEach(person => {
    const preis = preisVon(person.id);
    const b = bestellungVon(person.id, true);
    gesamt += preis;
    if (b.bezahlt) bezahlt += preis; else offen += preis;

    const li = document.createElement("li");
    li.className = "bestellung";

    const links = document.createElement("div");
    links.className = "person-text";
    const name = document.createElement("span");
    name.className = "person-name";
    name.textContent = person.name;
    const info = document.createElement("span");
    info.className = "person-sub";
    info.textContent = beschreibung(person.id);
    links.append(name, info);

    const rechts = document.createElement("div");
    rechts.className = "bestellung-rechts";
    const betrag = document.createElement("strong");
    betrag.textContent = euro(preis);

    const status = document.createElement("button");
    status.type = "button";
    status.className = "status-knopf " + (b.bezahlt ? "bezahlt" : "offen");
    status.textContent = b.bezahlt ? "✓ Bezahlt" : "Offen";
    status.setAttribute("aria-label",
      person.name + ": " + (b.bezahlt ? "bezahlt, antippen für offen" : "offen, antippen für bezahlt"));
    status.addEventListener("click", () => {
      b.bezahlt = !b.bezahlt;
      speichern();
      zeichneUebersicht();
    });

    rechts.append(betrag, status);
    li.append(links, rechts);
    ul.append(li);
  });

  document.getElementById("sum-gesamt").textContent = euro(gesamt);
  document.getElementById("sum-bezahlt").textContent = euro(bezahlt);
  document.getElementById("sum-offen").textContent = euro(offen);
}

// ---------- Screen 4: Preise ----------
function zeichneEinstellungen() {
  document.getElementById("preise-titel").textContent = "Preise " + daten.jahr;

  const preise = jahrDaten().preise;
  const box = document.getElementById("preis-felder");
  box.innerHTML = "";

  GRUPPEN.forEach(gruppe => {
    const titel = document.createElement("h2");
    titel.className = "gruppe-titel";
    titel.textContent = gruppe;
    box.append(titel);

    PRODUKTE.filter(p => p.gruppe === gruppe).forEach(p => {
      const karte = document.createElement("section");
      karte.className = "karte";

      const label = document.createElement("label");
      label.className = "karte-titel";
      label.htmlFor = "preis-" + p.key;
      label.textContent = p.name;

      const zeile = document.createElement("div");
      zeile.className = "eingabe-zeile";
      const input = document.createElement("input");
      input.id = "preis-" + p.key;
      input.type = "text";
      input.inputMode = "decimal";
      input.placeholder = "0,00";
      input.autocomplete = "off";
      input.value = preise[p.key] ? String(preise[p.key]).replace(".", ",") : "";
      input.addEventListener("input", () => (input.value = nurZahlen(input.value)));
      const einheit = document.createElement("span");
      einheit.className = "einheit";
      einheit.textContent = "€ / kg";
      zeile.append(input, einheit);

      karte.append(label, zeile);
      box.append(karte);
    });
  });
}

function preiseSpeichern() {
  const preise = jahrDaten().preise;
  PRODUKTE.forEach(p => {
    preise[p.key] = zahl(document.getElementById("preis-" + p.key).value);
  });
  speichern();
  zeige("liste");
}

// ---------- Start ----------
function start() {
  laden();

  // Knöpfe verbinden
  document.getElementById("jahr").addEventListener("change", jahrGewechselt);
  document.getElementById("btn-neu").addEventListener("click", neuePersonAnzeigen);
  document.getElementById("form-neu").addEventListener("submit", neuePersonHinzufuegen);
  document.getElementById("btn-zur-uebersicht").addEventListener("click", () => zeige("uebersicht"));
  document.getElementById("btn-fertig").addEventListener("click", () => zeige("uebersicht"));
  document.getElementById("btn-loeschen").addEventListener("click", personLoeschen);
  document.getElementById("btn-einstellungen").addEventListener("click", () => zeige("einstellungen"));
  document.getElementById("btn-hinweis-preise").addEventListener("click", () => zeige("einstellungen"));
  document.getElementById("btn-preise-speichern").addEventListener("click", preiseSpeichern);

  // Alle "Zurück"-Knöpfe
  document.querySelectorAll("[data-gehe]").forEach(k =>
    k.addEventListener("click", () => zeige(k.dataset.gehe))
  );

  zeige("liste");

  // Offline-Funktion (Service Worker)
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js");
  }
}

start();
