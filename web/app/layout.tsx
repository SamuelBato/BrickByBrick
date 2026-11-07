import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BrickByBrick",
  description: "Zo surových klipov zo stavby vznikne Reel.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sk">
      <body>{children}</body>
    </html>
  );
}
