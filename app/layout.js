import "./globals.css";

export const metadata = {
  title: "Hesed",
  description: "Personalized Bible studies that deepen over time.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hesed",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#5c3d1e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
