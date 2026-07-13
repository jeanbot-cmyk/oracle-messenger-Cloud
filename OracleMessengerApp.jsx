"use client";

import React, { useState, useEffect, useRef } from "react";
import { Phone, ArrowLeft, Check, CheckCheck, Menu, Search, MoreVertical, Send, Smile, Paperclip, Mic, Download, Sparkles, Images, HeartHandshake, NotebookPen, Share2, Briefcase, Info, Sun, ChevronRight, Lock, Tag, Megaphone, Bot, LinkIcon, Copy, TrendingUp, Users, Palette, Video, PhoneCall, UserPlus, Contact, MessageCircle, PhoneOff, VideoOff, MicOff, Volume2, PhoneIncoming, Plus, Trash2, Calendar, Mic2, FileText, Heart, Facebook, MessageSquareText, Film, Image as ImageIcon, FileIcon, Play, Edit3, Archive, X, Crop, SlidersHorizontal, Type, RotateCw, Save, CircleUserRound } from "lucide-react";
import { initRecaptcha, sendVerificationCode, verifyCode } from "../lib/firebase-config";
import { sendMessage as fbSendMessage, subscribeToMessages, markDelivered, markRead, editMessage as fbEditMessage, deleteMessageEverywhere } from "../lib/messaging";
import { startCall, answerCall } from "../lib/webrtc-calls";
import { put as localPut, getMessagesForConversation } from "../lib/localStore";
import { payWithPaystack, isPaystackConfigured } from "../lib/paystack";
import { registerPushNotifications, listenForegroundMessages } from "../lib/push-notifications";

// Identifiant de conversation utilisé pour cette démo (en production,
// généré à partir des deux identifiants Firebase des participants).
const DEMO_CONVERSATION_ID = "demo-conversation";
// NOTE : la vraie connexion Firebase (fichier firebase-config.js fourni séparément)
// sera branchée lors de l'assemblage du projet final, hors de cet aperçu.

/*
  ORACLE MESSENGER — Prototype de parcours
  Écrans : accueil -> installation -> inscription téléphone -> code SMS -> liste conversations -> conversation
  Palette : bleu nuit profond (marque), blanc pur pour le contraste plein soleil, accent bleu signal pour les actions.
*/

const COLORS = {
  night: "#081019",
  nightSurface: "#0E1B2E",
  nightSurfaceRaised: "#142640",
  hairline: "#22344F",
  signal: "#2F7BFF",
  signalDeep: "#1E5FE0",
  ink: "#081019",
  paper: "#FFFFFF",
  paperDim: "#F4F6F9",
  slate: "#5B6B84",
  slateLight: "#94A3B8",
  read: "#4FC3F7",
  online: "#3DDC84",
};

function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="14" fill={COLORS.signal} />
      <path
        d="M12 18c0-2.2 1.8-4 4-4h16c2.2 0 4 1.8 4 4v9c0 2.2-1.8 4-4 4H21l-6 5v-5h-3c-2.2 0-4-1.8-4-4v-9z"
        fill="white"
      />
      <path
        d="M20.5 21.3c.4-1 1.6-1.6 2.7-1.1.9.4 1.3 1.4.9 2.3-.3.7-1 1-1.5 1.4-.3.2-.5.4-.5.7v.3"
        stroke={COLORS.signal}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="23.1" cy="27.3" r="1" fill={COLORS.signal} />
    </svg>
  );
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-5 pt-3 pb-1 text-[11px] font-medium" style={{ color: COLORS.paper }}>
      <span>9:41</span>
      <div className="flex items-center gap-1">
        <span>••••</span>
        <span>Wi-Fi</span>
        <span>100%</span>
      </div>
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled, icon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-[15px] transition-transform active:scale-[0.98] disabled:opacity-40"
      style={{ background: COLORS.signal, color: "#fff" }}
    >
      {icon}
      {children}
    </button>
  );
}

/* ---------------- ÉCRAN 1 : ACCUEIL / LANDING ---------------- */
function ScreenWelcome({ onInstall }) {
  return (
    <div className="h-full flex flex-col" style={{ background: `radial-gradient(120% 90% at 50% 0%, ${COLORS.nightSurfaceRaised} 0%, ${COLORS.night} 55%)` }}>
      <StatusBar />
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="mb-8 relative">
          <div
            className="absolute inset-0 rounded-full blur-2xl opacity-40"
            style={{ background: COLORS.signal, transform: "scale(2.2)" }}
          />
          <Logo size={72} />
        </div>
        <h1 className="text-[26px] font-bold tracking-tight mb-2" style={{ color: COLORS.paper, fontFamily: "'Sora', sans-serif" }}>
          Oracle Messenger
        </h1>
        <p className="text-[15px] leading-relaxed" style={{ color: COLORS.slateLight }}>
          Votre messagerie et votre outil de gestion, réunis dans une seule application.
        </p>
      </div>
      <div className="px-6 pb-10">
        <PrimaryButton onClick={onInstall} icon={<Download size={18} />}>
          Installer l'application
        </PrimaryButton>
        <p className="text-center text-[12px] mt-4" style={{ color: COLORS.slateLight }}>
          Vos données restent sur votre téléphone. Rien n'est collecté.
        </p>
      </div>
    </div>
  );
}

/* ---------------- ÉCRAN 2 : INSTALLATION EN COURS ---------------- */
function ScreenInstalling({ onDone }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(t);
          setTimeout(onDone, 350);
          return 100;
        }
        return p + 4;
      });
    }, 40);
    return () => clearInterval(t);
  }, [onDone]);

  return (
    <div className="h-full flex flex-col items-center justify-center px-10" style={{ background: COLORS.night }}>
      <Logo size={64} />
      <p className="mt-6 text-[15px] font-medium" style={{ color: COLORS.paper }}>
        Installation en cours…
      </p>
      <div className="w-full max-w-[220px] h-1.5 rounded-full mt-5 overflow-hidden" style={{ background: COLORS.hairline }}>
        <div
          className="h-full rounded-full transition-all duration-100"
          style={{ width: `${progress}%`, background: COLORS.signal }}
        />
      </div>
    </div>
  );
}

/* ---------------- ÉCRAN 3 : INSCRIPTION TÉLÉPHONE ---------------- */
function ScreenPhone({ onSubmit }) {
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const valid = phone.replace(/\s/g, "").length >= 8;

  async function handleContinue() {
    setSending(true);
    setError("");
    try {
      // Numéro au format international obligatoire pour Firebase, ex: +237600000000
      const formatted = phone.trim().startsWith("+") ? phone.replace(/\s/g, "") : `+${phone.replace(/\D/g, "")}`;
      const confirmationResult = await sendVerificationCode(formatted);
      onSubmit(phone, confirmationResult);
    } catch (err) {
      console.warn("Envoi SMS Firebase indisponible, mode démonstration activé :", err);
      setError("Envoi réel indisponible ici (domaine non autorisé ou reCAPTCHA non chargé) — mode démonstration.");
      onSubmit(phone, null); // null => ScreenCode utilisera le code de démonstration 123456
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="h-full flex flex-col px-6" style={{ background: COLORS.paper }}>
      <StatusBarDark />
      <div className="flex-1 flex flex-col justify-center">
        <div className="mb-8">
          <Logo size={48} />
        </div>
        <h1 className="text-[24px] font-bold mb-2" style={{ color: COLORS.ink, fontFamily: "'Sora', sans-serif" }}>
          Quel est votre numéro ?
        </h1>
        <p className="text-[14px] mb-8" style={{ color: COLORS.slate }}>
          Oracle Messenger va vous envoyer un code par SMS pour vérifier votre numéro.
        </p>
        <label className="text-[12px] font-semibold mb-2 block" style={{ color: COLORS.slate }}>
          NUMÉRO DE TÉLÉPHONE
        </label>
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 mb-2"
          style={{ background: COLORS.paperDim, border: `1.5px solid ${valid ? COLORS.signal : "transparent"}` }}
        >
          <Phone size={18} color={COLORS.slate} />
          <input
            autoFocus
            type="tel"
            placeholder="+237 6 XX XX XX XX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[16px]"
            style={{ color: COLORS.ink }}
          />
        </div>
        {error && <p className="text-[11.5px] mt-1" style={{ color: "#E74C3C" }}>{error}</p>}
        {/* Conteneur requis par Firebase pour le reCAPTCHA invisible */}
        <div id="recaptcha-container" />
      </div>
      <div className="pb-10">
        <PrimaryButton disabled={!valid || sending} onClick={handleContinue}>
          {sending ? "Envoi en cours…" : "Continuer"}
        </PrimaryButton>
      </div>
    </div>
  );
}

function StatusBarDark() {
  return (
    <div className="flex items-center justify-between pt-3 pb-1 text-[11px] font-medium" style={{ color: COLORS.ink }}>
      <span>9:41</span>
      <div className="flex items-center gap-1">
        <span>••••</span>
        <span>Wi-Fi</span>
        <span>100%</span>
      </div>
    </div>
  );
}

/* ---------------- ÉCRAN 4 : CODE SMS ---------------- */
function ScreenCode({ phone, confirmationResult, onVerified }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = useRef([]);
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(false);
  const DEMO_CODE = "123456"; // repli démonstration si Firebase n'est pas joignable (domaine non autorisé, etc.)

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
    if (next.every((d) => d !== "") && i === 5) {
      const code = next.join("");
      setChecking(true);

      if (confirmationResult) {
        // Vraie vérification Firebase
        verifyCode(confirmationResult, code)
          .then((userCredential) => {
            setChecking(false);
            onVerified(userCredential.user.uid);
          })
          .catch(() => {
            setChecking(false);
            setShake(true);
            setTimeout(() => setShake(false), 400);
          });
      } else {
        // Mode démonstration (pas de confirmationResult disponible)
        setTimeout(() => {
          setChecking(false);
          if (code === DEMO_CODE) {
            onVerified("demo-user");
          } else {
            setShake(true);
            setTimeout(() => setShake(false), 400);
          }
        }, 700);
      }
    }
  };

  return (
    <div className="h-full flex flex-col px-6" style={{ background: COLORS.paper }}>
      <StatusBarDark />
      <div className="flex-1 flex flex-col justify-center">
        <h1 className="text-[24px] font-bold mb-2" style={{ color: COLORS.ink, fontFamily: "'Sora', sans-serif" }}>
          Entrez le code
        </h1>
        <p className="text-[14px] mb-8" style={{ color: COLORS.slate }}>
          Un code à 6 chiffres a été envoyé au {phone || "+237 6 XX XX XX XX"}
        </p>
        <div className={`flex gap-2.5 justify-between mb-6 ${shake ? "animate-pulse" : ""}`}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              maxLength={1}
              inputMode="numeric"
              className="w-11 h-13 text-center text-[20px] font-bold rounded-xl outline-none"
              style={{
                background: COLORS.paperDim,
                color: COLORS.ink,
                height: "52px",
                border: `1.5px solid ${shake ? "#E74C3C" : d ? COLORS.signal : "transparent"}`,
              }}
            />
          ))}
        </div>
        {checking && (
          <p className="text-[13px] text-center" style={{ color: COLORS.slate }}>
            Vérification…
          </p>
        )}
        {shake && (
          <p className="text-[13px] text-center font-medium" style={{ color: "#E74C3C" }}>
            Code incorrect — essayez 123456 pour la démo
          </p>
        )}
      </div>
      <button className="pb-10 text-[14px] font-semibold" style={{ color: COLORS.signal }}>
        Renvoyer le code
      </button>
    </div>
  );
}

