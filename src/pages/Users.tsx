import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Users as UsersIcon, Shield, User } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => { if (isAdmin) fetchUsers(); }, [isAdmin]);

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
  };

  const updateRole = async (userId: string, newRole: 'admin' | 'staff') => {
    const { error: profileError } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (profileError) { toast({ title: 'Error', description: profileError.message, variant: 'destructive' }); return; }

    await supabase.from('user_roles').delete().eq('user_id', userId);
    await supabase.from('user_roles').insert([{ user_id: userId, role: newRole }]);

    toast({ title: 'Role Updated' });
    fetchUsers();
  };

  const toggleActive = async (userId: string, isActive: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_active: !isActive }).eq('id', userId);
    if (error) { toast({ title: 'Error', variant: 'destructive' }); return; }
    toast({ title: isActive ? 'User Deactivated' : 'User Activated' });
    fetchUsers();
  };

  if (!isAdmin) return <p className="text-center py-8">Access Denied</p>;

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl font-bold gradient-text">User Management</h1><p className="text-muted-foreground">Manage system users and roles</p></div>

      <div className="grid gap-4">
        {users.map(u => (
          <Card key={u.id} className="glass">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  {u.role === 'admin' ? <Shield className="h-6 w-6 text-primary" /> : <User className="h-6 w-6 text-muted-foreground" />}
                </div>
                <div>
                  <p className="font-medium">{u.full_name}</p>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant={u.is_active ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => toggleActive(u.id, u.is_active)}>{u.is_active ? 'Active' : 'Inactive'}</Badge>
                <Select value={u.role} onValueChange={(v) => updateRole(u.id, v as 'admin' | 'staff')}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="staff">Staff</SelectItem></SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
