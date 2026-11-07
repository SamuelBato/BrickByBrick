import type { Metadata } from "next";
import { Lilita_One, Oswald } from "next/font/google";
import "./globals.css";

const display = Lilita_One({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-display" });
const condensed = Oswald({ weight: "600", subsets: ["latin", "latin-ext"], variable: "--font-condensed" });

export const metadata: Metadata = {
  title: "BrickByBrick",
  description: "Zo stavby rovno na tvoje sociálne siete.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sk" className={`${display.variable} ${condensed.variable}`}>
      <body>
        <header className="site-header">
          <p className="logo">BrickByBrick</p>
          <p className="tagline">Zo stavby rovno na tvoje sociálne siete</p>
        </header>
        {children}
      </body>
    </html>
  );
}
