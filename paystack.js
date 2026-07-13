// ==========================================================
// ORACLE MESSENGER — Paiements Paystack
// ==========================================================
// La clé PUBLIQUE Paystack (pas la clé secrète !) se configure
// via une variable d'environnement, jamais en dur dans le code :
//
//   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxx
//
// Tant que cette variable n'est pas définie, l'app reste en
// mode démonstration (paiement simulé) pour ne jamais bloquer
// les tests avant que la vraie clé soit disponible.
//
// Rappel sécurité : la clé SECRÈTE Paystack (sk_...) ne doit
// JAMAIS apparaître dans ce projet frontend. Elle sert
// uniquement côté serveur (vérification de paiement, webhooks).
// ==========================================================

const PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";

export function isPaystackConfigured() {
  return Boolean(PUBLIC_KEY);
}

function loadPaystackScript() {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) return resolve();
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Impossible de charger Paystack"));
    document.body.appendChild(script);
  });
}

/**
 * Lance le paiement Paystack (popup officiel).
 * @param {{
 *   email: string,           // requis par Paystack, même sans compte utilisateur classique
 *   amountFcfa: number,      // montant en FCFA (converti en centimes selon la devise du compte Paystack)
 *   reference?: string,      // référence unique de transaction
 *   metadata?: object,       // infos additionnelles (ex: { type: "don" } ou { type: "abonnement_business" })
 *   onSuccess: (reference: string) => void,
 *   onClose?: () => void,
 * }} params
 */
export async function payWithPaystack({ email, amountFcfa, reference, metadata, onSuccess, onClose }) {
  if (!isPaystackConfigured()) {
    throw new Error("Clé publique Paystack non configurée (NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY manquante).");
  }

  await loadPaystackScript();

  return new Promise((resolve, reject) => {
    try {
      const handler = window.PaystackPop.setup({
        key: PUBLIC_KEY,
        email,
        amount: Math.round(amountFcfa) * 100, // Paystack attend le montant dans la plus petite unité monétaire
        ref: reference || `oracle_${Date.now()}`,
        metadata: metadata || {},
        currency: process.env.NEXT_PUBLIC_PAYSTACK_CURRENCY || "XOF", // à vérifier selon les devises activées sur ton compte Paystack
        callback: (response) => {
          onSuccess?.(response.reference);
          resolve(response.reference);
        },
        onClose: () => {
          onClose?.();
          reject(new Error("Paiement annulé par l'utilisateur"));
        },
      });
      handler.openIframe();
    } catch (err) {
      reject(err);
    }
  });
}
