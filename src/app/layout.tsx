import type {Metadata} from 'next';
import { Roboto } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseProvider } from '@/context/firebase-context';
import { AuthProvider } from '@/context/auth-context';
import { SiteHeader } from '@/components/site-header';

const roboto = Roboto({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
});

export const metadata: Metadata = {
  title: 'SHDC: Soil Health Data Collection',
  description: 'Track your soil health data',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${roboto.variable} antialiased font-sans`}>
        <FirebaseProvider>
          <AuthProvider>
            <div className="min-h-screen flex flex-col">
              <SiteHeader />
              <main className="flex-1 container mx-auto px-4 py-8">
                {children}
              </main>
              <Toaster />
            </div>
          </AuthProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}