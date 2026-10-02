"use strict";

const CSV_URL = "enigmes.csv";
const SEPARATEUR = ",";
const NB_NIVEAUX = 10;
const CLE_STOCKAGE = "enigmes-niveaux-debloques";

let enigmes = [];
let niveauCourant = 1;
let indexCourant = 0;
let niveauEnCours = null;
let niveauChoisi = null;
const clavierVirtuel = window.matchMedia("(pointer: coarse)").matches;

const elEcranMenu = document.getElementById("ecran-menu");
const elEcranJeu = document.getElementById("ecran-jeu");
const elListeNiveaux = document.getElementById("liste-niveaux");
const elFormMotDePasse = document.getElementById("form-mot-de-passe");
const elSaisieMotDePasse = document.getElementById("saisie-mot-de-passe");
const elLibelleMotDePasse = document.getElementById("libelle-mot-de-passe");
const elRetourMotDePasse = document.getElementById("retour-mot-de-passe");

const elTitreNiveau = document.getElementById("titre-niveau");
const elEnigme = document.getElementById("enigme");
const elCompteur = document.getElementById("compteur");
const elFormulaire = document.getElementById("formulaire");
const elReponse = document.getElementById("reponse");
const elFeedback = document.getElementById("feedback");
const boutonValider = document.getElementById("valider");
const boutonIndice = document.getElementById("indice");
const boutonSuivant = document.getElementById("suivant");
const boutonPrecedente = document.getElementById("precedente");
const boutonRetourMenu = document.getElementById("retour-menu");

