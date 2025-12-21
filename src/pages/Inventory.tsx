import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, Package, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';

interface Category { id: string; name: string; }
interface Supplier { id: string; name: string; }

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({
    part_name: '', part_number: '', category: '', category_id: '', supplier_id: '',
    quantity: 0, cost_price: 0, selling_price: 0, reorder_level: 10
  });
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [invRes, supRes, catRes] = await Promise.all([
      supabase.from('inventory').select('*, suppliers(name), categories(name)').order('part_name'),
      supabase.from('suppliers').select('id, name').order('name'),
      supabase.from('categories').select('id, name').order('name')
    ]);
    setItems(invRes.data || []);
    setSuppliers(supRes.data || []);
    setCategories(catRes.data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.part_name || !form.part_number) {
      toast({ title: 'Required fields missing', description: 'Part name and number are required', variant: 'destructive' });
      return;
    }

    const selectedCategory = categories.find(c => c.id === form.category_id);
    const payload = {
      part_name: form.part_name,
      part_number: form.part_number,
      category: selectedCategory?.name || form.category || 'Uncategorized',
      category_id: form.category_id || null,
      supplier_id: form.supplier_id || null,
      quantity: form.quantity,
      cost_price: form.cost_price,
      selling_price: form.selling_price,
      reorder_level: form.reorder_level
    };

    if (editingItem) {
      const { error } = await supabase.from('inventory').update(payload).eq('id', editingItem.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Updated', description: 'Item updated successfully' });
    } else {
      const { error } = await supabase.from('inventory').insert(payload);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Added', description: 'Item added to inventory' });
    }
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Deleted', description: 'Item removed from inventory' });
    fetchData();
  };

  const resetForm = () => {
    setForm({ part_name: '', part_number: '', category: '', category_id: '', supplier_id: '', quantity: 0, cost_price: 0, selling_price: 0, reorder_level: 10 });
    setEditingItem(null);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      part_name: item.part_name,
      part_number: item.part_number,
      category: item.category,
      category_id: item.category_id || '',
      supplier_id: item.supplier_id || '',
      quantity: item.quantity,
      cost_price: item.cost_price,
      selling_price: item.selling_price,
      reorder_level: item.reorder_level
    });
    setDialogOpen(true);
  };

  const filtered = items.filter(i => {
    const matchesSearch = i.part_name.toLowerCase().includes(search.toLowerCase()) || i.part_number.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === 'all' || i.category_id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = items.filter(i => i.quantity <= i.reorder_level).length;
  const totalValue = items.reduce((sum, i) => sum + (i.quantity * Number(i.cost_price)), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold gradient-text">Inventory</h1>
          <p className="text-muted-foreground">Manage your auto parts stock</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button className="glow"><Plus className="h-4 w-4 mr-2" />Add Item</Button></DialogTrigger>
          <DialogContent className="glass max-w-2xl">
            <DialogHeader><DialogTitle className="font-display">{editingItem ? 'Edit' : 'Add'} Inventory Item</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Part Name *</Label><Input value={form.part_name} onChange={e => setForm({...form, part_name: e.target.value})} placeholder="e.g., Brake Pad Set" required /></div>
                <div><Label>Part Number *</Label><Input value={form.part_number} onChange={e => setForm({...form, part_number: e.target.value})} placeholder="e.g., BP-2024-001" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={form.category_id} onValueChange={v => setForm({...form, category_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Supplier</Label>
                  <Select value={form.supplier_id} onValueChange={v => setForm({...form, supplier_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div><Label>Quantity</Label><Input type="number" min="0" value={form.quantity} onChange={e => setForm({...form, quantity: +e.target.value})} /></div>
                <div><Label>Cost Price ($)</Label><Input type="number" step="0.01" min="0" value={form.cost_price} onChange={e => setForm({...form, cost_price: +e.target.value})} /></div>
                <div><Label>Selling Price ($)</Label><Input type="number" step="0.01" min="0" value={form.selling_price} onChange={e => setForm({...form, selling_price: +e.target.value})} /></div>
                <div><Label>Reorder Level</Label><Input type="number" min="0" value={form.reorder_level} onChange={e => setForm({...form, reorder_level: +e.target.value})} /></div>
              </div>
              <Button type="submit" className="w-full">{editingItem ? 'Update' : 'Add'} Item</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-display font-bold">{items.length}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-warning/20 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-display font-bold">{lowStockCount}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-success/20 flex items-center justify-center">
                <span className="text-success font-bold text-lg">$</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inventory Value</p>
                <p className="text-2xl font-display font-bold">${totalValue.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or part number..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="glass">
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Part</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Supplier</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Stock</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Cost</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Price</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{item.part_name}</p>
                      <p className="text-sm text-muted-foreground">{item.part_number}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge variant="secondary">{item.categories?.name || item.category}</Badge></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{item.suppliers?.name || '-'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={item.quantity <= item.reorder_level ? 'destructive' : 'default'}>
                      {item.quantity} {item.quantity <= item.reorder_level && '⚠️'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">${Number(item.cost_price).toFixed(2)}</td>
                  <td className="px-4 py-3 font-display font-semibold text-primary">${Number(item.selling_price).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </td>
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
