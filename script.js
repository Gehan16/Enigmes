"use strict";

const CSV_URL = "enigmes.csv";
const SEPARATEUR = ",";

let enigmes = [];
let indexCourant = 0;
let score = 0;

const elEnigme = document.getElementById("enigme");
const elCompteur = document.getElementById("compteur");
const elFormulaire = document.getElementById("formulaire");
const elReponse = document.getElementById("reponse");
const elFeedback = document.getElementById("feedback");
const elScore = document.getElementById("score");
const boutonValider = document.getElementById("valider");
const boutonIndice = document.getElementById("indice");
const boutonSuivant = document.getElementById("suivant");

function parseCSV(texte) {
  const lignes = texte.trim().split(/\r?\n/);
  const enTetes = couperLigne(lignes[0]).map(h => h.trim().toLowerCase());
  const colId = enTetes.indexOf("id");
  const colEnigme = enTetes.indexOf("enigme");
  const colSolution = enTetes.indexOf("solution");

  const resultat = [];
  for (let i = 1; i < lignes.length; i++) {
    if (!lignes[i].trim()) continue;
    const champs = couperLigne(lignes[i]);
    if (champs.length < Math.max(colId, colEnigme, colSolution) + 1) continue;
    resultat.push({
      id: colId >= 0 ? champs[colId].trim() : String(i),
      enigme: champs[colEnigme].trim(),
      solution: champs[colSolution].trim(),
      tentatives: 0
    });
  }
  return resultat;
}

function couperLigne(ligne) {
  const champs = [];
  let courant = "";
  let entreGuillemets = false;

  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];
    if (c === '"') {
      if (entreGuillemets && ligne[i + 1] === '"') {
        courant += '"';
        i++;
      } else {
        entreGuillemets = !entreGuillemets;
      }
    } else if (c === SEPARATEUR && !entreGuillemets) {
      champs.push(courant);
      courant = "";
    } else {
      courant += c;
    }
  }
  champs.push(courant);
  return champs;
}

function normaliser(texte) {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['\u2019]/g, " ")
    .replace(/^(le|la|les|l|un|une|des|du)\s+/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function afficherEnigme() {
  const e = enigmes[indexCourant];
  elEnigme.textContent = e.enigme;
  elCompteur.textContent = `Énigme ${indexCourant + 1} / ${enigmes.length}`;
  elReponse.value = "";
  elReponse.disabled = false;
  elReponse.focus();
  boutonValider.disabled = false;
  boutonIndice.disabled = false;
  boutonSuivant.disabled = enigmes.length <= 1;
  definirFeedback("", "info");
}

function definirFeedback(message, type) {
  elFeedback.textContent = message;
  elFeedback.className = type || "";
}

function donnerIndice() {
  const solution = enigmes[indexCourant].solution;
  const indice = `${solution.length} lettres — commence par « ${solution[0].toUpperCase()} »`;
  definirFeedback(indice, "info");
}

function validerReponse(evenement) {
  evenement.preventDefault();
  const enigme = enigmes[indexCourant];
  const reponseUtilisateur = normaliser(elReponse.value);
  const reponseAttendue = normaliser(enigme.solution);

  if (!reponseUtilisateur) {
    definirFeedback("Veuillez saisir une réponse.", "echec");
    return;
  }

  enigme.tentatives++;

  if (reponseUtilisateur === reponseAttendue) {
    const message = enigme.tentatives === 1
      ? `Bravo ! C'était bien « ${enigme.solution} ».`
      : `Bien joué ! La réponse était « ${enigme.solution} ».`;
    definirFeedback(message, "succes");
    if (enigme.tentatives === 1) {
      score++;
      elScore.textContent = score;
    }
    elReponse.disabled = true;
    boutonValider.disabled = true;
    boutonIndice.disabled = true;
    boutonSuivant.disabled = false;
    boutonSuivant.focus();
  } else {
    definirFeedback("Ce n'est pas la bonne réponse, réessayez !", "echec");
    elReponse.select();
  }
}

function enigmeSuivante() {
  indexCourant = (indexCourant + 1) % enigmes.length;
  afficherEnigme();
}

async function init() {
  try {
    const reponse = await fetch(CSV_URL);
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    const texte = await reponse.text();
    enigmes = parseCSV(texte);

    if (enigmes.length === 0) {
      elEnigme.textContent = "Aucune énigme trouvée dans le fichier CSV.";
      boutonValider.disabled = true;
      boutonIndice.disabled = true;
      return;
    }
    afficherEnigme();
  } catch (erreur) {
    elEnigme.textContent =
      "Impossible de charger le fichier enigmes.csv. " +
      "Ouvrez la page via un petit serveur local (ex. : python3 -m http.server) " +
      "ou depuis un hébergement web.";
    boutonValider.disabled = true;
    boutonIndice.disabled = true;
    console.error(erreur);
  }
}

elFormulaire.addEventListener("submit", validerReponse);
boutonIndice.addEventListener("click", donnerIndice);
boutonSuivant.addEventListener("click", enigmeSuivante);

init();
