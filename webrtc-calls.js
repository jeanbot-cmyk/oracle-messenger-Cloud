// ==========================================================
// ORACLE MESSENGER — Appels audio/vidéo réels (WebRTC)
// ==========================================================
// Le serveur (Firestore) ne sert que de "boîte aux lettres"
// pour l'échange initial de connexion (offre/réponse/ICE) —
// une fois la connexion établie, l'audio/vidéo circule
// directement entre les deux téléphones (peer-to-peer),
// jamais via le serveur.
//
// Basé sur le modèle standard Firebase WebRTC codelab.
// ==========================================================

import { db } from "./firebase-config";
import {
  doc,
  collection,
  addDoc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

/**
 * Démarre un appel sortant. À utiliser côté appelant.
 * @param {string} callId - identifiant unique de l'appel (ex: conversationId + timestamp)
 * @param {"audio"|"video"} type
 * @param {(remoteStream: MediaStream) => void} onRemoteStream
 * @returns {{ pc: RTCPeerConnection, localStream: MediaStream, hangUp: () => Promise<void> }}
 */
export async function startCall(callId, type, onRemoteStream) {
  const pc = new RTCPeerConnection(ICE_SERVERS);
  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: type === "video",
  });
  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

  const remoteStream = new MediaStream();
  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t));
    onRemoteStream(remoteStream);
  };

  const callDoc = doc(db, "calls", callId);
  const offerCandidates = collection(callDoc, "offerCandidates");
  const answerCandidates = collection(callDoc, "answerCandidates");

  pc.onicecandidate = (event) => {
    if (event.candidate) addDoc(offerCandidates, event.candidate.toJSON());
  };

  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  await setDoc(callDoc, {
    offer: { sdp: offerDescription.sdp, type: offerDescription.type },
    type,
    createdAt: Date.now(),
  });

  const unsubCall = onSnapshot(callDoc, (snapshot) => {
    const data = snapshot.data();
    if (data?.answer && !pc.currentRemoteDescription) {
      pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  });

  const unsubCandidates = onSnapshot(answerCandidates, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
      }
    });
  });

  async function hangUp() {
    unsubCall();
    unsubCandidates();
    pc.close();
    localStream.getTracks().forEach((t) => t.stop());
    await deleteDoc(callDoc).catch(() => {});
  }

  return { pc, localStream, hangUp };
}

/**
 * Répond à un appel entrant. À utiliser côté destinataire.
 * @param {string} callId
 * @param {(remoteStream: MediaStream) => void} onRemoteStream
 */
export async function answerCall(callId, onRemoteStream) {
  const callDoc = doc(db, "calls", callId);
  const callSnapshot = await getDoc(callDoc);
  const callData = callSnapshot.data();
  if (!callData) throw new Error("Appel introuvable ou déjà terminé.");

  const pc = new RTCPeerConnection(ICE_SERVERS);
  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: callData.type === "video",
  });
  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

  const remoteStream = new MediaStream();
  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t));
    onRemoteStream(remoteStream);
  };

  const offerCandidates = collection(callDoc, "offerCandidates");
  const answerCandidates = collection(callDoc, "answerCandidates");

  pc.onicecandidate = (event) => {
    if (event.candidate) addDoc(answerCandidates, event.candidate.toJSON());
  };

  await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  await updateDoc(callDoc, {
    answer: { sdp: answerDescription.sdp, type: answerDescription.type },
  });

  const unsubCandidates = onSnapshot(offerCandidates, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
      }
    });
  });

  async function hangUp() {
    unsubCandidates();
    pc.close();
    localStream.getTracks().forEach((t) => t.stop());
    await deleteDoc(callDoc).catch(() => {});
  }

  return { pc, localStream, hangUp };
}
