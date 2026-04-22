import './globals.css';

export const metadata = {
  title: 'BiasLens — AI Fairness Auditor',
  description: 'Detect, explain, and fix bias in your datasets and ML models using AI.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
