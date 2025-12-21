import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, Key } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Profile() {
  const { user, role } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => { if (user) fetchProfile(); }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle();
    if (data) { setProfile(data); setFullName(data.full_name); }
  };

  const updateProfile = async () => {
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user!.id);
    setLoading(false);
    if (error) { toast({ title: 'Error', variant: 'destructive' }); return; }
    toast({ title: 'Profile Updated' });
  };

  const updatePassword = async () => {
    if (newPassword.length < 6) { toast({ title: 'Password must be at least 6 characters', variant: 'destructive' }); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Password Updated' });
    setNewPassword('');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="font-display text-3xl font-bold gradient-text">Profile</h1><p className="text-muted-foreground">Manage your account</p></div>

      <Card className="glass">
        <CardHeader><CardTitle className="font-display flex items-center gap-2"><User className="h-5 w-5" />Personal Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center"><User className="h-8 w-8 text-primary" /></div>
            <div><p className="font-medium">{user?.email}</p><Badge>{role}</Badge></div>
          </div>
          <div><Label>Full Name</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
          <Button onClick={updateProfile} disabled={loading}>Save Changes</Button>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader><CardTitle className="font-display flex items-center gap-2"><Key className="h-5 w-5" />Change Password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>New Password</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" /></div>
          <Button onClick={updatePassword} disabled={loading || !newPassword}>Update Password</Button>
        </CardContent>
      </Card>
    </div>
  );
}
