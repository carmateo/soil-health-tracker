
'use client';

import { useAuth } from '@/context/auth-context';
import { useFirebase } from '@/context/firebase-context';
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image'; // Import Next Image


export function SiteHeader() {
  const { user } = useAuth();
  const { auth } = useFirebase();
   const router = useRouter();
   const { toast } = useToast();


   const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/'); // Redirect to home page after logout
    } catch (error) {
       console.error('Logout error:', error);
       toast({ variant: 'destructive', title: 'Logout Failed', description: 'Could not log out. Please try again.' });
    }
  };


  return (
    <header className="sticky top-0 z-40 w-full border-b bg-primary text-primary-foreground shadow-sm">
      <div className="container flex h-16 items-center justify-between px-8">
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex items-center space-x-3"
          style={{ marginLeft: '-0.5cm' }} // Move an additional 0.5cm to the left
        >
           <Image
             src="/Logo Vector.png" 
             alt="SHDC Logo"
             width={30} 
             height={30} 
             className="object-contain"
           />
          <span className="font-bold text-xl">Soil Health Data Collection</span>
        </Link>
        <nav>
          {user && (
            <Button variant="ghost" className="hover:bg-primary/90 hover:text-primary-foreground" onClick={handleLogout}>
               <LogOut className="mr-2 h-4 w-4" /> Logout
             </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

