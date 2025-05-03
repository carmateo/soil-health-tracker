
'use client';

import { useAuth } from '@/context/auth-context';
import { useFirebase } from '@/context/firebase-context';
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { LogOut, Leaf } from 'lucide-react'; // Using Leaf as a placeholder icon
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';


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
      <div className="container flex h-16 items-center justify-between">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center space-x-2">
           <Leaf className="h-6 w-6" />
           {/* Changed text and increased font size */}
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