/* ---------------- ÉCRAN 5 : LISTE DE CONVERSATIONS ---------------- */
const CHATS = [
  { name: "Grâce Business", last: "D'accord, je vous envoie le catalogue 🔵", time: "09:41", unread: 2, online: true, tick: "read" },
  { name: "Prospect Chaud — Yaoundé", last: "C'est combien la livraison ?", time: "09:12", unread: 1, online: true, tick: null },
  { name: "Équipe Oracle Plus", last: "Vous : Merci, à demain", time: "hier", unread: 0, online: false, tick: "read" },
  { name: "Fournisseur Textile", last: "Photo", time: "hier", unread: 0, online: false, tick: "sent" },
  { name: "Client — Commande #204", last: "Payé ✅", time: "lun.", unread: 0, online: false, tick: "read" },
];

function Tick({ type }) {
  if (!type) return null;
  if (type === "sent") return <Check size={15} color={COLORS.slateLight} />;
  return <CheckCheck size={15} color={type === "read" ? COLORS.read : COLORS.slateLight} />;
}
// "sent2" = reçu (double coche grise), "read" = lu (double coche bleue)

function ChatRow({ c, onOpenChat, highContrast, bg, text, sub, onArchive }) {
  const [dragX, setDragX] = useState(0);
  const startX = useRef(0);
  const dragging = useRef(false);

  function onTouchStart(e) {
    startX.current = e.touches[0].clientX;
    dragging.current = true;
  }
  function onTouchMove(e) {
    if (!dragging.current) return;
    const delta = e.touches[0].clientX - startX.current;
    if (delta < 0) setDragX(Math.max(delta, -88));
  }
  function onTouchEnd() {
    dragging.current = false;
    if (dragX < -50) setDragX(-88);
    else setDragX(0);
  }

  return (
    <div className="relative overflow-hidden" style={{ borderBottom: `1px solid ${highContrast ? "#EEF1F5" : COLORS.hairline}` }}>
      <button
        onClick={() => { onArchive(); }}
        className="absolute right-0 top-0 h-full flex items-center justify-center"
        style={{ width: 88, background: "#F59E0B" }}
      >
        <div className="flex flex-col items-center gap-1">
          <Archive size={18} color="#fff" />
          <span className="text-[10px] font-semibold text-white">Archiver</span>
        </div>
      </button>
      <button
        onClick={() => (dragX === 0 ? onOpenChat() : setDragX(0))}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="w-full flex items-center gap-3 px-5 py-3 text-left relative transition-transform"
        style={{ background: bg, transform: `translateX(${dragX}px)` }}
      >
        <div className="relative shrink-0">
          <div
            className="w-13 h-13 rounded-full flex items-center justify-center font-bold text-[16px]"
            style={{ width: 52, height: 52, background: COLORS.signal, color: "#fff" }}
          >
            {c.name.charAt(0)}
          </div>
          {c.online && (
            <span
              className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full"
              style={{ background: COLORS.online, border: `2px solid ${bg}` }}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[15px] truncate" style={{ color: text }}>
              {c.name}
            </span>
            <span className="text-[12px] shrink-0 ml-2" style={{ color: c.unread ? COLORS.signal : sub }}>
              {c.time}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Tick type={c.tick} />
            <span className="text-[13.5px] truncate" style={{ color: sub }}>
              {c.last}
            </span>
          </div>
        </div>
        {c.unread > 0 && (
          <span
            className="text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0"
            style={{ background: COLORS.signal, color: "#fff" }}
          >
            {c.unread}
          </span>
        )}
      </button>
    </div>
  );
}

function ScreenChatList({ onOpenChat, onOpenMenu, onToggleContrast, highContrast, onOpenContacts, onOpenStories, onAddStory }) {
  const bg = highContrast ? COLORS.paper : COLORS.night;
  const surface = highContrast ? COLORS.paper : COLORS.nightSurface;
  const text = highContrast ? COLORS.ink : COLORS.paper;
  const sub = highContrast ? COLORS.slate : COLORS.slateLight;
  const [archivedNames, setArchivedNames] = useState([]);
  const [showArchived, setShowArchived] = useState(false);

  const visibleChats = CHATS.filter((c) => showArchived ? archivedNames.includes(c.name) : !archivedNames.includes(c.name));

  return (
    <div className="h-full flex flex-col relative" style={{ background: bg }}>
      <div className={highContrast ? "" : ""}>
        {highContrast ? <StatusBarDark /> : <StatusBar />}
      </div>
      <div className="flex items-center justify-between px-5 py-3">
        <h1 className="text-[22px] font-bold" style={{ color: text, fontFamily: "'Sora', sans-serif" }}>
          Discussions
        </h1>
        <div className="flex items-center gap-4">
          <Search size={20} color={sub} />
          <button onClick={onOpenContacts} title="Contacts">
            <Contact size={20} color={sub} />
          </button>
          <button onClick={onToggleContrast} title="Mode haut contraste">
            <Sun size={20} color={highContrast ? COLORS.signal : sub} />
          </button>
          <button onClick={onOpenMenu}>
            <Menu size={22} color={sub} />
          </button>
        </div>
      </div>

      {/* Barre de Stories */}
      <div className="flex gap-3 px-5 py-3 overflow-x-auto" style={{ borderBottom: `1px solid ${highContrast ? "#EEF1F5" : COLORS.hairline}` }}>
        <button onClick={onAddStory} className="flex flex-col items-center gap-1 shrink-0">
          <div className="w-14 h-14 rounded-full flex items-center justify-center relative" style={{ background: highContrast ? COLORS.paperDim : COLORS.nightSurface }}>
            <CircleUserRound size={26} color={sub} />
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: COLORS.signal, border: `2px solid ${bg}` }}>
              <Plus size={11} color="#fff" />
            </div>
          </div>
          <span className="text-[10.5px]" style={{ color: sub }}>Mon statut</span>
        </button>
        {[{ name: "Grâce", seen: false }, { name: "Junior", seen: false }, { name: "Aïcha", seen: true }, { name: "Client #204", seen: true }].map((s, i) => (
          <button key={i} onClick={onOpenStories} className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-[15px]" style={{ background: s.seen ? (highContrast ? "#E5E9EF" : COLORS.hairline) : COLORS.signal, padding: 2 }}>
              <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: COLORS.signal, color: "#fff" }}>
                {s.name.charAt(0)}
              </div>
            </div>
            <span className="text-[10.5px] truncate max-w-[56px]" style={{ color: sub }}>{s.name}</span>
          </button>
        ))}
      </div>

      {archivedNames.length > 0 && !showArchived && (
        <button onClick={() => setShowArchived(true)} className="flex items-center gap-2.5 px-5 py-2.5" style={{ borderBottom: `1px solid ${highContrast ? "#EEF1F5" : COLORS.hairline}` }}>
          <Archive size={15} color={sub} />
          <span className="text-[12.5px] font-medium flex-1 text-left" style={{ color: sub }}>Archivées ({archivedNames.length})</span>
          <ChevronRight size={14} color={sub} />
        </button>
      )}
      {showArchived && (
        <button onClick={() => setShowArchived(false)} className="flex items-center gap-2.5 px-5 py-2.5">
          <ArrowLeft size={15} color={sub} />
          <span className="text-[12.5px] font-medium" style={{ color: sub }}>Retour aux discussions</span>
        </button>
      )}

      <div className="flex-1 overflow-y-auto">
        {visibleChats.map((c, i) => (
          <ChatRow
            key={c.name}
            c={c}
            highContrast={highContrast}
            bg={bg}
            text={text}
            sub={sub}
            onOpenChat={onOpenChat}
            onArchive={() =>
              setArchivedNames((prev) => (prev.includes(c.name) ? prev.filter((n) => n !== c.name) : [...prev, c.name]))
            }
          />
        ))}
        {visibleChats.length === 0 && (
          <p className="text-center text-[13px] mt-10" style={{ color: sub }}>Aucune conversation ici</p>
        )}
      </div>
      <button
        onClick={onOpenContacts}
        className="absolute bottom-6 right-5 w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
        style={{ background: COLORS.signal }}
        title="Nouvelle conversation"
      >
        <MessageCircle size={24} color="#fff" />
      </button>
    </div>
  );
}

