import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Percent, DollarSign, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';

interface Discount {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase: number | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
}

const defaultForm = { code: '', description: '', discount_type: 'percentage' as 'percentage' | 'fixed', discount_value: '', min_purchase: '', max_uses: '', is_active: true };

export default function Discounts() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [form, setForm] = useState(defaultForm);
  const { toast } = useToast();

  useEffect(() => { fetchDiscounts(); }, []);

  const fetchDiscounts = async () => {
    const { data } = await supabase.from('discounts').select('*').order('created_at', { ascending: false });
    setDiscounts((data || []) as Discount[]);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { toast({ title: 'Code is required', variant: 'destructive' }); return; }
    if (!form.discount_value || Number(form.discount_value) <= 0) { toast({ title: 'Valid discount value required', variant: 'destructive' }); return; }

    const payload = {
      code: form.code.toUpperCase(),
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_purchase: form.min_purchase ? Number(form.min_purchase) : null,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      is_active: form.is_active,
    };

    if (editing) {
      const { error } = await supabase.from('discounts').update(payload).eq('id', editing.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Discount Updated' });
    } else {
      const { error } = await supabase.from('discounts').insert([payload]);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Discount Created' });
    }

    setDialogOpen(false);
    setEditing(null);
    setForm(defaultForm);
    fetchDiscounts();
  };

  const handleEdit = (d: Discount) => {
    setEditing(d);
    setForm({
      code: d.code,
      description: d.description || '',
      discount_type: d.discount_type,
      discount_value: String(d.discount_value),
      min_purchase: d.min_purchase ? String(d.min_purchase) : '',
      max_uses: d.max_uses ? String(d.max_uses) : '',
      is_active: d.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('discounts').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Discount Deleted' });
    fetchDiscounts();
  };

  const toggleActive = async (d: Discount) => {
    await supabase.from('discounts').update({ is_active: !d.is_active }).eq('id', d.id);
    fetchDiscounts();
  };

  const filtered = discounts.filter(d => d.code.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold gradient-text">Discounts & Coupons</h1>
          <p className="text-muted-foreground">Create and manage discount codes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditing(null); setForm(defaultForm); } }}>
          <DialogTrigger asChild>
            <Button className="glow"><Plus className="mr-2 h-4 w-4" />Create Discount</Button>
          </DialogTrigger>
          <DialogContent className="glass">
            <DialogHeader><DialogTitle className="font-display">{editing ? 'Edit Discount' : 'Create Discount'}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <Input placeholder="Coupon Code *" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
              <Input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Discount Type</Label>
                  <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v as 'percentage' | 'fixed' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Discount Value *</Label>
                  <Input type="number" placeholder={form.discount_type === 'percentage' ? '10' : '5.00'} value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input type="number" placeholder="Min Purchase ($)" value={form.min_purchase} onChange={e => setForm({ ...form, min_purchase: e.target.value })} />
                <Input type="number" placeholder="Max Uses" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              </div>
              <Button className="w-full" onClick={handleSave}>{editing ? 'Update' : 'Create'} Discount</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Input placeholder="Search discounts..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((d, i) => (
          <motion.div key={d.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                      <Ticket className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg">{d.code}</h3>
                      {d.description && <p className="text-sm text-muted-foreground">{d.description}</p>}
                    </div>
                  </div>
                  <Badge variant={d.is_active ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => toggleActive(d)}>
                    {d.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1 text-2xl font-display font-bold text-primary">
                    {d.discount_type === 'percentage' ? <Percent className="h-5 w-5" /> : <DollarSign className="h-5 w-5" />}
                    {d.discount_value}{d.discount_type === 'percentage' ? '%' : ''} OFF
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  {d.min_purchase && <p>Min purchase: ${d.min_purchase}</p>}
                  {d.max_uses && <p>Uses: {d.used_count} / {d.max_uses}</p>}
                </div>
                <div className="flex gap-1 mt-4 justify-end">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(d)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="glass">
          <CardContent className="py-12 text-center text-muted-foreground">
            No discounts found. Create your first discount code to get started.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
