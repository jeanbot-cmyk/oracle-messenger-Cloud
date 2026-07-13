// ==========================================================
// ORACLE MESSENGER — Notifications push (Firebase Cloud Messaging)
// ==========================================================
// Ce fichier gère uniquement le CÔTÉ APPAREIL : demander la
// permission, obtenir un jeton, l'enregistrer, et afficher les
// notifications reçues au premier plan.
//
// L'ENVOI réel d'une notification (quand un message arrive) se
// fait côté serveur — voir functions/index.js (Cloud Function).
// Ce fichier seul ne suffit pas à recevoir des notifications :
// il faut aussi déployer cette fonction serveur.
//
// Nécessite une clé VAPID (Firebase Console → Paramètres du
// projet → Cloud Messaging → "Certificats push web") à placer
// dans NEXT_PUBLIC_FIREBASE_VAPID_KEY (.env.local).
// ==========================================================

import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase-config";

let messagingInstance = null;

function getMessagingSafe() {
  if (typeof window === "undefined") return null; // rendu serveur Next.js : pas de notifications côté serveur
  if (!messagingInstance) {
    try {
      messagingInstance = getMessaging();
    } catch (err) {
      console.warn("Firebase Messaging indisponible dans cet environnement :", err);
      return null;
    }
  }
  return messagingInstance;
}

/**
 * Demande la permission de notifications à l'utilisateur, récupère son
 * jeton FCM, et l'enregistre dans Firestore pour que le serveur puisse
 * lui envoyer des notifications plus tard.
 * @param {string} userId - identifiant Firebase de l'utilisateur connecté
 */
export async function registerPushNotifications(userId) {
  const messaging = getMessagingSafe();
  if (!messaging) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn("Notifications refusées par l'utilisateur.");
    return null;
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn("NEXT_PUBLIC_FIREBASE_VAPID_KEY manquante — notifications désactivées.");
    return null;
  }

  const token = await getToken(messaging, { vapidKey });
  if (token && userId) {
    // Enregistre le jeton pour que le serveur sache où envoyer les notifications
    await setDoc(doc(db, "users", userId), { fcmToken: token }, { merge: true });
  }
  return token;
}

/**
 * Écoute les notifications reçues PENDANT que l'app est ouverte au premier
 * plan (les notifications reçues en arrière-plan sont gérées par le
 * service worker firebase-messaging-sw.js, pas par cette fonction).
 * @param {(payload: object) => void} onMessageReceived
 * @returns {() => void} fonction pour arrêter l'écoute
 */
export function listenForegroundMessages(onMessageReceived) {
  const messaging = getMessagingSafe();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => onMessageReceived(payload));
}
