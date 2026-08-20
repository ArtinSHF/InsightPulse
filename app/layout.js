export const metadata = {
  title: 'InsightPulse — Enterprise Survey & Interview Platform',
  description:
    'Design branded interviews, share them with a link, and let AI synthesize the signal.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