/* ---------------- ÉCRAN 6 : CONVERSATION (fonctionnel) ---------------- */
const REPLIES = [
  "D'accord, merci !",
  "Parfait, je regarde ça",
  "Vous pouvez me confirmer le prix ?",
  "Super, à bientôt",
  "Ok reçu 👍",
];

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function ScreenConversation({ onBack, onCall, onArchive, userId }) {
  const [theirTyping, setTheirTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const scrollRef = useRef(null);
  const idRef = useRef(5);
  const [actionSheet, setActionSheet] = useState(null); // id du message sur lequel appui long
  const [editingId, setEditingId] = useState(null);
  const pressTimer = useRef(null);
  const [headerMenu, setHeaderMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [attachMenu, setAttachMenu] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const fileInputKind = useRef("image");

  // Écoute en temps réel des messages Firestore (vraie synchronisation
  // entre deux téléphones). Si indisponible (hors ligne, Firebase non
  // configuré), on repasse automatiquement sur la conversation de
  // démonstration locale ci-dessous.
  useEffect(() => {
    let unsub;
    try {
      unsub = subscribeToMessages(DEMO_CONVERSATION_ID, (fbMessages) => {
        setRealtimeActive(true);
        const mapped = fbMessages.map((m) => ({
          id: m.id,
          from: m.senderId === (userId || "demo-user") ? "me" : "them",
          text: m.text || "",
          media: m.media || null,
          time: m.createdAt?.toDate
            ? m.createdAt.toDate().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
            : nowTime(),
          tick: m.status,
          edited: m.edited || false,
        }));
        setMessages(mapped);

        // Sauvegarde locale (IndexedDB) — cœur de l'architecture "zéro serveur"
        mapped.forEach((m) => {
          localPut("messages", { ...m, conversationId: DEMO_CONVERSATION_ID }).catch(() => {});
        });

        // Confirme la réception des messages de l'autre côté
        fbMessages.forEach((m) => {
          if (m.senderId !== (userId || "demo-user") && m.status === "sent") {
            markDelivered(DEMO_CONVERSATION_ID, m.id).catch(() => {});
          }
        });
      });
    } catch (err) {
      console.warn("Firestore indisponible ici, conversation de démonstration locale :", err);
      setMessages([
        { id: 1, from: "them", text: "Bonjour, vous avez encore le pack en stock ?", time: "09:05" },
        { id: 2, from: "me", text: "Bonjour ! Oui il en reste 6.", time: "09:06", tick: "read" },
        { id: 3, from: "me", text: "Vous voulez que je vous envoie le catalogue complet ?", time: "09:06", tick: "read" },
        { id: 4, from: "them", text: "Oui avec plaisir", time: "09:10" },
      ]);
    }
    return () => unsub && unsub();
  }, [userId]);

  useEffect(() => {
    if (!recording) return;
    recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    return () => clearInterval(recordTimerRef.current);
  }, [recording]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, theirTyping]);

  function showToast(t) {
    setToast(t);
    setTimeout(() => setToast(""), 1800);
  }

  function startPress(id) {
    pressTimer.current = setTimeout(() => setActionSheet(id), 420);
  }
  function cancelPress() {
    clearTimeout(pressTimer.current);
  }

  async function sendMessage() {
    const text = draft.trim();
    if (!text) return;

    if (editingId) {
      setDraft("");
      const idToEdit = editingId;
      setEditingId(null);
      try {
        await fbEditMessage(DEMO_CONVERSATION_ID, idToEdit, text);
        // L'écoute temps réel (subscribeToMessages) répercute la modification automatiquement.
      } catch (err) {
        console.warn("Édition réelle indisponible, mise à jour locale uniquement :", err);
        setMessages((prev) => prev.map((m) => (m.id === idToEdit ? { ...m, text, edited: true } : m)));
      }
      return;
    }

    setDraft("");

    try {
      await fbSendMessage(DEMO_CONVERSATION_ID, { senderId: userId || "demo-user", text });
      // L'affichage se met à jour via l'écoute temps réel (subscribeToMessages) —
      // c'est ce mécanisme qui permet au message d'arriver réellement chez l'autre téléphone.
    } catch (err) {
      console.warn("Envoi réel indisponible ici, simulation locale activée :", err);
      const id = idRef.current++;
      setMessages((prev) => [...prev, { id, from: "me", text, time: nowTime(), tick: "sent" }]);

      // Progression réaliste des accusés de réception : envoyé -> reçu -> lu (simulation)
      setTimeout(() => {
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, tick: "delivered" } : m)));
      }, 600);
      setTimeout(() => {
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, tick: "read" } : m)));
        setTheirTyping(true);
      }, 1600);
      setTimeout(() => {
        setTheirTyping(false);
        const reply = REPLIES[Math.floor(Math.random() * REPLIES.length)];
        setMessages((prev) => [...prev, { id: idRef.current++, from: "them", text: reply, time: nowTime() }]);
      }, 3000);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  }

  function startEdit(msg) {
    setDraft(msg.text);
    setEditingId(msg.id);
    setActionSheet(null);
  }

  async function deleteMessage(id) {
    setActionSheet(null);
    try {
      await deleteMessageEverywhere(DEMO_CONVERSATION_ID, id);
      // Suppression répercutée des deux côtés via l'écoute temps réel, sans laisser de trace.
    } catch (err) {
      console.warn("Suppression réelle indisponible, suppression locale uniquement :", err);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }
    showToast("Message supprimé");
  }

  function progressTicks(id) {
    setTimeout(() => setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, tick: "delivered" } : m))), 500);
    setTimeout(() => setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, tick: "read" } : m))), 1400);
  }

  function openAttach(kind) {
    setAttachMenu(false);
    fileInputKind.current = kind;
    fileInputRef.current?.click();
  }

  function handleFileChosen(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const id = idRef.current++;
    const url = URL.createObjectURL(file);
    setMessages((prev) => [
      ...prev,
      { id, from: "me", time: nowTime(), tick: "sent", media: { kind: fileInputKind.current, url, name: file.name, sizeKb: Math.round(file.size / 1024) } },
    ]);
    progressTicks(id);
    e.target.value = "";
  }

  function startRecording() {
    setRecording(true);
    setRecordSeconds(0);
  }
  function cancelRecording() {
    setRecording(false);
    setRecordSeconds(0);
  }
  function sendRecording() {
    if (recordSeconds < 1) return cancelRecording();
    const id = idRef.current++;
    setMessages((prev) => [
      ...prev,
      { id, from: "me", time: nowTime(), tick: "sent", media: { kind: "audio", durationSec: recordSeconds } },
    ]);
    progressTicks(id);
    setRecording(false);
    setRecordSeconds(0);
  }

  const activeMsg = messages.find((m) => m.id === actionSheet);

  return (
    <div className="h-full flex flex-col relative" style={{ background: COLORS.paperDim }}>
      <input ref={fileInputRef} type="file" accept={fileInputKind.current === "video" ? "video/*" : fileInputKind.current === "doc" ? "*/*" : "image/*"} className="hidden" onChange={handleFileChosen} />
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: COLORS.night }}>
        <button onClick={onBack}>
          <ArrowLeft size={22} color={COLORS.paper} />
        </button>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[14px]"
          style={{ background: COLORS.signal, color: "#fff" }}
        >
          G
        </div>
        <div className="flex-1">
          <p className="text-[15px] font-semibold" style={{ color: COLORS.paper }}>
            Grâce Business
          </p>
          <p className="text-[12px]" style={{ color: theirTyping ? COLORS.read : COLORS.slateLight }}>
            {theirTyping ? "en train d'écrire…" : "en ligne"}
          </p>
        </div>
        <button onClick={() => onCall("audio")} className="mr-1">
          <PhoneCall size={19} color={COLORS.slateLight} />
        </button>
        <button onClick={() => onCall("video")} className="mr-1">
          <Video size={20} color={COLORS.slateLight} />
        </button>
        <div className="relative">
          <button onClick={() => setHeaderMenu((v) => !v)}>
            <MoreVertical size={20} color={COLORS.slateLight} />
          </button>
          {headerMenu && (
            <div className="absolute right-0 top-7 rounded-xl overflow-hidden shadow-xl z-10" style={{ background: "#fff", minWidth: 170 }}>
              <button
                onClick={() => { setHeaderMenu(false); showToast("Conversation archivée"); setTimeout(onArchive, 600); }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-left"
              >
                <Archive size={15} color={COLORS.ink} />
                <span className="text-[13px]" style={{ color: COLORS.ink }}>Archiver</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
            <div
              onMouseDown={() => startPress(m.id)}
              onMouseUp={cancelPress}
              onMouseLeave={cancelPress}
              onTouchStart={() => startPress(m.id)}
              onTouchEnd={cancelPress}
              className="max-w-[75%] rounded-2xl px-3.5 py-2.5 select-none cursor-pointer"
              style={{
                background: m.from === "me" ? COLORS.signal : "#fff",
                borderBottomRightRadius: m.from === "me" ? 4 : 16,
                borderBottomLeftRadius: m.from === "me" ? 16 : 4,
              }}
            >
              {m.media?.kind === "image" && (
                <div className="rounded-xl overflow-hidden mb-1.5 -mx-1 -mt-1" style={{ width: 180 }}>
                  <img src={m.media.url} alt={m.media.name} className="w-full h-32 object-cover" />
                </div>
              )}
              {m.media?.kind === "video" && (
                <div className="rounded-xl overflow-hidden mb-1.5 -mx-1 -mt-1 relative flex items-center justify-center" style={{ width: 180, height: 128, background: "#00000030" }}>
                  <video src={m.media.url} className="w-full h-full object-cover" />
                  <Play size={26} color="#fff" className="absolute" />
                </div>
              )}
              {m.media?.kind === "doc" && (
                <div className="flex items-center gap-2.5 mb-1 py-1" style={{ width: 160 }}>
                  <FileIcon size={26} color={m.from === "me" ? "#fff" : COLORS.signal} />
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium truncate" style={{ color: m.from === "me" ? "#fff" : COLORS.ink }}>{m.media.name}</p>
                    <p className="text-[10.5px]" style={{ color: m.from === "me" ? "rgba(255,255,255,0.7)" : COLORS.slateLight }}>{m.media.sizeKb} Ko</p>
                  </div>
                </div>
              )}
              {m.media?.kind === "audio" && (
                <div className="flex items-center gap-2.5 py-1" style={{ width: 150 }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: m.from === "me" ? "rgba(255,255,255,0.25)" : COLORS.signal + "22" }}>
                    <Play size={13} color={m.from === "me" ? "#fff" : COLORS.signal} />
                  </div>
                  <div className="flex-1 h-1 rounded-full" style={{ background: m.from === "me" ? "rgba(255,255,255,0.35)" : COLORS.hairline }} />
                  <span className="text-[10.5px] shrink-0" style={{ color: m.from === "me" ? "rgba(255,255,255,0.85)" : COLORS.slateLight }}>
                    0:{String(m.media.durationSec).padStart(2, "0")}
                  </span>
                </div>
              )}
              {m.text && (
                <p className="text-[14.5px] leading-snug whitespace-pre-wrap break-words" style={{ color: m.from === "me" ? "#fff" : COLORS.ink }}>
                  {m.text}
                </p>
              )}
              <div className="flex items-center justify-end gap-1 mt-1">
                {m.edited && (
                  <span className="text-[10px] italic mr-0.5" style={{ color: m.from === "me" ? "rgba(255,255,255,0.65)" : COLORS.slateLight }}>
                    modifié
                  </span>
                )}
                <span className="text-[10.5px]" style={{ color: m.from === "me" ? "rgba(255,255,255,0.75)" : COLORS.slateLight }}>
                  {m.time}
                </span>
                {m.from === "me" && <Tick type={m.tick === "delivered" ? "sent2" : m.tick} />}
              </div>
            </div>
          </div>
        ))}
        {theirTyping && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 flex items-center gap-1" style={{ background: "#fff", borderBottomLeftRadius: 4 }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ background: COLORS.slateLight, animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {editingId && (
        <div className="flex items-center gap-2 px-4 py-2" style={{ background: COLORS.signal + "18" }}>
          <Edit3 size={14} color={COLORS.signal} />
          <span className="flex-1 text-[12px] font-medium" style={{ color: COLORS.signal }}>Modifier le message</span>
          <button onClick={() => { setEditingId(null); setDraft(""); }}>
            <X size={15} color={COLORS.signal} />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-3 relative" style={{ background: COLORS.paperDim }}>
        {recording ? (
          <div className="flex-1 flex items-center gap-2.5 rounded-full px-4 py-2.5" style={{ background: "#fff" }}>
            <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: "#E74C3C" }} />
            <span className="text-[13.5px] font-medium flex-1" style={{ color: COLORS.ink }}>
              Enregistrement… 0:{String(recordSeconds).padStart(2, "0")}
            </span>
            <button onClick={cancelRecording}>
              <Trash2 size={17} color={COLORS.slate} />
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-2 rounded-full px-4 py-2.5" style={{ background: "#fff" }}>
            <Smile size={20} color={COLORS.slate} />
            <input
              placeholder="Message"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none text-[14.5px]"
              style={{ color: COLORS.ink }}
            />
            <button onClick={() => setAttachMenu((v) => !v)}>
              <Paperclip size={18} color={COLORS.slate} />
            </button>
          </div>
        )}

        {draft.trim() && !recording ? (
          <button
            onClick={sendMessage}
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ background: COLORS.signal }}
          >
            <Send size={18} color="#fff" />
          </button>
        ) : recording ? (
          <button
            onClick={sendRecording}
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ background: COLORS.signal }}
          >
            <Send size={18} color="#fff" />
          </button>
        ) : (
          <button
            onClick={startRecording}
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ background: COLORS.signal }}
          >
            <Mic size={19} color="#fff" />
          </button>
        )}

        {attachMenu && (
          <div className="absolute bottom-16 left-3 rounded-2xl shadow-xl p-3 flex gap-4" style={{ background: "#fff" }}>
            <button onClick={() => openAttach("image")} className="flex flex-col items-center gap-1.5">
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "#8B5CF6" }}>
                <ImageIcon size={18} color="#fff" />
              </div>
              <span className="text-[10.5px]" style={{ color: COLORS.ink }}>Photo</span>
            </button>
            <button onClick={() => openAttach("video")} className="flex flex-col items-center gap-1.5">
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "#EC4899" }}>
                <Film size={18} color="#fff" />
              </div>
              <span className="text-[10.5px]" style={{ color: COLORS.ink }}>Vidéo</span>
            </button>
            <button onClick={() => openAttach("doc")} className="flex flex-col items-center gap-1.5">
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: COLORS.signal }}>
                <FileIcon size={18} color="#fff" />
              </div>
              <span className="text-[10.5px]" style={{ color: COLORS.ink }}>Document</span>
            </button>
          </div>
        )}
      </div>

      {/* Feuille d'actions (appui long sur un message) */}
      {actionSheet && activeMsg && (
        <div className="absolute inset-0 z-20 flex items-end" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setActionSheet(null)}>
          <div className="w-full rounded-t-3xl pb-8 pt-2" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto my-2.5" style={{ background: COLORS.hairline }} />
            {activeMsg.from === "me" && (
              <button onClick={() => startEdit(activeMsg)} className="w-full flex items-center gap-3 px-6 py-3.5">
                <Edit3 size={17} color={COLORS.ink} />
                <span className="text-[14px]" style={{ color: COLORS.ink }}>Modifier</span>
              </button>
            )}
            <button onClick={() => deleteMessage(activeMsg.id)} className="w-full flex items-center gap-3 px-6 py-3.5">
              <Trash2 size={17} color="#E74C3C" />
              <span className="text-[14px]" style={{ color: "#E74C3C" }}>
                {activeMsg.from === "me" ? "Supprimer pour tous" : "Supprimer pour moi"}
              </span>
            </button>
            <button onClick={() => setActionSheet(null)} className="w-full flex items-center gap-3 px-6 py-3.5">
              <X size={17} color={COLORS.slate} />
              <span className="text-[14px]" style={{ color: COLORS.slate }}>Annuler</span>
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full z-30" style={{ background: "rgba(8,16,25,0.9)" }}>
          <span className="text-[12.5px] font-medium text-white">{toast}</span>
        </div>
      )}
    </div>
  );
}