function parseCSV(texte) {
  const lignes = texte.trim().split(/\r?\n/);
  const enTetes = couperLigne(lignes[0]).map(h => h.trim().toLowerCase());
  const colId = enTetes.indexOf("id");
  const colEnigme = enTetes.indexOf("enigme");
  const colSolution = enTetes.indexOf("solution");
  const colNiveau = enTetes.indexOf("niveau");

  const resultat = [];
  for (let i = 1; i < lignes.length; i++) {
    if (!lignes[i].trim()) continue;
    const champs = couperLigne(lignes[i]);
    if (champs.length < Math.max(colId, colEnigme, colSolution) + 1) continue;
    resultat.push({
      id: colId >= 0 ? champs[colId].trim() : String(i),
      enigme: champs[colEnigme].trim(),
      solution: champs[colSolution].trim(),
      niveau: colNiveau >= 0 ? parseInt(champs[colNiveau], 10) || 1 : 1,
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
    .replace(/\u0153/g, "oe")
    .replace(/\u00e6/g, "ae")
    .replace(/['\u2019]/g, " ")
    .replace(/^((le|la|les|l|un|une|des|du|mon|ma|mes|ton|ta|tes|son|sa|ses|notre|nos|votre|vos|lettre|chiffre|nombre)\s+)+/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function motDePasseNiveau(niveau) {
  return "bravo-niveau-" + niveau;
}

function definirFeedback(message, type) {
  elFeedback.textContent = message;
  elFeedback.className = type || "";
}

function chargerEtat() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_STOCKAGE) || "{}");
    return Number.isInteger(brut.niveauMaxDebloque) && brut.niveauMaxDebloque >= 1
      ? Math.min(brut.niveauMaxDebloque, NB_NIVEAUX)
      : 1;
  } catch {
    return 1;
  }
}

function sauverEtat(niveauMaxDebloque) {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify({ niveauMaxDebloque }));
  } catch {
    /* stockage indisponible */
  }
}

function niveauMaxDebloque() {
  return chargerEtat();
}

function enigmesDuNiveau(niveau) {
  return enigmes.filter(e => e.niveau === niveau);
}

function afficherMenu() {
  elEcranJeu.hidden = true;
  elEcranMenu.hidden = false;
  elFormMotDePasse.hidden = true;
  elRetourMotDePasse.textContent = "";
  niveauChoisi = null;
  construireListeNiveaux();
}

function construireListeNiveaux() {
  elListeNiveaux.textContent = "";
  const debloque = niveauMaxDebloque();

  for (let niveau = 1; niveau <= NB_NIVEAUX; niveau++) {
    const nb = enigmesDuNiveau(niveau).length;
    const carte = document.createElement("button");
    carte.type = "button";
    carte.className = "carte-niveau";
    carte.classList.add("theme-niveau-" + niveau);
    if (niveau > debloque) carte.classList.add("verrouille");

    const titre = document.createElement("span");
    titre.className = "niveau-titre";
    titre.textContent = "Niveau " + niveau;
    carte.appendChild(titre);

    const detail = document.createElement("span");
    detail.className = "niveau-detail";
    if (niveau < debloque) {
      detail.textContent = "Terminé";
    } else if (niveau === debloque && niveau === NB_NIVEAUX) {
      detail.textContent = nb + " énigme(s) — dernier niveau";
    } else {
      detail.textContent = nb + " énigme(s)";
    }
    carte.appendChild(detail);

    if (niveau > debloque) {
      const cadenas = document.createElement("span");
      cadenas.className = "niveau-cadenas";
      cadenas.textContent = "🔒";
      carte.appendChild(cadenas);
    }

    carte.addEventListener("click", () => choisirNiveau(niveau));
    elListeNiveaux.appendChild(carte);
  }
}

function choisirNiveau(niveau) {
  if (niveau > niveauMaxDebloque()) {
    demanderMotDePasse(niveau);
  } else {
    demarrerNiveau(niveau);
  }
}

function demanderMotDePasse(niveau) {
  niveauChoisi = niveau;
  elFormMotDePasse.hidden = false;
  elLibelleMotDePasse.textContent = "Mot de passe du niveau " + niveau + " :";
  elSaisieMotDePasse.value = "";
  elRetourMotDePasse.textContent = "";
  elRetourMotDePasse.className = "";
  elSaisieMotDePasse.focus();
  elFormMotDePasse.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function validerMotDePasse(evenement) {
  evenement.preventDefault();
  const saisie = elSaisieMotDePasse.value.trim();

  if (!niveauChoisi) return;

  if (saisie === motDePasseNiveau(niveauChoisi)) {
    const debloque = niveauMaxDebloque();
    if (niveauChoisi > debloque) {
      sauverEtat(niveauChoisi);
    }
    demarrerNiveau(niveauChoisi);
  } else {
    elRetourMotDePasse.textContent = "Mot de passe incorrect.";
    elRetourMotDePasse.className = "echec";
    elSaisieMotDePasse.select();
  }
}

function annulerMotDePasse() {
  elFormMotDePasse.hidden = true;
  elSaisieMotDePasse.value = "";
  elRetourMotDePasse.textContent = "";
  niveauChoisi = null;
}

function demarrerNiveau(niveau) {
  niveauCourant = niveau;
  niveauEnCours = enigmesDuNiveau(niveau);
  niveauEnCours.forEach(e => { e.tentatives = 0; e.resolue = false; });
  indexCourant = 0;
  elEcranMenu.hidden = true;
  elEcranJeu.hidden = false;
  elTitreNiveau.textContent = "Niveau " + niveau;
  elTitreNiveau.className = "titre-niveau theme-niveau-" + niveau;
  afficherEnigme();
}

function nbResolues() {
  return niveauEnCours.filter(e => e.resolue).length;
}

function toutesResolues() {
  return nbResolues() === niveauEnCours.length;
}

function afficherEnigme() {
  const e = niveauEnCours[indexCourant];
  elEnigme.textContent = e.enigme;
  elCompteur.textContent = `Énigme ${indexCourant + 1} / ${niveauEnCours.length} — ${nbResolues()} résolue(s)`;
  elReponse.value = "";
  if (e.resolue) {
    elReponse.disabled = true;
    boutonValider.disabled = true;
    boutonIndice.disabled = true;
    definirFeedback(`Déjà résolue : « ${e.solution} » ✅`, "succes");
  } else {
    elReponse.disabled = false;
    boutonValider.disabled = false;
    boutonIndice.disabled = false;
    if (!clavierVirtuel) elReponse.focus();
    definirFeedback("", "info");
  }
  boutonSuivant.disabled = niveauEnCours.length <= 1;
  boutonPrecedente.disabled = niveauEnCours.length <= 1;
}

function donnerIndice() {
  const solution = niveauEnCours[indexCourant].solution;
  const mot = solution
    .replace(/^(les|la|le|l['\u2019]|une?|des|du|mon|ma|mes|ton|ta|tes|son|sa|ses|notre|nos|votre|vos)\s*/i, "")
    .trim() || solution;
  const nbLettres = mot.replace(/[^a-zà-ÿœæ]/gi, "").length;
  const nbMots = mot.split(/\s+/).length;
  const detail = nbMots > 1 ? ` lettres et ${nbMots} mots` : " lettres";
  const debut = mot[0].toUpperCase();
  definirFeedback(`${nbLettres} ${detail.trim()} — commence par « ${debut} »`, "info");
}

function validerReponse(evenement) {
  evenement.preventDefault();
  const enigme = niveauEnCours[indexCourant];
  const reponseUtilisateur = normaliser(elReponse.value);
  const reponseAttendue = normaliser(enigme.solution);

  if (!reponseUtilisateur) {
    definirFeedback("Veuillez saisir une réponse.", "echec");
    return;
  }

  enigme.tentatives++;

  if (reponseUtilisateur === reponseAttendue) {
    enigme.resolue = true;
    elCompteur.textContent = `Énigme ${indexCourant + 1} / ${niveauEnCours.length} — ${nbResolues()} résolue(s)`;
    elReponse.disabled = true;
    boutonValider.disabled = true;
    boutonIndice.disabled = true;
    if (toutesResolues()) {
      terminerNiveau();
    } else {
      const restantes = niveauEnCours.length - nbResolues();
      const message = (enigme.tentatives === 1 ? "Bravo !" : "Bien joué !")
        + ` C'était bien « ${enigme.solution} ». Il reste ${restantes} énigme(s) à résoudre dans ce niveau.`;
      definirFeedback(message, "succes");
    }
  } else {
    definirFeedback("Ce n'est pas la bonne réponse, réessayez !", "echec");
    elReponse.select();
  }
}

function enigmeSuivante() {
  indexCourant = (indexCourant + 1) % niveauEnCours.length;
  afficherEnigme();
}

function enigmePrecedente() {
  indexCourant = (indexCourant - 1 + niveauEnCours.length) % niveauEnCours.length;
  afficherEnigme();
}

function terminerNiveau() {
  const debloque = niveauMaxDebloque();
  if (niveauCourant === NB_NIVEAUX) {
    definirFeedback(
      "🎉 Félicitations ! Vous avez résolu toutes les énigmes des 10 niveaux. Vous êtes un vrai maître des énigmes ! 🎉",
      "succes"
    );
    return;
  }

  const motDePasse = motDePasseNiveau(niveauCourant + 1);
  definirFeedback(
    `Niveau ${niveauCourant} terminé ! Vous avez résolu toutes les énigmes du niveau. ` +
    `Le mot de passe du niveau ${niveauCourant + 1} est : « ${motDePasse} »`,
    "succes"
  );
  if (niveauCourant + 1 > debloque) {
    sauverEtat(niveauCourant + 1);
  }
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
    afficherMenu();
  } catch (erreur) {
    elEcranMenu.hidden = true;
    elEcranJeu.hidden = false;
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
boutonPrecedente.addEventListener("click", enigmePrecedente);
boutonRetourMenu.addEventListener("click", afficherMenu);
elFormMotDePasse.addEventListener("submit", validerMotDePasse);
document.getElementById("annuler-mot-de-passe").addEventListener("click", annulerMotDePasse);

init();
