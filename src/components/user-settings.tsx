
'use client';

import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserSettings as UserSettingsType } from '@/types/soil';

export function UserSettings() {
  const { settings, updateSettings, user } = useAuth();
  const { toast } = useToast();
  const [defaultPrivacy, setDefaultPrivacy] = useState<'public' | 'private'>('private');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (settings) {
      setDefaultPrivacy(settings.defaultPrivacy);
    }
  }, [settings]);

  const handleSave = async () => {
    setIsLoading(true);
    const newSettings: Partial<UserSettingsType> = { defaultPrivacy };
    try {
       await updateSettings(newSettings);
       toast({ title: 'Settings Saved', description: 'Your default privacy setting has been updated.' });
    } catch (error) {
        toast({
         variant: 'destructive',
         title: 'Error Saving Settings',
         description: 'Could not save your settings. Please try again.',
       });
       console.error("Error saving settings:", error);
    } finally {
       setIsLoading(false);
    }

  };

  return (
    <Card className="w-full max-w-md bg-card border-border shadow-md">
      <CardHeader>
        <CardTitle>Default Privacy</CardTitle>
        <CardDescription>
          Choose the default privacy setting for new soil data entries. You can override this for each individual entry.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="defaultPrivacy">Default Privacy Setting</Label>
           <Select value={defaultPrivacy} onValueChange={(value: 'public' | 'private') => setDefaultPrivacy(value)}>
              <SelectTrigger id="defaultPrivacy" className="w-full">
                <SelectValue placeholder="Select default privacy" />
              </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">
                <div className="flex items-center gap-2">
                   <Lock className="h-4 w-4" /> Private (Only You)
                </div>
              </SelectItem>
              <SelectItem value="public">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Public (Visible to All)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Add other settings fields here if needed */}
      </CardContent>
       <CardFooter>
         <Button onClick={handleSave} disabled={isLoading || defaultPrivacy === settings?.defaultPrivacy}>
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
       </CardFooter>
    </Card>
  );
}