/* ---------------- ÉCRAN : MENU PRINCIPAL ---------------- */
const MENU_ITEMS = [
  { key: "spiritualite", label: "Spiritualité", desc: "Accéder à Oracle Plus", icon: Sparkles },
  { key: "multimedia", label: "Multimédia", desc: "Photos, vidéos et fichiers reçus", icon: Images },
  { key: "soutien", label: "Soutien", desc: "Faire un don", icon: HeartHandshake },
  { key: "blocnotes", label: "Bloc-notes", desc: "Notes, vocaux et calendrier", icon: NotebookPen },
  { key: "inviter", label: "Inviter", desc: "Partager mon lien Oracle", icon: Share2 },
  { key: "business", label: "Hub Business", desc: "Outils entreprise", icon: Briefcase, premium: true },
  { key: "infos", label: "Informations", desc: "Aide et fonctionnement de l'app", icon: Info },
];

function ScreenMenu({ onBack, onOpenItem, highContrast }) {
  const bg = highContrast ? COLORS.paper : COLORS.night;
  const text = highContrast ? COLORS.ink : COLORS.paper;
  const sub = highContrast ? COLORS.slate : COLORS.slateLight;
  const rowBg = highContrast ? COLORS.paperDim : COLORS.nightSurface;

  return (
    <div className="h-full flex flex-col" style={{ background: bg }}>
      {highContrast ? <StatusBarDark /> : <StatusBar />}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onBack}>
          <ArrowLeft size={22} color={text} />
        </button>
        <h1 className="text-[19px] font-bold" style={{ color: text, fontFamily: "'Sora', sans-serif" }}>
          Menu
        </h1>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-2">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => onOpenItem(item.key)}
              className="flex items-center gap-3.5 rounded-2xl px-4 py-3.5"
              style={{ background: rowBg }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: COLORS.signal + "22" }}
              >
                <Icon size={19} color={COLORS.signal} />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14.5px] font-semibold" style={{ color: text }}>
                    {item.label}
                  </span>
                  {item.premium && <Lock size={12} color={sub} />}
                </div>
                <p className="text-[12.5px]" style={{ color: sub }}>
                  {item.desc}
                </p>
              </div>
              <ChevronRight size={18} color={sub} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- ÉCRAN : DÉTAIL D'UN ÉLÉMENT DU MENU ---------------- */
