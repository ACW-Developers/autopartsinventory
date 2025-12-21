import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CartItem { inventory: any; quantity: number; }

export default function POS() {
  const [items, setItems] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    const { data } = await supabase.from('inventory').select('*').gt('quantity', 0).order('part_name');
    setItems(data || []);
  };

  const addToCart = (item: any) => {
    const existing = cart.find(c => c.inventory.id === item.id);
    if (existing) {
      if (existing.quantity >= item.quantity) { toast({ title: 'Insufficient stock', variant: 'destructive' }); return; }
      setCart(cart.map(c => c.inventory.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { inventory: item, quantity: 1 }]);
    }
  };

  const updateQty = (id: string, delta: number) => {
    setCart(cart.map(c => {
      if (c.inventory.id !== id) return c;
      const newQty = c.quantity + delta;
      if (newQty <= 0) return c;
      if (newQty > c.inventory.quantity) { toast({ title: 'Insufficient stock', variant: 'destructive' }); return c; }
      return { ...c, quantity: newQty };
    }));
  };

  const removeFromCart = (id: string) => setCart(cart.filter(c => c.inventory.id !== id));

  const total = cart.reduce((sum, c) => sum + (c.quantity * Number(c.inventory.selling_price)), 0);

  const completeSale = async () => {
    if (!user || cart.length === 0) return;
    setLoading(true);
    
    for (const item of cart) {
      const { error: saleError } = await supabase.from('pos_sales').insert({
        inventory_id: item.inventory.id,
        quantity_sold: item.quantity,
        unit_price: item.inventory.selling_price,
        total_price: item.quantity * Number(item.inventory.selling_price),
        sold_by: user.id
      });
      if (saleError) { toast({ title: 'Error', description: saleError.message, variant: 'destructive' }); setLoading(false); return; }

      await supabase.from('inventory').update({ quantity: item.inventory.quantity - item.quantity }).eq('id', item.inventory.id);
    }
    
    toast({ title: 'Sale Complete', description: `Total: $${total.toFixed(2)}` });
    setCart([]);
    fetchItems();
    setLoading(false);
  };

  const filtered = items.filter(i => i.part_name.toLowerCase().includes(search.toLowerCase()) || i.part_number.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl font-bold gradient-text">Point of Sale</h1><p className="text-muted-foreground">Process customer transactions</p></div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Input placeholder="Search parts..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-auto">
            {filtered.map(item => (
              <Card key={item.id} className="glass cursor-pointer hover:shadow-lg transition-all" onClick={() => addToCart(item)}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div><p className="font-medium">{item.part_name}</p><p className="text-sm text-muted-foreground">{item.part_number}</p></div>
                    <Badge variant={item.quantity <= item.reorder_level ? 'destructive' : 'secondary'}>{item.quantity} in stock</Badge>
                  </div>
                  <p className="font-display font-bold text-primary mt-2">${Number(item.selling_price).toFixed(2)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="glass h-fit">
          <CardHeader><CardTitle className="font-display flex items-center gap-2"><ShoppingCart className="h-5 w-5" />Cart</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? <p className="text-muted-foreground text-center py-4">Cart is empty</p> : (
              <>
                {cart.map(c => (
                  <div key={c.inventory.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex-1"><p className="font-medium text-sm">{c.inventory.part_name}</p><p className="text-xs text-muted-foreground">${Number(c.inventory.selling_price).toFixed(2)} each</p></div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(c.inventory.id, -1)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-8 text-center font-medium">{c.quantity}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(c.inventory.id, 1)}><Plus className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFromCart(c.inventory.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between items-center mb-4"><span className="text-muted-foreground">Total</span><span className="font-display text-2xl font-bold text-primary">${total.toFixed(2)}</span></div>
                  <Button className="w-full" size="lg" onClick={completeSale} disabled={loading}>{loading ? 'Processing...' : 'Complete Sale'}</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
