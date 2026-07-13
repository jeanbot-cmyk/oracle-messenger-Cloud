import "./globals.css";

export const metadata = {
  title: "Oracle Messenger",
  description: "Votre messagerie et votre outil de gestion, réunis dans une seule application.",
  manifest: "/manifest.json",
  themeColor: "#081019",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