function ScreenMenuDetail({ itemKey, onBack, highContrast, onToggleContrast }) {
  const bg = highContrast ? COLORS.paper : COLORS.night;
  const text = highContrast ? COLORS.ink : COLORS.paper;
  const sub = highContrast ? COLORS.slate : COLORS.slateLight;
  const item = MENU_ITEMS.find((m) => m.key === itemKey);
  const Icon = item?.icon || Info;

  return (
    <div className="h-full flex flex-col" style={{ background: bg }}>
      {highContrast ? <StatusBarDark /> : <StatusBar />}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onBack}>
          <ArrowLeft size={22} color={text} />
        </button>
        <h1 className="text-[18px] font-bold" style={{ color: text, fontFamily: "'Sora', sans-serif" }}>
          {item?.label}
        </h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: COLORS.signal + "22" }}
        >
          <Icon size={28} color={COLORS.signal} />
        </div>
        <p className="text-[14px] leading-relaxed mb-6" style={{ color: sub }}>
          {itemKey === "spiritualite"
            ? "Accédez à l'enseignement et au contenu spirituel d'Oracle Plus."
            : `${item?.desc} — cet écran sera développé dans une prochaine étape.`}
        </p>

        {itemKey === "spiritualite" && (
          <a
            href="https://oracle-plus.online"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold"
            style={{ background: COLORS.signal, color: "#fff" }}
          >
            Ouvrir Oracle Plus
          </a>
        )}

        {itemKey === "infos" && (
          <button
            onClick={onToggleContrast}
            className="flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold"
            style={{ background: COLORS.signal, color: "#fff" }}
          >
            <Sun size={16} />
            {highContrast ? "Désactiver" : "Activer"} le mode haut contraste
          </button>
        )}

        {item?.premium && (
          <div className="rounded-2xl px-5 py-4 mt-2" style={{ background: highContrast ? COLORS.paperDim : COLORS.nightSurface }}>
            <p className="text-[13px] font-semibold mb-1" style={{ color: text }}>
              Fonctionnalité Entreprise
            </p>
            <p className="text-[12px]" style={{ color: sub }}>
              Envois massifs, CRM, retouche photo/vidéo et bien plus — 20 000 FCFA/mois.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- ÉCRAN : HUB BUSINESS ---------------- */
const CRM_TAGS = {
  none: { label: "Aucun tag", color: "#5B6B84" },
  hot: { label: "Prospect chaud", color: "#F59E0B" },
  paid: { label: "Payé", color: "#3DDC84" },
  shipping: { label: "Livraison en cours", color: "#2F7BFF" },
};
const TAG_ORDER = ["none", "hot", "paid", "shipping"];

function ScreenBusinessHub({ onBack, highContrast, unlocked, onUnlock }) {
  const bg = highContrast ? COLORS.paper : COLORS.night;
  const text = highContrast ? COLORS.ink : COLORS.paper;
  const sub = highContrast ? COLORS.slate : COLORS.slateLight;
  const card = highContrast ? COLORS.paperDim : COLORS.nightSurface;
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  const [crm, setCrm] = useState([
    { name: "Grâce Business", tag: "paid" },
    { name: "Prospect Chaud — Yaoundé", tag: "hot" },
    { name: "Client — Commande #204", tag: "shipping" },
    { name: "Fournisseur Textile", tag: "none" },
  ]);
  const [autoReply, setAutoReply] = useState(true);
  const [keywords, setKeywords] = useState(["Prix", "Livraison", "Stock"]);
  const [newKeyword, setNewKeyword] = useState("");
  const [copied, setCopied] = useState(false);
  const link = "messenger.oracle-plus.online/u/toncompte";

  function cycleTag(i) {
    setCrm((prev) =>
      prev.map((c, idx) => {
        if (idx !== i) return c;
        const next = TAG_ORDER[(TAG_ORDER.indexOf(c.tag) + 1) % TAG_ORDER.length];
        return { ...c, tag: next };
      })
    );
  }

  function addKeyword() {
    const k = newKeyword.trim();
    if (!k || keywords.length >= 5 || keywords.includes(k)) return;
    setKeywords([...keywords, k]);
    setNewKeyword("");
  }

  async function handleUnlock() {
    setPayError("");
    if (!isPaystackConfigured()) {
      // Clé Paystack pas encore fournie : mode démonstration
      onUnlock();
      return;
    }
    setPaying(true);
    try {
      await payWithPaystack({
        email: "entreprise@oracle-messenger.app", // à remplacer par l'email réel de l'utilisateur connecté
        amountFcfa: 20000,
        metadata: { type: "abonnement_business", periode: "mensuel" },
        onSuccess: () => onUnlock(),
      });
    } catch (err) {
      console.warn("Paiement Paystack indisponible ou annulé :", err);
      setPayError("Le paiement n'a pas abouti. Réessaie, ou vérifie ta connexion.");
    } finally {
      setPaying(false);
    }
  }

  if (!unlocked) {
    return (
      <div className="h-full flex flex-col" style={{ background: bg }}>
        {highContrast ? <StatusBarDark /> : <StatusBar />}
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack}>
            <ArrowLeft size={22} color={text} />
          </button>
          <h1 className="text-[18px] font-bold" style={{ color: text, fontFamily: "'Sora', sans-serif" }}>
            Hub Business
          </h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-7 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: COLORS.signal + "22" }}>
            <Briefcase size={28} color={COLORS.signal} />
          </div>
          <h2 className="text-[19px] font-bold mb-2" style={{ color: text, fontFamily: "'Sora', sans-serif" }}>
            Passez à Entreprise
          </h2>
          <p className="text-[13.5px] mb-6" style={{ color: sub }}>
            Débloquez les outils pour développer votre activité sur Oracle Messenger.
          </p>
          <div className="w-full flex flex-col gap-2.5 mb-7 text-left">
            {[
              { icon: Users, label: "CRM local — tags & suivi de conversations" },
              { icon: LinkIcon, label: "Lien de prospection unique" },
              { icon: Megaphone, label: "Envois massifs (300/jour)" },
              { icon: Bot, label: "Réponses automatiques par mots-clés" },
              { icon: Palette, label: "Studio retouche photo & vidéo" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5" style={{ background: card }}>
                <f.icon size={16} color={COLORS.signal} />
                <span className="text-[13px]" style={{ color: text }}>{f.label}</span>
              </div>
            ))}
          </div>
          <p className="text-[24px] font-bold mb-1" style={{ color: text, fontFamily: "'Sora', sans-serif" }}>
            20 000 FCFA<span className="text-[14px] font-medium" style={{ color: sub }}> / mois</span>
          </p>
          <p className="text-[11.5px] mb-5" style={{ color: sub }}>
            Paiement sécurisé via Paystack — Oracle Plus
          </p>
          <PrimaryButton onClick={handleUnlock} disabled={paying}>
            {paying ? "Paiement en cours…" : "Débloquer via Oracle Plus"}
          </PrimaryButton>
          {payError && <p className="text-center text-[11.5px] mt-2" style={{ color: "#E74C3C" }}>{payError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: bg }}>
      {highContrast ? <StatusBarDark /> : <StatusBar />}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onBack}>
          <ArrowLeft size={22} color={text} />
        </button>
        <h1 className="text-[18px] font-bold" style={{ color: text, fontFamily: "'Sora', sans-serif" }}>
          Hub Business
        </h1>
        <span className="ml-auto text-[10.5px] font-bold px-2.5 py-1 rounded-full" style={{ background: COLORS.signal, color: "#fff" }}>
          PREMIUM
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-5 pb-8">
        {/* Lien de prospection */}
        <section>
          <p className="text-[12px] font-semibold mb-2 uppercase tracking-wide" style={{ color: sub }}>Lien de prospection</p>
          <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3" style={{ background: card }}>
            <LinkIcon size={16} color={COLORS.signal} className="shrink-0" />
            <span className="flex-1 text-[13px] truncate" style={{ color: text }}>{link}</span>
            <button
              onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold"
              style={{ background: COLORS.signal, color: "#fff" }}
            >
              {copied ? "Copié !" : "Copier"}
            </button>
          </div>
          <p className="text-[11.5px] mt-1.5" style={{ color: sub }}>
            Chaque clic ouvre directement votre conversation.
          </p>
        </section>

        {/* CRM */}
        <section>
          <p className="text-[12px] font-semibold mb-2 uppercase tracking-wide" style={{ color: sub }}>CRM — mes conversations</p>
          <div className="flex flex-col gap-2">
            {crm.map((c, i) => (
              <button
                key={i}
                onClick={() => cycleTag(i)}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left"
                style={{ background: card }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[12px] shrink-0" style={{ background: COLORS.signal, color: "#fff" }}>
                  {c.name.charAt(0)}
                </div>
                <span className="flex-1 text-[13px] truncate" style={{ color: text }}>{c.name}</span>
                <span
                  className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full shrink-0"
                  style={{ background: CRM_TAGS[c.tag].color + "26", color: CRM_TAGS[c.tag].color }}
                >
                  {CRM_TAGS[c.tag].label}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[11.5px] mt-1.5" style={{ color: sub }}>Touchez une conversation pour changer son tag.</p>
        </section>

        {/* Automatisation */}
        <section>
          <p className="text-[12px] font-semibold mb-2 uppercase tracking-wide" style={{ color: sub }}>Réponses automatiques</p>
          <div className="rounded-2xl px-4 py-3.5" style={{ background: card }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium" style={{ color: text }}>Activer les mots-clés</span>
              <button
                onClick={() => setAutoReply((v) => !v)}
                className="w-10 h-6 rounded-full relative transition-colors"
                style={{ background: autoReply ? COLORS.signal : COLORS.hairline }}
              >
                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: autoReply ? 18 : 2 }} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {keywords.map((k, i) => (
                <span key={i} className="text-[11.5px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: COLORS.signal + "22", color: COLORS.signal }}>
                  <Tag size={10} /> {k}
                </span>
              ))}
            </div>
            {keywords.length < 5 ? (
              <div className="flex gap-2">
                <input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Ajouter un mot-clé"
                  className="flex-1 text-[12.5px] rounded-lg px-3 py-2 outline-none"
                  style={{ background: highContrast ? "#fff" : COLORS.nightSurfaceRaised, color: text }}
                />
                <button onClick={addKeyword} className="rounded-lg px-3 text-[12px] font-semibold" style={{ background: COLORS.signal, color: "#fff" }}>
                  Ajouter
                </button>
              </div>
            ) : (
              <p className="text-[11px]" style={{ color: sub }}>Maximum 5 mots-clés atteint.</p>
            )}
          </div>
        </section>

        {/* Envois massifs */}
        <section>
          <p className="text-[12px] font-semibold mb-2 uppercase tracking-wide" style={{ color: sub }}>Envois massifs</p>
          <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3" style={{ background: card }}>
            <Megaphone size={18} color={COLORS.signal} />
            <div className="flex-1">
              <p className="text-[13px] font-medium" style={{ color: text }}>0 / 300 envoyés aujourd'hui</p>
              <p className="text-[11px]" style={{ color: sub }}>Diffusez une offre à toute votre base client.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------------- ÉCRAN : CONTACTS (détection Oracle) ---------------- */
const MOCK_CONTACTS = [
  { name: "Grâce Fotso", phone: "+237 6 78 12 34 56", onOracle: true },
  { name: "Junior Mbarga", phone: "+237 6 90 45 67 12", onOracle: true },
  { name: "Papa Michel", phone: "+237 6 55 22 88 90", onOracle: false },
  { name: "Aïcha Ndiaye", phone: "+221 77 123 45 67", onOracle: true },
  { name: "Boutique Textile CMR", phone: "+237 6 99 11 22 33", onOracle: false },
  { name: "Tantine Rose", phone: "+237 6 71 44 55 66", onOracle: false },
];

function ScreenContacts({ onBack, onOpenChat, highContrast }) {
  const bg = highContrast ? COLORS.paper : COLORS.night;
  const text = highContrast ? COLORS.ink : COLORS.paper;
  const sub = highContrast ? COLORS.slate : COLORS.slateLight;
  const card = highContrast ? COLORS.paperDim : COLORS.nightSurface;
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);

  function scanContacts() {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setScanned(true);
    }, 1200);
  }

  const onOracle = MOCK_CONTACTS.filter((c) => c.onOracle);
  const notOnOracle = MOCK_CONTACTS.filter((c) => !c.onOracle);

  return (
    <div className="h-full flex flex-col" style={{ background: bg }}>
      {highContrast ? <StatusBarDark /> : <StatusBar />}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onBack}>
          <ArrowLeft size={22} color={text} />
        </button>
        <h1 className="text-[18px] font-bold" style={{ color: text, fontFamily: "'Sora', sans-serif" }}>
          Contacts
        </h1>
      </div>

      {!scanned ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: COLORS.signal + "22" }}>
            <Contact size={28} color={COLORS.signal} />
          </div>
          <h2 className="text-[17px] font-bold mb-2" style={{ color: text, fontFamily: "'Sora', sans-serif" }}>
            Trouvez vos proches sur Oracle
          </h2>
          <p className="text-[13px] mb-6" style={{ color: sub }}>
            Oracle Messenger peut vérifier lesquels de vos contacts utilisent déjà l'application. Votre carnet d'adresses reste privé et local.
          </p>
          <PrimaryButton onClick={scanContacts} icon={<UserPlus size={17} />}>
            {scanning ? "Analyse en cours…" : "Autoriser l'accès aux contacts"}
          </PrimaryButton>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <p className="text-[12px] font-semibold mb-2 uppercase tracking-wide" style={{ color: sub }}>
            Sur Oracle Messenger ({onOracle.length})
          </p>
          <div className="flex flex-col gap-2 mb-5">
            {onOracle.map((c, i) => (
              <button key={i} onClick={onOpenChat} className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: card }}>
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[14px]" style={{ background: COLORS.signal, color: "#fff" }}>
                    {c.name.charAt(0)}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full" style={{ background: COLORS.online, border: `2px solid ${bg}` }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[14px] font-semibold" style={{ color: text }}>{c.name}</p>
                  <p className="text-[12px]" style={{ color: sub }}>{c.phone}</p>
                </div>
                <MessageCircle size={18} color={COLORS.signal} />
              </button>
            ))}
          </div>

          <p className="text-[12px] font-semibold mb-2 uppercase tracking-wide" style={{ color: sub }}>
            Pas encore sur Oracle ({notOnOracle.length})
          </p>
          <div className="flex flex-col gap-2">
            {notOnOracle.map((c, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: card }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[14px]" style={{ background: COLORS.hairline, color: sub }}>
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[14px] font-semibold" style={{ color: text }}>{c.name}</p>
                  <p className="text-[12px]" style={{ color: sub }}>{c.phone}</p>
                </div>
                <button className="text-[11.5px] font-semibold px-3 py-1.5 rounded-full" style={{ background: COLORS.signal + "22", color: COLORS.signal }}>
                  Inviter
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- ÉCRAN : APPEL AUDIO/VIDÉO ---------------- */
function ScreenCall({ type, onEnd, conversationId = DEMO_CONVERSATION_ID }) {
  const [seconds, setSeconds] = useState(0);
  const [connected, setConnected] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(type === "video");
  const [speakerOn, setSpeakerOn] = useState(false);
  const [realCall, setRealCall] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callHandle = useRef(null); // { pc, localStream, hangUp }

  useEffect(() => {
    let cancelled = false;
    const callId = `${conversationId}-call`;

    // Tentative de vrai appel WebRTC (fonctionnera une fois déployé,
    // avec deux téléphones réels connectés au même Firebase).
    startCall(callId, type, (remoteStream) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      setConnected(true);
    })
      .then((handle) => {
        if (cancelled) return handle.hangUp();
        callHandle.current = handle;
        setRealCall(true);
        if (localVideoRef.current) localVideoRef.current.srcObject = handle.localStream;
      })
      .catch((err) => {
        console.warn("Appel réel indisponible ici (pas de deuxième appareil/permissions), mode démonstration :", err);
        if (!cancelled) setTimeout(() => setConnected(true), 1800);
      });

    return () => {
      cancelled = true;
      callHandle.current?.hangUp();
    };
  }, []);

  useEffect(() => {
    if (!connected) return;
    const i = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(i);
  }, [connected]);

  function toggleMic() {
    setMicOn((v) => {
      const next = !v;
      callHandle.current?.localStream.getAudioTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }
  function toggleCam() {
    setCamOn((v) => {
      const next = !v;
      callHandle.current?.localStream.getVideoTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }
  function handleEnd() {
    callHandle.current?.hangUp();
    onEnd();
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="h-full flex flex-col justify-between" style={{ background: `radial-gradient(120% 90% at 50% 0%, ${COLORS.nightSurfaceRaised} 0%, ${COLORS.night} 60%)` }}>
      <div className="flex flex-col items-center pt-16 px-6">
        <div className="w-24 h-24 rounded-full flex items-center justify-center font-bold text-[32px] mb-5" style={{ background: COLORS.signal, color: "#fff" }}>
          G
        </div>
        <p className="text-[20px] font-bold" style={{ color: COLORS.paper, fontFamily: "'Sora', sans-serif" }}>
          Grâce Business
        </p>
        <p className="text-[13.5px] mt-1.5" style={{ color: COLORS.slateLight }}>
          {connected ? `${type === "video" ? "Appel vidéo" : "Appel audio"} · ${mm}:${ss}` : "Appel en cours…"}
        </p>
      </div>

      {type === "video" && camOn && (
        <div className="mx-6 rounded-2xl overflow-hidden flex-1 my-4 relative" style={{ background: COLORS.nightSurface }}>
          {realCall ? (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-3 right-3 w-20 h-28 rounded-xl object-cover border-2" style={{ borderColor: COLORS.signal }} />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-[12px]" style={{ color: COLORS.slateLight }}>Aperçu caméra (démo — connecte deux appareils réels pour la vraie vidéo)</p>
            </div>
          )}
        </div>
      )}

      <div className="px-8 pb-10">
        <div className="flex items-center justify-center gap-5 mb-6">
          <button
            onClick={toggleMic}
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: micOn ? COLORS.nightSurfaceRaised : "#fff" }}
          >
            {micOn ? <Mic size={22} color={COLORS.paper} /> : <MicOff size={22} color={COLORS.night} />}
          </button>
          {type === "video" && (
            <button
              onClick={toggleCam}
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: camOn ? COLORS.nightSurfaceRaised : "#fff" }}
            >
              {camOn ? <Video size={22} color={COLORS.paper} /> : <VideoOff size={22} color={COLORS.night} />}
            </button>
          )}
          <button
            onClick={() => setSpeakerOn((v) => !v)}
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: speakerOn ? COLORS.signal : COLORS.nightSurfaceRaised }}
          >
            <Volume2 size={22} color={COLORS.paper} />
          </button>
        </div>
        <button onClick={handleEnd} className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-[15px]" style={{ background: "#E74C3C", color: "#fff" }}>
          <PhoneOff size={18} />
          Raccrocher
        </button>
      </div>
    </div>
  );
}

