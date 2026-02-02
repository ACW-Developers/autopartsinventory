import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Users as UsersIcon, Shield, User, Trash2, UserX, UserCheck, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'staff';
  is_active: boolean;
  created_at: string;
}

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId: string | null; userName: string }>({
    open: false,
    userId: null,
    userName: ''
  });
  const { isAdmin, user: currentUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: 'Error fetching users', description: error.message, variant: 'destructive' });
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const updateRole = async (userId: string, newRole: 'admin' | 'staff') => {
    // Prevent self-demotion
    if (userId === currentUser?.id && newRole !== 'admin') {
      toast({ title: 'Cannot change own role', description: 'You cannot demote yourself', variant: 'destructive' });
      return;
    }

    // Update profile role
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (profileError) {
      toast({ title: 'Error updating role', description: profileError.message, variant: 'destructive' });
      return;
    }

    // Update user_roles table
    await supabase.from('user_roles').delete().eq('user_id', userId);
    const { error: roleError } = await supabase.from('user_roles').insert([{ user_id: userId, role: newRole }]);

    if (roleError) {
      toast({ title: 'Warning', description: 'Profile updated but role sync may have failed', variant: 'destructive' });
    } else {
      toast({ title: 'Role Updated', description: `User role changed to ${newRole}` });
    }
    fetchUsers();
  };

  const toggleActive = async (userId: string, isActive: boolean) => {
    // Prevent self-deactivation
    if (userId === currentUser?.id) {
      toast({ title: 'Cannot deactivate yourself', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !isActive })
      .eq('id', userId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    
    toast({ 
      title: isActive ? 'User Deactivated' : 'User Activated',
      description: isActive ? 'User can no longer access the system' : 'User access has been restored'
    });
    fetchUsers();
  };

  const confirmDelete = (userId: string, userName: string) => {
    if (userId === currentUser?.id) {
      toast({ title: 'Cannot delete yourself', variant: 'destructive' });
      return;
    }
    setDeleteDialog({ open: true, userId, userName });
  };

  const deleteUser = async () => {
    if (!deleteDialog.userId) return;

    // Delete from user_roles first
    await supabase.from('user_roles').delete().eq('user_id', deleteDialog.userId);
    
    // Delete from profiles
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', deleteDialog.userId);

    if (error) {
      toast({ title: 'Error deleting user', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'User Deleted', description: 'User has been permanently removed' });
      fetchUsers();
    }
    
    setDeleteDialog({ open: false, userId: null, userName: '' });
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="glass p-8 text-center">
          <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-display font-bold mb-2">Admin Access Required</h2>
          <p className="text-muted-foreground">Only administrators can access user management.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold gradient-text">User Management</h1>
          <p className="text-muted-foreground">Manage system users, roles and access</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <UsersIcon className="h-3 w-3 mr-1" />
            {users.length} Users
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <UsersIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-display font-bold">{users.length}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Shield className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-2xl font-display font-bold">{users.filter(u => u.role === 'admin').length}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-display font-bold">{users.filter(u => u.is_active).length}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4">
          {users.map((u, index) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`glass ${!u.is_active ? 'opacity-60' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* User Info */}
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                        u.role === 'admin' ? 'bg-amber-500/20' : 'bg-primary/20'
                      }`}>
                        {u.role === 'admin' ? (
                          <Shield className="h-6 w-6 text-amber-500" />
                        ) : (
                          <User className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{u.full_name}</p>
                          {u.id === currentUser?.id && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Joined {new Date(u.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Status Badge */}
                      <Badge 
                        variant={u.is_active ? 'default' : 'secondary'} 
                        className={`cursor-pointer transition-all hover:scale-105 ${
                          u.id === currentUser?.id ? 'cursor-not-allowed opacity-70' : ''
                        }`}
                        onClick={() => u.id !== currentUser?.id && toggleActive(u.id, u.is_active)}
                      >
                        {u.is_active ? (
                          <><UserCheck className="h-3 w-3 mr-1" /> Active</>
                        ) : (
                          <><UserX className="h-3 w-3 mr-1" /> Inactive</>
                        )}
                      </Badge>

                      {/* Role Selector */}
                      <Select 
                        value={u.role} 
                        onValueChange={(v) => updateRole(u.id, v as 'admin' | 'staff')}
                        disabled={u.id === currentUser?.id}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Shield className="h-3 w-3" /> Admin
                            </div>
                          </SelectItem>
                          <SelectItem value="staff">
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" /> Staff
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => confirmDelete(u.id, u.full_name)}
                        disabled={u.id === currentUser?.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {users.length === 0 && (
            <Card className="glass">
              <CardContent className="p-12 text-center">
                <UsersIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No users found</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="glass">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteDialog.userName}</strong>? 
              This action cannot be undone. The user will be permanently removed from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
