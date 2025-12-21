import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, Truck } from 'lucide-react';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '' });
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data } = await supabase.from('suppliers').select('*').order('name');
    setSuppliers(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      const { error } = await supabase.from('suppliers').update(form).eq('id', editing.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Updated' });
    } else {
      const { error } = await supabase.from('suppliers').insert(form);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Added' });
    }
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Deleted' });
    fetchData();
  };

  const resetForm = () => { setForm({ name: '', contact_person: '', phone: '', email: '', address: '' }); setEditing(null); };
  const openEdit = (s: any) => { setEditing(s); setForm(s); setDialogOpen(true); };
  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-3xl font-bold gradient-text">Suppliers</h1><p className="text-muted-foreground">Manage your parts suppliers</p></div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Supplier</Button></DialogTrigger>
          <DialogContent className="glass">
            <DialogHeader><DialogTitle className="font-display">{editing ? 'Edit' : 'Add'} Supplier</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Company Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              </div>
              <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
              <Button type="submit" className="w-full">{editing ? 'Update' : 'Add'} Supplier</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 max-w-sm" /></div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(s => (
          <Card key={s.id} className="glass hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center"><Truck className="h-5 w-5 text-primary" /></div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              <h3 className="font-display font-bold mt-4">{s.name}</h3>
              {s.contact_person && <p className="text-sm text-muted-foreground">{s.contact_person}</p>}
              {s.phone && <p className="text-sm mt-2">{s.phone}</p>}
              {s.email && <p className="text-sm text-primary">{s.email}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && <p className="text-center py-8 text-muted-foreground">No suppliers found</p>}
    </div>
  );
}
