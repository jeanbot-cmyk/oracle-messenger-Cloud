// ==========================================================
// ORACLE MESSENGER — Configuration Firebase
// ==========================================================
// Ce fichier initialise Firebase et expose les fonctions
// nécessaires à l'authentification par numéro de téléphone.
//
// Installation requise avant utilisation :
//   npm install firebase
// ==========================================================

import { initializeApp } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Clés de ton projet Firebase (safe à exposer côté client :
// ces clés identifient le projet, elles ne sont pas secrètes).
const firebaseConfig = {
  apiKey: "AIzaSyA9UHWSZXDwgpSEG5ZyI8LdljxQedkI07A",
  authDomain: "tchingankong.firebaseapp.com",
  projectId: "tchingankong",
  storageBucket: "tchingankong.firebasestorage.app",
  messagingSenderId: "734297398479",
  appId: "1:734297398479:web:34810bf67f7aeff2c86bba",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Prépare le vérificateur invisible anti-robot (reCAPTCHA),
 * obligatoire pour l'envoi de SMS via Firebase.
 * À appeler une seule fois, quand l'écran "numéro de téléphone" s'affiche.
 *
 * @param {string} containerId - id d'un <div> vide présent dans la page
 */
export function initRecaptcha(containerId = "recaptcha-container") {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
    });
  }
  return window.recaptchaVerifier;
}

/**
 * Envoie le code de vérification par SMS au numéro donné.
 * @param {string} phoneNumber - format international obligatoire, ex: "+237600000000"
 * @returns {Promise<ConfirmationResult>} objet à conserver pour vérifier le code ensuite
 */
export async function sendVerificationCode(phoneNumber) {
  const verifier = initRecaptcha();
  const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
  return confirmationResult; // à stocker (ex: dans le state React) pour l'étape suivante
}

/**
 * Vérifie le code à 6 chiffres saisi par l'utilisateur.
 * @param {ConfirmationResult} confirmationResult - obtenu depuis sendVerificationCode()
 * @param {string} code - les 6 chiffres saisis par l'utilisateur
 * @returns {Promise<UserCredential>} contient l'utilisateur authentifié (userCredential.user)
 */
export async function verifyCode(confirmationResult, code) {
  const userCredential = await confirmationResult.confirm(code);
  return userCredential;
}