/* ---------------- ÉCRAN : BLOC-NOTES ---------------- */
function ScreenNotes({ onBack, highContrast }) {
  const bg = highContrast ? COLORS.paper : COLORS.night;
  const text = highContrast ? COLORS.ink : COLORS.paper;
  const sub = highContrast ? COLORS.slate : COLORS.slateLight;
  const card = highContrast ? COLORS.paperDim : COLORS.nightSurface;
  const [notes, setNotes] = useState([
    { id: 1, text: "Commander 20 sacs de riz pour le stock", date: "Aujourd'hui, 08:12" },
    { id: 2, text: "Rappeler le fournisseur textile avant vendredi", date: "Hier, 17:40" },
  ]);
  const [draft, setDraft] = useState("");

  function addNote() {
    const t = draft.trim();
    if (!t) return;
    setNotes([{ id: Date.now(), text: t, date: "À l'instant" }, ...notes]);
    setDraft("");
  }
  function removeNote(id) {
    setNotes(notes.filter((n) => n.id !== id));
  }

  return (
    <div className="h-full flex flex-col" style={{ background: bg }}>
      {highContrast ? <StatusBarDark /> : <StatusBar />}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onBack}><ArrowLeft size={22} color={text} /></button>
        <h1 className="text-[18px] font-bold" style={{ color: text, fontFamily: "'Sora', sans-serif" }}>Bloc-notes</h1>
      </div>

      <div className="px-4 py-2">
        <div className="flex items-center gap-2 rounded-2xl px-3 py-2.5" style={{ background: card }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addNote()}
            placeholder="Écrire une note…"
            className="flex-1 bg-transparent outline-none text-[13.5px]"
            style={{ color: text }}
          />
          <button onClick={() => {}} title="Note vocale">
            <Mic2 size={18} color={sub} />
          </button>
          <button onClick={addNote} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: COLORS.signal }}>
            <Plus size={16} color="#fff" />
          </button>
        </div>
      </div>

      <div className="px-4 pt-2">
        <div className="flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-3" style={{ background: COLORS.signal + "18" }}>
          <Calendar size={17} color={COLORS.signal} />
          <span className="text-[13px] font-medium flex-1" style={{ color: text }}>Rappels & calendrier</span>
          <ChevronRight size={16} color={sub} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-2">
        {notes.map((n) => (
          <div key={n.id} className="flex items-start gap-3 rounded-2xl px-4 py-3" style={{ background: card }}>
            <FileText size={16} color={COLORS.signal} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-[13.5px]" style={{ color: text }}>{n.text}</p>
              <p className="text-[11px] mt-1" style={{ color: sub }}>{n.date}</p>
            </div>
            <button onClick={() => removeNote(n.id)}>
              <Trash2 size={15} color={sub} />
            </button>
          </div>
        ))}
        {notes.length === 0 && (
          <p className="text-center text-[13px] mt-10" style={{ color: sub }}>Aucune note pour l'instant</p>
        )}
      </div>
    </div>
  );
}

