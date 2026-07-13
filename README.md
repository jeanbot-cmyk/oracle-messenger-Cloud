# Oracle Messenger — Guide de déploiement

Ce dossier contient le projet technique d'Oracle Messenger, avec les
vraies connexions Firebase branchées :

- **Authentification par téléphone** (vrais SMS via Firebase Auth)
- **Messagerie temps réel** entre deux téléphones (Firestore comme relais)
- **Appels audio/vidéo réels** (WebRTC avec signalisation Firestore)
- **Stockage local** (IndexedDB) pour l'historique sur l'appareil

**Important à savoir** : ce code a été écrit selon les standards Firebase/
WebRTC officiels, mais n'a pas pu être testé avec deux téléphones réels
dans cet environnement de développement — le premier vrai test aura donc
lieu une fois déployé. Si un comportement ne fonctionne pas comme prévu,
dis-le-moi avec le message d'erreur exact et je corrige.

Chaque fonctionnalité a un **repli automatique en mode démonstration**
si la connexion réelle échoue (ex: pas de deuxième appareil connecté),
donc l'app reste utilisable et testable même partiellement déployée.


## 1. Avant toute chose : sécurité

Si le mot de passe root de ce serveur a été partagé ailleurs (email, chat,
etc.), **change-le immédiatement** :

```bash
passwd
```

Idéalement, mets aussi en place une connexion par clé SSH plutôt que par
mot de passe, et désactive la connexion root directe une fois un autre
utilisateur créé.

## Déploiement sur Google Cloud (Firebase App Hosting) — méthode recommandée

Cette méthode fait tourner l'application sur l'infrastructure Google Cloud
(Cloud Run), reliée directement à ton projet Firebase existant
(`tchingankong`). Toutes les commandes ci-dessous s'exécutent sur ton
ordinateur ou via Termux.

### Étape 1 — Installer les outils

```bash
npm install -g firebase-tools
firebase login
```

La commande `login` ouvre un lien à visiter dans un navigateur pour te
connecter avec ton compte Google.

### Étape 2 — Se placer dans le projet

```bash
cd oracle-messenger-app
firebase use tchingankong
```

### Étape 3 — Passer le projet Firebase en plan Blaze (paiement à l'usage)

Firebase App Hosting nécessite ce plan. Va sur la Firebase Console → ton
projet → icône ⚙️ → "Utilisation et facturation" → passe au plan Blaze
(carte bancaire requise, mais la facturation reste proche de 0€ pour un
usage naissant).

### Étape 4 — Pousser le projet sur GitHub

Firebase App Hosting se déploie depuis un dépôt GitHub, pas depuis un zip
local. Si ce n'est pas encore fait :

```bash
git init
git add .
git commit -m "Premier envoi Oracle Messenger"
git branch -M main
git remote add origin https://github.com/TON-NOM-UTILISATEUR/oracle-messenger.git
git push -u origin main
```

### Étape 5 — Créer le backend App Hosting (une seule fois)

```bash
firebase apphosting:backends:create --project=tchingankong
```

Réponds aux questions :
- Région : choisis la plus proche de tes utilisateurs (ex: `europe-west1`)
- Dépôt GitHub : connecte le dépôt que tu viens de pousser

### Étape 6 — Configurer les secrets (clés sensibles)

```bash
firebase apphosting:secrets:set NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_VAPID_KEY
```

Chaque commande te demande de coller la valeur, puis de l'associer à ton
backend App Hosting quand elle le propose.

### Étape 7 — Déployer les règles Firestore et les Cloud Functions

```bash
firebase deploy --only firestore:rules,functions
```

### Étape 8 — Déployer l'application elle-même

```bash
firebase apphosting:backends:deploy --project=tchingankong
```

Ensuite, chaque `git push` déclenche automatiquement un nouveau
déploiement.

### Étape 9 — Pointer messenger.oracle-plus.online dessus

```bash
firebase apphosting:backends:get --project=tchingankong
```

Cette commande affiche l'URL Google Cloud de ton backend et les
instructions DNS exactes (généralement un enregistrement CNAME) à ajouter
chez ton registrar.

---

## Alternative : déploiement sur un VPS classique

Si tu préfères ton VPS existant plutôt que Google Cloud, voici la méthode
équivalente (les deux sont indépendantes, choisis-en une seule) :

## 2. Préparer le serveur (une seule fois)

Connecte-toi en SSH à ton serveur :

```bash
ssh root@180.149.196.5
```

