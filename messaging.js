// ==========================================================
// ORACLE MESSENGER — Messagerie temps réel (Firestore)
// ==========================================================
// Firestore sert ici de RELAIS entre les deux téléphones,
// pas de stockage permanent : une fois qu'un message a été
// livré ET lu par le destinataire, il peut être supprimé du
// serveur (voir cleanupDeliveredMessage) — l'historique
// définitif reste dans IndexedDB, en local (voir localStore.js).
//
// Installation requise : npm install firebase
// ==========================================================

import { db } from "./firebase-config";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Construit un identifiant de conversation stable et unique pour deux
 * utilisateurs, quel que soit l'ordre dans lequel on les passe.
 * @param {string} uidA
 * @param {string} uidB
 */
export function conversationIdFor(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

/**
 * Envoie un message dans une conversation. Le message transite par
 * Firestore le temps d'être livré, puis peut être nettoyé du serveur.
 * @param {string} conversationId
 * @param {{ senderId: string, text?: string, media?: object }} message
 */
export async function sendMessage(conversationId, message) {
  const messagesRef = collection(db, "conversations", conversationId, "messages");
  return addDoc(messagesRef, {
    ...message,
    status: "sent", // sent -> delivered -> read
    createdAt: serverTimestamp(),
  });
}

/**
 * Écoute en temps réel les messages d'une conversation.
 * Appelle `callback` à chaque changement (nouveau message, edit, suppression).
 * @param {string} conversationId
 * @param {(messages: Array) => void} callback
 * @returns {() => void} fonction à appeler pour arrêter l'écoute
 */
export function subscribeToMessages(conversationId, callback) {
  const messagesRef = collection(db, "conversations", conversationId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(messages);
  });
}

export async function markDelivered(conversationId, messageId) {
  const ref = doc(db, "conversations", conversationId, "messages", messageId);
  return updateDoc(ref, { status: "delivered" });
}

export async function markRead(conversationId, messageId) {
  const ref = doc(db, "conversations", conversationId, "messages", messageId);
  return updateDoc(ref, { status: "read" });
}

export async function editMessage(conversationId, messageId, newText) {
  const ref = doc(db, "conversations", conversationId, "messages", messageId);
  return updateDoc(ref, { text: newText, edited: true });
}

/**
 * Supprime un message pour tout le monde (des deux côtés), sans trace.
 */
export async function deleteMessageEverywhere(conversationId, messageId) {
  const ref = doc(db, "conversations", conversationId, "messages", messageId);
  return deleteDoc(ref);
}

/**
 * À appeler une fois qu'un message "lu" a bien été copié dans le
 * stockage local (IndexedDB) des deux côtés : supprime la copie
 * serveur pour respecter l'esprit "zéro stockage serveur" du cahier
 * des charges. Idéalement déclenché par une Cloud Function planifiée.
 */
export async function cleanupDeliveredMessage(conversationId, messageId) {
  return deleteMessageEverywhere(conversationId, messageId);
}
