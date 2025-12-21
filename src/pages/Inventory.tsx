import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const categories = ['Engine Parts', 'Brakes', 'Suspension', 'Electrical', 'Body Parts', 'Filters', 'Fluids', 'Accessories'];

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({ part_name: '', part_number: '', category: '', supplier_id: '', quantity: 0, cost_price: 0, selling_price: 0, reorder_level: 10 });
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: inv } = await supabase.from('inventory').select('*, suppliers(name)').order('part_name');
    const { data: sup } = await supabase.from('suppliers').select('*');
    setItems(inv || []);
    setSuppliers(sup || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, supplier_id: form.supplier_id || null };
    
    if (editingItem) {
      const { error } = await supabase.from('inventory').update(payload).eq('id', editingItem.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Updated', description: 'Item updated successfully' });
    } else {
      const { error } = await supabase.from('inventory').insert(payload);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Added', description: 'Item added successfully' });
    }
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Deleted', description: 'Item deleted' });
    fetchData();
  };

  const resetForm = () => { setForm({ part_name: '', part_number: '', category: '', supplier_id: '', quantity: 0, cost_price: 0, selling_price: 0, reorder_level: 10 }); setEditingItem(null); };

  const openEdit = (item: any) => { setEditingItem(item); setForm({ ...item, supplier_id: item.supplier_id || '' }); setDialogOpen(true); };

  const filtered = items.filter(i => i.part_name.toLowerCase().includes(search.toLowerCase()) || i.part_number.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold gradient-text">Inventory</h1>
          <p className="text-muted-foreground">Manage your auto parts stock</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Item</Button></DialogTrigger>
          <DialogContent className="glass max-w-lg">
            <DialogHeader><DialogTitle className="font-display">{editingItem ? 'Edit' : 'Add'} Item</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Part Name</Label><Input value={form.part_name} onChange={e => setForm({...form, part_name: e.target.value})} required /></div>
                <div><Label>Part Number</Label><Input value={form.part_number} onChange={e => setForm({...form, part_number: e.target.value})} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Category</Label><Select value={form.category} onValueChange={v => setForm({...form, category: v})}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Supplier</Label><Select value={form.supplier_id} onValueChange={v => setForm({...form, supplier_id: v})}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: +e.target.value})} /></div>
                <div><Label>Cost</Label><Input type="number" step="0.01" value={form.cost_price} onChange={e => setForm({...form, cost_price: +e.target.value})} /></div>
                <div><Label>Price</Label><Input type="number" step="0.01" value={form.selling_price} onChange={e => setForm({...form, selling_price: +e.target.value})} /></div>
                <div><Label>Reorder</Label><Input type="number" value={form.reorder_level} onChange={e => setForm({...form, reorder_level: +e.target.value})} /></div>
              </div>
              <Button type="submit" className="w-full">{editingItem ? 'Update' : 'Add'} Item</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 max-w-sm" /></div>

      <Card className="glass">
        <CardContent className="p-0">
          <table className="w-full">
            <thead><tr className="border-b border-border/50"><th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Part</th><th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Category</th><th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Stock</th><th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Price</th><th className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">Actions</th></tr></thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-border/30 hover:bg-muted/30">
                  <td className="px-4 py-3"><div><p className="font-medium">{item.part_name}</p><p className="text-sm text-muted-foreground">{item.part_number}</p></div></td>
                  <td className="px-4 py-3"><Badge variant="secondary">{item.category}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={item.quantity <= item.reorder_level ? 'destructive' : 'default'}>{item.quantity}</Badge></td>
                  <td className="px-4 py-3 font-display">${Number(item.selling_price).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right"><Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center py-8 text-muted-foreground">No items found</p>}
        </CardContent>
      </Card>
    </div>
  );
}
