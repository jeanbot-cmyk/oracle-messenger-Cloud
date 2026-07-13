// ==========================================================
// ORACLE MESSENGER — Cloud Functions (backend serveur)
// ==========================================================
// Ces fonctions tournent sur les serveurs de Firebase, jamais
// sur le téléphone. C'est le seul endroit où des opérations
// sensibles (envoi de notifications, vérification de paiement)
// doivent avoir lieu.
//
// Déploiement : depuis la racine du projet,
//   npm install -g firebase-tools
//   firebase login
//   firebase init functions   (choisir ce dossier "functions")
//   firebase deploy --only functions
// ==========================================================

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();
const messaging = getMessaging();

/**
 * Se déclenche automatiquement à chaque nouveau message envoyé dans
 * n'importe quelle conversation. Envoie une notification push au
 * destinataire (pas à l'expéditeur).
 */
exports.onNewMessage = onDocumentCreated(
  "conversations/{conversationId}/messages/{messageId}",
  async (event) => {
    const message = event.data.data();
    const { conversationId } = event.params;

    if (!message?.senderId) return;

    // Récupère les participants de la conversation pour trouver le destinataire.
    // NOTE : nécessite une collection "conversations/{conversationId}" avec un
    // champ "participants" (tableau de 2 identifiants utilisateur) — à créer
    // lors de la prise de contact entre deux utilisateurs (voir audit.md,
    // point sur l'annuaire de contacts).
    const conversationDoc = await db.collection("conversations").doc(conversationId).get();
    const participants = conversationDoc.data()?.participants || [];
    const recipientId = participants.find((id) => id !== message.senderId);
    if (!recipientId) {
      console.warn(`Aucun destinataire trouvé pour la conversation ${conversationId}`);
      return;
    }

    const recipientDoc = await db.collection("users").doc(recipientId).get();
    const fcmToken = recipientDoc.data()?.fcmToken;
    if (!fcmToken) {
      console.warn(`Pas de jeton de notification pour l'utilisateur ${recipientId}`);
      return;
    }

    const senderDoc = await db.collection("users").doc(message.senderId).get();
    const senderName = senderDoc.data()?.displayName || "Nouveau message";

    await messaging.send({
      token: fcmToken,
      notification: {
        title: senderName,
        body: message.text || "📎 Fichier envoyé",
      },
      webpush: {
        fcmOptions: {
          link: "https://messenger.oracle-plus.online",
        },
      },
    });
  }
);

/**
 * Vérifie un paiement Paystack CÔTÉ SERVEUR avant de débloquer une
 * fonctionnalité premium. Indispensable : sans cette vérification,
 * n'importe qui pourrait modifier le code du navigateur pour se
 * déclarer "payé" sans avoir réellement payé.
 *
 * À appeler depuis le frontend juste après le callback Paystack,
 * avec la référence de transaction reçue.
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");

exports.verifyPaystackPayment = onCall(async (request) => {
  const { reference } = request.data;
  if (!reference) throw new HttpsError("invalid-argument", "Référence de transaction manquante.");

  const secretKey = process.env.PAYSTACK_SECRET_KEY; // configuré via `firebase functions:secrets:set PAYSTACK_SECRET_KEY`
  if (!secretKey) throw new HttpsError("failed-precondition", "Clé secrète Paystack non configurée côté serveur.");

  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const result = await response.json();

  if (!result.status || result.data?.status !== "success") {
    throw new HttpsError("failed-precondition", "Paiement non confirmé par Paystack.");
  }

  // Paiement confirmé : on peut maintenant, par exemple, marquer
  // l'utilisateur comme "premium" dans Firestore en toute confiance.
  const uid = request.auth?.uid;
  if (uid) {
    await db.collection("users").doc(uid).set(
      { premiumUntil: Date.now() + 30 * 24 * 60 * 60 * 1000 },
      { merge: true }
    );
  }

  return { verified: true, amount: result.data.amount / 100 };
});
