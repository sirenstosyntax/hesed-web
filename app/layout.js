import "./globals.css";

export const metadata = {
  title: "Hesed",
  description: "Personalized Bible studies that deepen over time.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hesed",
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
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
