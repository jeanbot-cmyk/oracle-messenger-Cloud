// Service worker requis par Firebase Cloud Messaging pour recevoir les
// notifications push même quand l'application n'est pas ouverte.
// Doit être servi depuis la racine du site (/firebase-messaging-sw.js).

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Mêmes clés que src/lib/firebase-config.js (clés publiques, sans danger à exposer)
firebase.initializeApp({
  apiKey: "AIzaSyA9UHWSZXDwgpSEG5ZyI8LdljxQedkI07A",
  authDomain: "tchingankong.firebaseapp.com",
  projectId: "tchingankong",
  storageBucket: "tchingankong.firebasestorage.app",
  messagingSenderId: "734297398479",
  appId: "1:734297398479:web:34810bf67f7aeff2c86bba",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || "Oracle Messenger", {
    body: body || "Nouveau message",
    icon: icon || "/icon-192.png",
    badge: "/icon-192.png",
  });
});