/* ---------------- ÉCRAN : SOUTIEN (DON) ---------------- */
function ScreenDon({ onBack, highContrast }) {
  const bg = highContrast ? COLORS.paper : COLORS.night;
  const text = highContrast ? COLORS.ink : COLORS.paper;
  const sub = highContrast ? COLORS.slate : COLORS.slateLight;
  const card = highContrast ? COLORS.paperDim : COLORS.nightSurface;
  const [amount, setAmount] = useState(5000);
  const [custom, setCustom] = useState("");
  const [sent, setSent] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const presets = [1000, 5000, 10000, 25000];

  const finalAmount = custom ? Number(custom) : amount;

  async function handleDon() {
    setPayError("");
    if (!isPaystackConfigured()) {
      // Clé Paystack pas encore fournie : mode démonstration
      setSent(true);
      return;
    }
    setPaying(true);
    try {
      await payWithPaystack({
        email: "donateur@oracle-messenger.app", // à remplacer par l'email réel de l'utilisateur connecté
        amountFcfa: finalAmount,
        metadata: { type: "don", source: "oracle-messenger" },
        onSuccess: () => setSent(true),
      });
    } catch (err) {
      console.warn("Paiement Paystack indisponible ou annulé :", err);
      setPayError("Le paiement n'a pas abouti. Réessaie, ou vérifie ta connexion.");
    } finally {
      setPaying(false);
    }
  }

  if (sent) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 text-center" style={{ background: bg }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: COLORS.online + "22" }}>
          <Check size={28} color={COLORS.online} />
        </div>
        <h2 className="text-[18px] font-bold mb-2" style={{ color: text, fontFamily: "'Sora', sans-serif" }}>Merci pour votre soutien</h2>
        <p className="text-[13.5px] mb-6" style={{ color: sub }}>Votre don de {finalAmount.toLocaleString("fr-FR")} FCFA a été transmis via Paystack.</p>
        <PrimaryButton onClick={onBack}>Retour</PrimaryButton>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: bg }}>
      {highContrast ? <StatusBarDark /> : <StatusBar />}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onBack}><ArrowLeft size={22} color={text} /></button>
        <h1 className="text-[18px] font-bold" style={{ color: text, fontFamily: "'Sora', sans-serif" }}>Soutien</h1>
      </div>
      <div className="flex-1 flex flex-col px-6 pt-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: COLORS.signal + "22" }}>
          <Heart size={24} color={COLORS.signal} />
        </div>
        <h2 className="text-[17px] font-bold mb-2" style={{ color: text, fontFamily: "'Sora', sans-serif" }}>Faire un don</h2>
        <p className="text-[13px] mb-6" style={{ color: sub }}>Choisissez librement le montant de votre soutien.</p>

        <div className="grid grid-cols-2 gap-2.5 mb-4">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => { setAmount(p); setCustom(""); }}
              className="rounded-2xl py-3.5 text-[14px] font-semibold"
              style={{
                background: !custom && amount === p ? COLORS.signal : card,
                color: !custom && amount === p ? "#fff" : text,
              }}
            >
              {p.toLocaleString("fr-FR")} FCFA
            </button>
          ))}
        </div>

        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/\D/g, ""))}
          placeholder="Autre montant (FCFA)"
          className="rounded-2xl px-4 py-3.5 text-[14px] outline-none mb-6"
          style={{ background: card, color: text, border: custom ? `1.5px solid ${COLORS.signal}` : "none" }}
        />

        <PrimaryButton onClick={handleDon} disabled={!finalAmount || paying}>
          {paying ? "Paiement en cours…" : `Faire un don de ${finalAmount ? finalAmount.toLocaleString("fr-FR") : "…"} FCFA`}
        </PrimaryButton>
        {payError && <p className="text-center text-[11.5px] mt-2" style={{ color: "#E74C3C" }}>{payError}</p>}
        <p className="text-center text-[11px] mt-3" style={{ color: sub }}>Paiement sécurisé via Paystack — Oracle Plus</p>
      </div>
    </div>
  );
}

