// ===================================================
//  Wurst & Speck – App für Tata
//  Alle Daten werden auf dem Handy gespeichert (localStorage).
// ===================================================

const SPEICHER_KEY = "wurst-speck-daten";

// ---------- Daten ----------
// So sieht eine Person aus:
// { id: 1, name: "Anna", speck: "1,5", wurst: "2", bezahlt: false }
let daten = {
  preise: { speck: 0, wurst: 0 },
  personen: [],
  naechsteId: 1
};

let aktuellePersonId = null;

function laden() {
  const gespeichert = localStorage.getItem(SPEICHER_KEY);
  if (gespeichert) {
    try {
      daten = JSON.parse(gespeichert);
    } catch (e) {
      console.error("Daten konnten nicht geladen werden", e);
    }
  }
}

function speichern() {
  localStorage.setItem(SPEICHER_KEY, JSON.stringify(daten));
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

function preisVon(person) {
  return zahl(person.speck) * daten.preise.speck + zahl(person.wurst) * daten.preise.wurst;
}

function hatBestellung(person) {
  return zahl(person.speck) > 0 || zahl(person.wurst) > 0;
}

function beschreibung(person) {
  const teile = [];
  if (zahl(person.speck) > 0) teile.push(kilo(zahl(person.speck)) + " Speck");
  if (zahl(person.wurst) > 0) teile.push(kilo(zahl(person.wurst)) + " Wurst");
  return teile.join(" · ");
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

// ---------- Screen 1: Namensliste ----------
function zeichneListe() {
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

    if (hatBestellung(person)) {
      const preis = preisVon(person);
      sub.textContent = euro(preis) + " · " + beschreibung(person);

      const badge = document.createElement("span");
      badge.className = "badge " + (person.bezahlt ? "bezahlt" : "offen");
      badge.textContent = person.bezahlt ? "Bezahlt" : "Offen";
      knopf.append(badge);

      if (!person.bezahlt) offen += preis;
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

  // Hinweis, wenn noch keine Preise eingestellt sind
  const keinePreise = daten.preise.speck === 0 && daten.preise.wurst === 0;
  document.getElementById("hinweis-preise").hidden = !keinePreise;

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

  const person = { id: daten.naechsteId, name: name, speck: "", wurst: "", bezahlt: false };
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
  document.getElementById("kg-speck").value = person.speck;
  document.getElementById("kg-wurst").value = person.wurst;
  document.getElementById("preis-speck-anzeige").textContent = euro(daten.preise.speck);
  document.getElementById("preis-wurst-anzeige").textContent = euro(daten.preise.wurst);
  rechneEintragen();
}

function rechneEintragen() {
  const speck = zahl(document.getElementById("kg-speck").value);
  const wurst = zahl(document.getElementById("kg-wurst").value);
  const summeSpeck = speck * daten.preise.speck;
  const summeWurst = wurst * daten.preise.wurst;

  document.getElementById("summe-speck").textContent = euro(summeSpeck);
  document.getElementById("summe-wurst").textContent = euro(summeWurst);
  document.getElementById("gesamt-preis").textContent = euro(summeSpeck + summeWurst);
}

function eingabeGeaendert(event) {
  const feld = event.target;
  feld.value = nurZahlen(feld.value);

  const person = findePerson(aktuellePersonId);
  if (person) {
    person.speck = document.getElementById("kg-speck").value;
    person.wurst = document.getElementById("kg-wurst").value;
    speichern();
  }
  rechneEintragen();
}

function personLoeschen() {
  const person = findePerson(aktuellePersonId);
  if (!person) return;
  if (!confirm(person.name + " wirklich löschen?")) return;

  daten.personen = daten.personen.filter(p => p.id !== person.id);
  speichern();
  zeige("liste");
}

// ---------- Screen 3: Übersicht ----------
function zeichneUebersicht() {
  const ul = document.getElementById("uebersicht-liste");
  ul.innerHTML = "";

  const mitBestellung = daten.personen
    .filter(hatBestellung)
    .sort((a, b) => a.name.localeCompare(b.name, "de"));

  let gesamt = 0, bezahlt = 0, offen = 0;

  if (mitBestellung.length === 0) {
    const li = document.createElement("li");
    li.className = "leer";
    li.textContent = "Noch keine Bestellungen eingetragen.";
    ul.append(li);
  }

  mitBestellung.forEach(person => {
    const preis = preisVon(person);
    gesamt += preis;
    if (person.bezahlt) bezahlt += preis; else offen += preis;

    const li = document.createElement("li");
    li.className = "bestellung";

    const links = document.createElement("div");
    links.className = "person-text";
    const name = document.createElement("span");
    name.className = "person-name";
    name.textContent = person.name;
    const info = document.createElement("span");
    info.className = "person-sub";
    info.textContent = beschreibung(person);
    links.append(name, info);

    const rechts = document.createElement("div");
    rechts.className = "bestellung-rechts";
    const betrag = document.createElement("strong");
    betrag.textContent = euro(preis);

    const status = document.createElement("button");
    status.type = "button";
    status.className = "status-knopf " + (person.bezahlt ? "bezahlt" : "offen");
    status.textContent = person.bezahlt ? "✓ Bezahlt" : "Offen";
    status.setAttribute("aria-label",
      person.name + ": " + (person.bezahlt ? "bezahlt, antippen für offen" : "offen, antippen für bezahlt"));
    status.addEventListener("click", () => {
      person.bezahlt = !person.bezahlt;
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
  const fmt = n => (n ? String(n).replace(".", ",") : "");
  document.getElementById("preis-speck").value = fmt(daten.preise.speck);
  document.getElementById("preis-wurst").value = fmt(daten.preise.wurst);
}

function preiseSpeichern() {
  daten.preise.speck = zahl(document.getElementById("preis-speck").value);
  daten.preise.wurst = zahl(document.getElementById("preis-wurst").value);
  speichern();
  zeige("liste");
}

// ---------- Start ----------
function start() {
  laden();

  // Knöpfe verbinden
  document.getElementById("btn-neu").addEventListener("click", neuePersonAnzeigen);
  document.getElementById("form-neu").addEventListener("submit", neuePersonHinzufuegen);
  document.getElementById("btn-zur-uebersicht").addEventListener("click", () => zeige("uebersicht"));
  document.getElementById("btn-fertig").addEventListener("click", () => zeige("uebersicht"));
  document.getElementById("btn-loeschen").addEventListener("click", personLoeschen);
  document.getElementById("btn-einstellungen").addEventListener("click", () => zeige("einstellungen"));
  document.getElementById("btn-hinweis-preise").addEventListener("click", () => zeige("einstellungen"));
  document.getElementById("btn-preise-speichern").addEventListener("click", preiseSpeichern);

  document.getElementById("kg-speck").addEventListener("input", eingabeGeaendert);
  document.getElementById("kg-wurst").addEventListener("input", eingabeGeaendert);
  ["preis-speck", "preis-wurst"].forEach(id =>
    document.getElementById(id).addEventListener("input", e => (e.target.value = nurZahlen(e.target.value)))
  );

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
