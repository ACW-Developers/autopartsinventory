import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Package, Truck, CheckCircle, Clock, AlertCircle, PackageCheck, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Supplier { id: string; name: string; }
interface InventoryItem { id: string; part_name: string; part_number: string; category: string; }
interface PurchaseOrder {
  id: string;
  order_number: string;
  status: 'pending' | 'partial' | 'complete' | 'cancelled';
  total_amount: number;
  notes: string | null;
  created_at: string;
  suppliers: Supplier | null;
}
interface OrderItem {
  id: string;
  part_name: string;
  part_number: string | null;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  inventory_id: string | null;
}

export default function Purchases() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [form, setForm] = useState({ 
    supplier_id: '', 
    notes: '', 
    items: [{ inventory_id: '', part_name: '', part_number: '', quantity: '', unit_cost: '' }] 
  });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => { 
    fetchOrders(); 
    fetchSuppliers(); 
    fetchInventory();
  }, []);

  const fetchOrders = async () => {
    const { data } = await supabase.from('purchase_orders').select('*, suppliers(id, name)').order('created_at', { ascending: false });
    setOrders((data || []) as PurchaseOrder[]);
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('id, name').order('name');
    setSuppliers(data || []);
  };

  const fetchInventory = async () => {
    const { data } = await supabase.from('inventory').select('id, part_name, part_number, category').order('part_name');
    setInventoryItems(data || []);
  };

  const generateOrderNumber = () => `PO-${Date.now().toString(36).toUpperCase()}`;

  const handleProductSelect = (index: number, inventoryId: string) => {
    const product = inventoryItems.find(p => p.id === inventoryId);
    if (product) {
      const newItems = [...form.items];
      newItems[index] = { 
        ...newItems[index], 
        inventory_id: inventoryId,
        part_name: product.part_name, 
        part_number: product.part_number 
      };
      setForm({ ...form, items: newItems });
    }
  };

  const handleCreateOrder = async () => {
    if (!form.supplier_id) { toast({ title: 'Select a supplier', variant: 'destructive' }); return; }
    const validItems = form.items.filter(i => i.part_name && Number(i.quantity) > 0);
    if (validItems.length === 0) { toast({ title: 'Add at least one item', variant: 'destructive' }); return; }

    const totalAmount = validItems.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unit_cost || 0)), 0);
    const orderNumber = generateOrderNumber();

    const { data: order, error } = await supabase.from('purchase_orders').insert([{
      order_number: orderNumber,
      supplier_id: form.supplier_id,
      total_amount: totalAmount,
      notes: form.notes || null,
      ordered_by: user?.id,
    }]).select().single();

    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }

    const itemsToInsert = validItems.map(i => ({
      purchase_order_id: order.id,
      inventory_id: i.inventory_id || null,
      part_name: i.part_name,
      part_number: i.part_number || null,
      quantity_ordered: Number(i.quantity),
      unit_cost: Number(i.unit_cost || 0),
    }));

    await supabase.from('purchase_order_items').insert(itemsToInsert);

    toast({ title: 'Purchase Order Created', description: `Order ${orderNumber} created successfully` });
    setDialogOpen(false);
    setForm({ supplier_id: '', notes: '', items: [{ inventory_id: '', part_name: '', part_number: '', quantity: '', unit_cost: '' }] });
    fetchOrders();
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { inventory_id: '', part_name: '', part_number: '', quantity: '', unit_cost: '' }] });
  
  const removeItem = (index: number) => {
    if (form.items.length > 1) {
      const newItems = form.items.filter((_, i) => i !== index);
      setForm({ ...form, items: newItems });
    }
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setForm({ ...form, items: newItems });
  };

  const openReceiveDialog = async (order: PurchaseOrder) => {
    setSelectedOrder(order);
    const { data } = await supabase.from('purchase_order_items').select('*').eq('purchase_order_id', order.id);
    setOrderItems(data || []);
    setReceiveDialogOpen(true);
  };

  const handleReceive = async (itemId: string, qty: number) => {
    if (!selectedOrder || !user) return;
    const item = orderItems.find(i => i.id === itemId);
    if (!item) return;

    const newReceived = item.quantity_received + qty;
    if (newReceived > item.quantity_ordered) { toast({ title: 'Cannot exceed ordered quantity', variant: 'destructive' }); return; }

    await supabase.from('purchase_order_items').update({ quantity_received: newReceived }).eq('id', itemId);
    await supabase.from('purchase_receipts').insert([{ purchase_order_id: selectedOrder.id, purchase_order_item_id: itemId, quantity_received: qty, received_by: user.id }]);

    // Update inventory
    if (item.inventory_id) {
      const { data: invItem } = await supabase.from('inventory').select('id, quantity').eq('id', item.inventory_id).single();
      if (invItem) {
        await supabase.from('inventory').update({ quantity: invItem.quantity + qty }).eq('id', invItem.id);
      }
    } else if (item.part_number) {
      const { data: invItem } = await supabase.from('inventory').select('id, quantity').eq('part_number', item.part_number).single();
      if (invItem) {
        await supabase.from('inventory').update({ quantity: invItem.quantity + qty }).eq('id', invItem.id);
      }
    }

    // Check order status
    const { data: allItems } = await supabase.from('purchase_order_items').select('*').eq('purchase_order_id', selectedOrder.id);
    const totalOrdered = allItems?.reduce((s, i) => s + i.quantity_ordered, 0) || 0;
    const totalReceived = (allItems?.reduce((s, i) => s + i.quantity_received, 0) || 0) + qty;

    let newStatus: 'pending' | 'partial' | 'complete' = 'pending';
    if (totalReceived >= totalOrdered) newStatus = 'complete';
    else if (totalReceived > 0) newStatus = 'partial';

    await supabase.from('purchase_orders').update({ status: newStatus }).eq('id', selectedOrder.id);

    toast({ title: 'Items Received', description: `${qty} items marked as received` });
    openReceiveDialog(selectedOrder);
    fetchOrders();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'partial': return <Clock className="h-4 w-4 text-warning" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'complete': return 'default';
      case 'partial': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const filtered = orders.filter(o => o.order_number.toLowerCase().includes(search.toLowerCase()) || o.suppliers?.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold gradient-text">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage supplier orders and inventory receiving</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="glow"><Plus className="mr-2 h-4 w-4" />New Purchase Order</Button>
          </DialogTrigger>
          <DialogContent className="glass max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Create Purchase Order</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <Select value={form.supplier_id} onValueChange={v => setForm({ ...form, supplier_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select Supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Order Items</p>
                  <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Add Item</Button>
                </div>
                {form.items.map((item, i) => (
                  <div key={i} className="p-4 rounded-lg bg-muted/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Item #{i + 1}</span>
                      {form.items.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(i)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Select value={item.inventory_id} onValueChange={v => handleProductSelect(i, v)}>
                        <SelectTrigger><SelectValue placeholder="Select from inventory (optional)" /></SelectTrigger>
                        <SelectContent>
                          {inventoryItems.map(inv => (
                            <SelectItem key={inv.id} value={inv.id}>
                              {inv.part_name} ({inv.part_number}) - {inv.category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input placeholder="Or enter part name manually" value={item.part_name} onChange={e => updateItem(i, 'part_name', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <Input placeholder="Part Number" value={item.part_number} onChange={e => updateItem(i, 'part_number', e.target.value)} />
                      <Input type="number" placeholder="Quantity *" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                      <Input type="number" step="0.01" placeholder="Unit Cost ($)" value={item.unit_cost} onChange={e => updateItem(i, 'unit_cost', e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>

              <Textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              
              <div className="flex justify-between items-center p-4 rounded-lg bg-primary/10">
                <span className="font-medium">Total Amount:</span>
                <span className="font-display text-xl font-bold text-primary">
                  ${form.items.reduce((sum, i) => sum + (Number(i.quantity || 0) * Number(i.unit_cost || 0)), 0).toFixed(2)}
                </span>
              </div>
              
              <Button className="w-full" onClick={handleCreateOrder}>Create Order</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Input placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />

      <div className="grid gap-4">
        {filtered.map((order, i) => (
          <motion.div key={order.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold">{order.order_number}</h3>
                        <Badge variant={getStatusVariant(order.status)} className="flex items-center gap-1">
                          {getStatusIcon(order.status)}
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Truck className="h-3 w-3" />
                        {order.suppliers?.name || 'Unknown Supplier'}
                        <span>•</span>
                        <span>{new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-display text-xl font-bold text-primary">${order.total_amount.toFixed(2)}</p>
                    <Button variant="outline" size="sm" onClick={() => openReceiveDialog(order)}>
                      <PackageCheck className="h-4 w-4 mr-1" />Receive
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Receive Dialog */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent className="glass max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Receive Items - {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {orderItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium">{item.part_name}</p>
                  {item.part_number && <p className="text-sm text-muted-foreground">{item.part_number}</p>}
                  <p className="text-sm">Ordered: {item.quantity_ordered} | Received: {item.quantity_received}</p>
                </div>
                <div className="flex items-center gap-2">
                  {item.quantity_received < item.quantity_ordered ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleReceive(item.id, 1)}>+1</Button>
                      <Button size="sm" onClick={() => handleReceive(item.id, item.quantity_ordered - item.quantity_received)}>
                        Receive All ({item.quantity_ordered - item.quantity_received})
                      </Button>
                    </>
                  ) : (
                    <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Complete</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {filtered.length === 0 && (
        <Card className="glass">
          <CardContent className="py-12 text-center text-muted-foreground">
            No purchase orders found. Create your first order to get started.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
