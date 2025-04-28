
'use client';

import { useAuth } from '@/context/auth-context';
import { LoginForm } from '@/components/login-form';
import { RegisterForm } from '@/components/register-form';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/loading-spinner';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [authAction, setAuthAction] = useState<'login' | 'register'>('login');

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
       <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
         <LoadingSpinner />
       </div>
    );
  }

  if (user) {
     // User is logged in but hasn't been redirected yet, show loading or null
    return (
       <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
         <LoadingSpinner />
       </div>
    );
  }


  return (
    <div className="flex justify-center items-start pt-16 min-h-[calc(100vh-10rem)]">
      <Tabs defaultValue="login" value={authAction} onValueChange={(value) => setAuthAction(value as 'login' | 'register')} className="w-[400px] max-w-full px-4 sm:px-0">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
           <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <CardTitle>Login</CardTitle>
            </CardHeader>
            <CardContent>
              <LoginForm />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="register">
           <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <CardTitle>Register</CardTitle>
            </CardHeader>
            <CardContent>
              <RegisterForm onRegisterSuccess={() => setAuthAction('login')} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