Installe Node.js (version 20 recommandée) :

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node -v   # doit afficher v20.x
```

Installe PM2 (gestionnaire de processus, garde l'app en ligne 24/7) :

```bash
npm install -g pm2
```

Installe Nginx (pour le reverse proxy et le HTTPS) :

```bash
apt-get install -y nginx certbot python3-certbot-nginx
```

## 3. Envoyer le projet sur le serveur

Depuis ton ordinateur, dans le dossier où tu as extrait ce zip :

```bash
scp -r oracle-messenger-app root@180.149.196.5:/var/www/
```

(Remplace le chemin si tu préfères un autre emplacement.)

## 4. Installer et construire l'application

Sur le serveur (en SSH) :

```bash
cd /var/www/oracle-messenger-app
npm install
npm run build
```

## 5. Lancer l'application avec PM2

```bash
pm2 start npm --name "oracle-messenger" -- start
pm2 save
pm2 startup
```

Vérifie que ça tourne :

```bash
pm2 status
curl http://localhost:3000
```

## 6. Configurer Nginx pour messenger.oracle-plus.online

Crée le fichier `/etc/nginx/sites-available/oracle-messenger` :

```nginx
server {
    listen 80;
    server_name messenger.oracle-plus.online;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Active-le :

```bash
ln -s /etc/nginx/sites-available/oracle-messenger /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

## 7. Pointer le sous-domaine (côté gestion DNS)

Chez ton registrar (là où tu gères oracle-plus.online), ajoute un
enregistrement DNS :

```
Type : A
Nom  : messenger
Valeur : 180.149.196.5
```

Cela remplacera l'ancienne version hébergée ailleurs, une fois la
propagation DNS terminée (jusqu'à quelques heures).

## 8. Activer le HTTPS (obligatoire pour une PWA)

```bash
certbot --nginx -d messenger.oracle-plus.online
```

## 9. Vérification finale

Ouvre `https://messenger.oracle-plus.online` depuis un téléphone — tu
dois voir l'écran d'accueil d'Oracle Messenger avec le cadenas HTTPS actif.

---

## Ce qui est maintenant réellement branché

- ✅ Inscription par téléphone + vrai SMS Firebase
- ✅ Messages texte synchronisés en temps réel entre deux téléphones (Firestore)
- ✅ Modifier/supprimer un message pour tous, en temps réel
- ✅ Appels audio/vidéo réels (WebRTC, connexion directe entre appareils)
- ✅ Sauvegarde locale des messages (IndexedDB)
- ✅ Paiement Paystack (dons + abonnement Hub Business) — **prêt mais inactif
  tant que tu n'as pas fourni ta clé publique** (voir ci-dessous)
- ✅ Notifications push (Firebase Cloud Messaging) — **structure complète,
  nécessite un déploiement de Cloud Function** (voir ci-dessous)

## Activer les notifications push

1. Firebase Console → ⚙️ Paramètres du projet → onglet **Cloud Messaging**
2. Section "Certificats push web" → génère une paire de clés
3. Copie la clé dans `.env.local` :
   ```
   NEXT_PUBLIC_FIREBASE_VAPID_KEY=xxxxxxxxxxxxxxxxxxxx
   ```
4. Déploie la Cloud Function qui envoie les vraies notifications :
   ```bash
   npm install -g firebase-tools
   firebase login
   cd functions && npm install && cd ..
   firebase deploy --only functions
   ```

Sans cette Cloud Function déployée, l'app peut demander la permission et
obtenir un jeton, mais **aucune notification ne sera réellement envoyée**
quand un message arrive — c'est elle qui fait le lien.

## Ajouter ta clé Paystack (quand tu l'auras)

1. Copie le fichier `.env.example` en `.env.local` :
   ```bash
   cp .env.example .env.local
   ```
2. Ouvre `.env.local` et colle ta **clé publique** Paystack (celle qui
   commence par `pk_live_...` ou `pk_test_...` pour tester d'abord) :
   ```
   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx
   ```
3. Vérifie aussi la devise activée sur ton compte Paystack (XOF n'est pas
   disponible pour tous les comptes selon le pays) et ajuste si besoin :
   ```
   NEXT_PUBLIC_PAYSTACK_CURRENCY=XOF
   ```
4. Relance l'application (`npm run build && pm2 restart oracle-messenger`)

**Important** : ne mets JAMAIS ta clé **secrète** Paystack (`sk_...`) dans
ce projet — elle ne doit exister que côté serveur, pour la vérification
des paiements (à mettre en place plus tard via une Cloud Function ou un
petit serveur séparé). La clé publique, elle, est sans danger à exposer.

Tant que la clé n'est pas configurée, les boutons "Faire un don" et
"Débloquer via Oracle Plus" fonctionnent en mode démonstration (validation
immédiate, sans vrai paiement) — donc l'app reste testable en attendant.

## Ce qui reste à construire

- **Transfert P2P des fichiers volumineux** (photos/vidéos/documents envoyés
  dans le chat) — actuellement affichés localement mais pas encore transmis
  réellement à l'autre téléphone (nécessite un canal de données WebRTC dédié)
- **Annuaire d'utilisateurs réel** — actuellement une seule conversation de
  démonstration partagée ; il faut un système pour retrouver un contact par
  son numéro de téléphone et créer une conversation par paire d'utilisateurs
- Panel d'administration côté serveur
- Intégration Paystack pour les paiements (Hub Business, Dons)
- Règles de sécurité Firestore (actuellement le projet utilise les règles
  par défaut — **à durcir avant un lancement public**, voir étape 10)

## 10. Sécuriser Firestore (avant lancement public)

Dans la console Firebase → Firestore Database → Rules, remplace les règles
par défaut par des règles qui vérifient que seul un utilisateur authentifié
peut lire/écrire ses propres conversations. Sans ça, n'importe qui peut lire
ou écrire dans ta base de données.