/* ---------------- ÉCRAN : PARTAGE / INVITER ---------------- */
function ScreenInvite({ onBack, highContrast }) {
  const bg = highContrast ? COLORS.paper : COLORS.night;
  const text = highContrast ? COLORS.ink : COLORS.paper;
  const sub = highContrast ? COLORS.slate : COLORS.slateLight;
  const card = highContrast ? COLORS.paperDim : COLORS.nightSurface;
  const [copied, setCopied] = useState(false);
  const link = "messenger.oracle-plus.online/u/toncompte";

  const channels = [
    { label: "WhatsApp", icon: MessageSquareText, color: "#25D366" },
    { label: "Facebook", icon: Facebook, color: "#1877F2" },
    { label: "TikTok", icon: Share2, color: "#000000" },
    { label: "SMS", icon: Phone, color: COLORS.signal },
  ];

  return (
    <div className="h-full flex flex-col" style={{ background: bg }}>
      {highContrast ? <StatusBarDark /> : <StatusBar />}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onBack}><ArrowLeft size={22} color={text} /></button>
        <h1 className="text-[18px] font-bold" style={{ color: text, fontFamily: "'Sora', sans-serif" }}>Inviter</h1>
      </div>
      <div className="flex-1 flex flex-col items-center px-7 pt-6 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: COLORS.signal + "22" }}>
          <Share2 size={26} color={COLORS.signal} />
        </div>
        <h2 className="text-[17px] font-bold mb-2" style={{ color: text, fontFamily: "'Sora', sans-serif" }}>Votre lien Oracle</h2>
        <p className="text-[13px] mb-5" style={{ color: sub }}>
          C'est votre carte d'identité numérique. Toute personne qui clique arrive directement dans votre messagerie.
        </p>

        <div className="w-full rounded-2xl px-4 py-3.5 flex items-center gap-3 mb-6" style={{ background: card }}>
          <LinkIcon size={16} color={COLORS.signal} className="shrink-0" />
          <span className="flex-1 text-[13px] truncate" style={{ color: text }}>{link}</span>
          <button
            onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold"
            style={{ background: COLORS.signal, color: "#fff" }}
          >
            {copied ? "Copié !" : "Copier"}
          </button>
        </div>

        <div className="w-full grid grid-cols-4 gap-3">
          {channels.map((c, i) => (
            <button key={i} className="flex flex-col items-center gap-1.5">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: c.color }}>
                <c.icon size={19} color="#fff" />
              </div>
              <span className="text-[10.5px]" style={{ color: sub }}>{c.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- ÉCRAN : MULTIMÉDIA ---------------- */
function ScreenMedia({ onBack, highContrast, onOpenRetouch }) {
  const bg = highContrast ? COLORS.paper : COLORS.night;
  const text = highContrast ? COLORS.ink : COLORS.paper;
  const sub = highContrast ? COLORS.slate : COLORS.slateLight;
  const card = highContrast ? COLORS.paperDim : COLORS.nightSurface;
  const [tab, setTab] = useState("recus");

  const items = [
    { type: "image", label: "Catalogue.jpg" },
    { type: "video", label: "Promo_Nov.mp4" },
    { type: "image", label: "Reçu_204.jpg" },
    { type: "doc", label: "Facture.pdf" },
    { type: "image", label: "Produit_3.jpg" },
    { type: "image", label: "Produit_4.jpg" },
  ];

  return (
    <div className="h-full flex flex-col" style={{ background: bg }}>
      {highContrast ? <StatusBarDark /> : <StatusBar />}
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onBack}><ArrowLeft size={22} color={text} /></button>
        <h1 className="text-[18px] font-bold" style={{ color: text, fontFamily: "'Sora', sans-serif" }}>Multimédia</h1>
      </div>

      <div className="flex gap-2 px-4 mb-3">
        {[{ k: "recus", l: "Reçus" }, { k: "telephone", l: "Téléphone" }, { k: "nettoyage", l: "Nettoyage" }].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className="text-[12.5px] font-semibold px-3.5 py-1.5 rounded-full"
            style={{ background: tab === t.k ? COLORS.signal : card, color: tab === t.k ? "#fff" : sub }}
          >
            {t.l}
          </button>
        ))}
      </div>

      {tab === "recus" && (
        <div className="mx-4 mb-3 rounded-xl px-3.5 py-2.5 flex items-center gap-2" style={{ background: COLORS.signal + "18" }}>
          <Save size={14} color={COLORS.signal} />
          <span className="text-[11.5px]" style={{ color: text }}>
            Chaque photo/vidéo reçue est enregistrée automatiquement dans le stockage de votre téléphone.
          </span>
        </div>
      )}

      {tab === "nettoyage" ? (
        <div className="flex-1 px-4">
          <div className="rounded-2xl px-4 py-4 mb-3" style={{ background: card }}>
            <p className="text-[13px] font-semibold mb-1" style={{ color: text }}>Espace utilisé : 1,2 Go</p>
            <div className="w-full h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: COLORS.hairline }}>
              <div className="h-full rounded-full" style={{ width: "34%", background: COLORS.signal }} />
            </div>
          </div>
          <button className="w-full rounded-2xl py-3 text-[13px] font-semibold" style={{ background: card, color: text }}>
            Trier par les plus lourds
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 grid grid-cols-3 gap-2 content-start">
          {items.map((it, i) => (
            <button
              key={i}
              onClick={() => it.type !== "doc" && onOpenRetouch("media")}
              className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 relative"
              style={{ background: card }}
            >
              {it.type === "image" && <ImageIcon size={22} color={sub} />}
              {it.type === "video" && (
                <>
                  <Film size={22} color={sub} />
                  <Play size={14} color={sub} className="absolute top-2 right-2" />
                </>
              )}
              {it.type === "doc" && <FileIcon size={22} color={sub} />}
              <span className="text-[9.5px] px-1 truncate w-full text-center" style={{ color: sub }}>{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- ÉCRAN : STORIES (statuts) ---------------- */
const STORIES = ["Grâce", "Junior", "Aïcha", "Client #204"];

function ScreenStories({ onClose }) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const i = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          if (index < STORIES.length - 1) setIndex((idx) => idx + 1);
          else onClose();
          return 0;
        }
        return p + 2;
      });
    }, 60);
    return () => clearInterval(i);
  }, [index]);

  return (
    <div className="h-full flex flex-col relative" style={{ background: COLORS.night }}>
      <div className="flex gap-1 px-3 pt-3">
        {STORIES.map((_, i) => (
          <div key={i} className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.25)" }}>
            <div className="h-full" style={{ width: `${i < index ? 100 : i === index ? progress : 0}%`, background: "#fff" }} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[13px]" style={{ background: COLORS.signal, color: "#fff" }}>
          {STORIES[index].charAt(0)}
        </div>
        <span className="text-[13.5px] font-semibold flex-1" style={{ color: "#fff" }}>{STORIES[index]}</span>
        <button onClick={onClose}>
          <X size={22} color="#fff" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center" style={{ background: COLORS.nightSurface }}>
        <p className="text-[13px]" style={{ color: COLORS.slateLight }}>Aperçu du statut (démo)</p>
      </div>
      <div className="absolute inset-y-0 left-0 w-1/3" onClick={() => setIndex((i) => Math.max(0, i - 1))} />
      <div className="absolute inset-y-0 right-0 w-1/3" onClick={() => (index < STORIES.length - 1 ? setIndex(index + 1) : onClose())} />
    </div>
  );
}

/* ---------------- ÉCRAN : STUDIO DE RETOUCHE PHOTO/VIDÉO ---------------- */
const FILTERS = ["Original", "Vif", "N&B", "Chaud", "Froid"];

function ScreenRetouch({ onBack, highContrast, mode = "story" }) {
  const [filter, setFilter] = useState("Original");
  const [rotation, setRotation] = useState(0);
  const [saved, setSaved] = useState(false);

  const filterStyle = {
    Original: {},
    Vif: { filter: "saturate(1.6) contrast(1.1)" },
    "N&B": { filter: "grayscale(1)" },
    Chaud: { filter: "sepia(0.35) saturate(1.2)" },
    Froid: { filter: "hue-rotate(180deg) saturate(0.8)" },
  }[filter];

  function handleSave() {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onBack();
    }, 1400);
  }

  return (
    <div className="h-full flex flex-col" style={{ background: COLORS.night }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onBack}>
          <X size={22} color={COLORS.paper} />
        </button>
        <h1 className="text-[16px] font-bold flex-1" style={{ color: COLORS.paper, fontFamily: "'Sora', sans-serif" }}>
          {mode === "story" ? "Nouveau statut" : "Retoucher"}
        </h1>
        <button onClick={() => setRotation((r) => r + 90)}>
          <RotateCw size={19} color={COLORS.slateLight} />
        </button>
      </div>

      <div className="flex-1 mx-4 rounded-2xl overflow-hidden flex items-center justify-center relative" style={{ background: COLORS.nightSurface }}>
        <div
          className="w-40 h-40 rounded-2xl flex items-center justify-center transition-transform"
          style={{ background: COLORS.signal + "33", transform: `rotate(${rotation}deg)`, ...filterStyle }}
        >
          <ImageIcon size={48} color={COLORS.signal} />
        </div>
        {saved && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(8,16,25,0.75)" }}>
            <div className="flex flex-col items-center gap-2">
              <Check size={32} color={COLORS.online} />
              <span className="text-[13px] font-medium" style={{ color: "#fff" }}>Enregistré dans la galerie</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-4">
        <div className="flex gap-2.5 overflow-x-auto mb-4 pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="shrink-0 rounded-xl px-3.5 py-2 text-[12px] font-semibold"
              style={{ background: filter === f ? COLORS.signal : COLORS.nightSurface, color: filter === f ? "#fff" : COLORS.slateLight }}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-center gap-6 mb-4">
          <button className="flex flex-col items-center gap-1">
            <Crop size={19} color={COLORS.slateLight} />
            <span className="text-[10.5px]" style={{ color: COLORS.slateLight }}>Recadrer</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <Type size={19} color={COLORS.slateLight} />
            <span className="text-[10.5px]" style={{ color: COLORS.slateLight }}>Texte</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <SlidersHorizontal size={19} color={COLORS.slateLight} />
            <span className="text-[10.5px]" style={{ color: COLORS.slateLight }}>Ajuster</span>
          </button>
        </div>
        <PrimaryButton onClick={handleSave} icon={<Save size={17} />}>
          {mode === "story" ? "Publier le statut" : "Enregistrer dans la galerie"}
        </PrimaryButton>
      </div>
    </div>
  );
}

export default function OracleMessengerPrototype() {
  const [screen, setScreen] = useState("welcome");
  const [phone, setPhone] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [userId, setUserId] = useState(null);
  const [highContrast, setHighContrast] = useState(true); // lisibilité plein jour activée par défaut
  const [menuItem, setMenuItem] = useState(null);
  const [businessUnlocked, setBusinessUnlocked] = useState(false);
  const [callType, setCallType] = useState("audio");
  const [retouchMode, setRetouchMode] = useState("story");
  const [notifStatus, setNotifStatus] = useState("idle"); // idle | granted | denied | unavailable

  useEffect(() => {
    if (!userId) return;
    registerPushNotifications(userId)
      .then((token) => setNotifStatus(token ? "granted" : "denied"))
      .catch((err) => {
        console.warn("Notifications push indisponibles ici :", err);
        setNotifStatus("unavailable");
      });

    const unsub = listenForegroundMessages((payload) => {
      // Notification reçue pendant que l'app est déjà ouverte au premier plan
      console.log("Notification reçue (premier plan) :", payload);
    });
    return () => unsub && unsub();
  }, [userId]);

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-6" style={{ background: "#1a1a1a", fontFamily: "'Inter', sans-serif" }}>
      <div
        className="relative w-[375px] h-[780px] rounded-[46px] overflow-hidden shadow-2xl"
        style={{ border: "10px solid #0a0a0a" }}
      >
        {screen === "welcome" && <ScreenWelcome onInstall={() => setScreen("installing")} />}
        {screen === "installing" && <ScreenInstalling onDone={() => setScreen("phone")} />}
        {screen === "phone" && (
          <ScreenPhone
            onSubmit={(p, confirmation) => {
              setPhone(p);
              setConfirmationResult(confirmation);
              setScreen("code");
            }}
          />
        )}
        {screen === "code" && (
          <ScreenCode
            phone={phone}
            confirmationResult={confirmationResult}
            onVerified={(uid) => {
              setUserId(uid);
              setScreen("chatlist");
            }}
          />
        )}
        {screen === "chatlist" && (
          <ScreenChatList
            highContrast={highContrast}
            onOpenChat={() => setScreen("conversation")}
            onOpenMenu={() => setScreen("menu")}
            onToggleContrast={() => setHighContrast((v) => !v)}
            onOpenContacts={() => setScreen("contacts")}
            onOpenStories={() => setScreen("stories")}
            onAddStory={() => { setRetouchMode("story"); setScreen("retouch"); }}
          />
        )}
        {screen === "conversation" && (
          <ScreenConversation
            userId={userId}
            onBack={() => setScreen("chatlist")}
            onCall={(type) => { setCallType(type); setScreen("call"); }}
            onArchive={() => setScreen("chatlist")}
          />
        )}
        {screen === "contacts" && (
          <ScreenContacts highContrast={highContrast} onBack={() => setScreen("chatlist")} onOpenChat={() => setScreen("conversation")} />
        )}
        {screen === "call" && <ScreenCall type={callType} onEnd={() => setScreen("conversation")} />}
        {screen === "stories" && <ScreenStories onClose={() => setScreen("chatlist")} />}
        {screen === "retouch" && (
          <ScreenRetouch
            highContrast={highContrast}
            mode={retouchMode}
            onBack={() => setScreen(retouchMode === "media" ? "multimedia" : "chatlist")}
          />
        )}
        {screen === "menu" && (
          <ScreenMenu
            highContrast={highContrast}
            onBack={() => setScreen("chatlist")}
            onOpenItem={(key) => {
              const routed = ["business", "blocnotes", "soutien", "inviter", "multimedia"];
              setMenuItem(key);
              setScreen(routed.includes(key) ? key : "menudetail");
            }}
          />
        )}
        {screen === "menudetail" && (
          <ScreenMenuDetail
            itemKey={menuItem}
            highContrast={highContrast}
            onToggleContrast={() => setHighContrast((v) => !v)}
            onBack={() => setScreen("menu")}
          />
        )}
        {screen === "business" && (
          <ScreenBusinessHub
            highContrast={highContrast}
            unlocked={businessUnlocked}
            onUnlock={() => setBusinessUnlocked(true)}
            onBack={() => setScreen("menu")}
          />
        )}
        {screen === "blocnotes" && <ScreenNotes highContrast={highContrast} onBack={() => setScreen("menu")} />}
        {screen === "soutien" && <ScreenDon highContrast={highContrast} onBack={() => setScreen("menu")} />}
        {screen === "inviter" && <ScreenInvite highContrast={highContrast} onBack={() => setScreen("menu")} />}
        {screen === "multimedia" && (
          <ScreenMedia
            highContrast={highContrast}
            onBack={() => setScreen("menu")}
            onOpenRetouch={(m) => { setRetouchMode(m); setScreen("retouch"); }}
          />
        )}
      </div>

      {/* Barre de navigation démo (hors app réelle) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-2 flex-wrap max-w-[90vw] justify-center">
        {["welcome", "installing", "phone", "code", "chatlist", "conversation", "menu"].map((s) => (
          <button
            key={s}
            onClick={() => setScreen(s)}
            className="text-[11px] px-2.5 py-1 rounded-full font-medium"
            style={{
              background: screen === s || (s === "menu" && screen === "menudetail") ? COLORS.signal : "transparent",
              color: screen === s || (s === "menu" && screen === "menudetail") ? "#fff" : "#aaa",
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
