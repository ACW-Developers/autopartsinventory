import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Plus, Minus, Trash2, User, Tag, Printer, X, Search, Scan, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { generateReceiptPDF } from '@/utils/pdfGenerator';

interface CartItem { inventory: any; quantity: number; }
interface Customer { id: string; name: string; phone: string | null; email: string | null; }
interface Discount { id: string; code: string; discount_type: string; discount_value: number; min_purchase: number | null; used_count: number; max_uses: number | null; valid_until: string | null; }

export default function POS() {
  const [items, setItems] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [businessName, setBusinessName] = useState('AutoParts AZ');
  const [showScanner, setShowScanner] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => { 
    fetchItems(); 
    fetchCustomers();
    fetchBusinessName();
  }, []);

  const fetchItems = async () => {
    const { data } = await supabase.from('inventory').select('*, categories(name)').gt('quantity', 0).order('part_name');
    setItems(data || []);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, name, phone, email').order('name');
    setCustomers(data || []);
  };

  const fetchBusinessName = async () => {
    const { data } = await supabase.from('settings').select('value').eq('key', 'business_name').single();
    if (data?.value) setBusinessName(data.value);
  };

  const handleBarcodeScan = (code: string) => {
    const item = items.find(i => i.part_number.toLowerCase() === code.toLowerCase());
    if (item) {
      addToCart(item);
      toast({ title: 'Item added', description: `${item.part_name} added to cart` });
    } else {
      toast({ title: 'Not found', description: `No item with barcode: ${code}`, variant: 'destructive' });
    }
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

  const subtotal = cart.reduce((sum, c) => sum + (c.quantity * Number(c.inventory.selling_price)), 0);

  const applyDiscount = async () => {
    if (!discountCode.trim()) return;
    
    const { data } = await supabase
      .from('discounts')
      .select('*')
      .eq('code', discountCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (!data) {
      toast({ title: 'Invalid discount code', variant: 'destructive' });
      return;
    }

    if (data.valid_until && new Date(data.valid_until) < new Date()) {
      toast({ title: 'Discount code expired', variant: 'destructive' });
      return;
    }

    if (data.max_uses && data.used_count >= data.max_uses) {
      toast({ title: 'Discount code fully redeemed', variant: 'destructive' });
      return;
    }

    if (data.min_purchase && subtotal < Number(data.min_purchase)) {
      toast({ title: `Minimum purchase of $${data.min_purchase} required`, variant: 'destructive' });
      return;
    }

    setAppliedDiscount(data as Discount);
    toast({ title: 'Discount applied!' });
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
  };

  const calculateDiscount = () => {
    if (!appliedDiscount) return 0;
    if (appliedDiscount.discount_type === 'percentage') {
      return subtotal * (appliedDiscount.discount_value / 100);
    }
    return Math.min(appliedDiscount.discount_value, subtotal);
  };

  const discountAmount = calculateDiscount();
  const total = subtotal - discountAmount;

  const generateReceiptNumber = () => `RCP-${Date.now().toString(36).toUpperCase()}`;

  const completeSale = async () => {
    if (!user || cart.length === 0) return;
    setLoading(true);
    
    const receiptNumber = generateReceiptNumber();
    const customerName = selectedCustomer?.name || manualCustomerName || 'Walk-in Customer';
    
    for (const item of cart) {
      const itemTotal = item.quantity * Number(item.inventory.selling_price);
      const itemDiscount = appliedDiscount ? (discountAmount / subtotal) * itemTotal : 0;
      
      const { error: saleError } = await supabase.from('pos_sales').insert({
        inventory_id: item.inventory.id,
        quantity_sold: item.quantity,
        unit_price: item.inventory.selling_price,
        total_price: itemTotal - itemDiscount,
        sold_by: user.id,
        customer_id: selectedCustomer?.id || null,
        discount_id: appliedDiscount?.id || null,
        discount_amount: itemDiscount,
        receipt_number: receiptNumber
      });
      
      if (saleError) { 
        toast({ title: 'Error', description: saleError.message, variant: 'destructive' }); 
        setLoading(false); 
        return; 
      }

      await supabase.from('inventory').update({ quantity: item.inventory.quantity - item.quantity }).eq('id', item.inventory.id);
    }

    // Update discount usage
    if (appliedDiscount) {
      await supabase.from('discounts').update({ used_count: appliedDiscount.used_count + 1 }).eq('id', appliedDiscount.id);
    }
    
    // Prepare receipt data
    setReceiptData({
      receiptNumber,
      date: new Date().toLocaleString(),
      customerName,
      items: cart.map(c => ({
        name: c.inventory.part_name,
        partNumber: c.inventory.part_number,
        quantity: c.quantity,
        price: Number(c.inventory.selling_price),
        total: c.quantity * Number(c.inventory.selling_price)
      })),
      subtotal,
      discount: discountAmount,
      discountCode: appliedDiscount?.code,
      total,
      cashier: user.email
    });
    
    setShowReceipt(true);
    toast({ title: 'Sale Complete', description: `Receipt: ${receiptNumber}` });
    
    // Reset
    setCart([]);
    setAppliedDiscount(null);
    setDiscountCode('');
    setSelectedCustomer(null);
    setManualCustomerName('');
    fetchItems();
    setLoading(false);
  };

  const printReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && receiptRef.current) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt - ${receiptData?.receiptNumber}</title>
            <style>
              body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
              .header h1 { font-size: 18px; margin: 0; }
              .header p { margin: 5px 0; font-size: 12px; }
              .item { display: flex; justify-content: space-between; font-size: 12px; margin: 5px 0; }
              .divider { border-top: 1px dashed #000; margin: 10px 0; }
              .total { font-weight: bold; font-size: 14px; }
              .footer { text-align: center; margin-top: 20px; font-size: 11px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${businessName}</h1>
              <p>Receipt: ${receiptData?.receiptNumber}</p>
              <p>${receiptData?.date}</p>
              <p>Customer: ${receiptData?.customerName}</p>
            </div>
            ${receiptData?.items.map((item: any) => `
              <div class="item">
                <span>${item.name} x${item.quantity}</span>
                <span>$${item.total.toFixed(2)}</span>
              </div>
            `).join('')}
            <div class="divider"></div>
            <div class="item">
              <span>Subtotal:</span>
              <span>$${receiptData?.subtotal.toFixed(2)}</span>
            </div>
            ${receiptData?.discount > 0 ? `
              <div class="item" style="color: green;">
                <span>Discount (${receiptData?.discountCode}):</span>
                <span>-$${receiptData?.discount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="item total">
              <span>TOTAL:</span>
              <span>$${receiptData?.total.toFixed(2)}</span>
            </div>
            <div class="divider"></div>
            <div class="footer">
              <p>Cashier: ${receiptData?.cashier}</p>
              <p>Thank you for your business!</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const filtered = items.filter(i => 
    i.part_name.toLowerCase().includes(search.toLowerCase()) || 
    i.part_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold gradient-text">Point of Sale</h1>
        <p className="text-muted-foreground">Process customer transactions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or part number..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Button variant="outline" onClick={() => setShowScanner(true)} className="shrink-0">
              <Scan className="h-4 w-4 mr-2" />
              Scan Barcode
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[65vh] overflow-auto pr-2">
            {filtered.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}>
                <Card className="glass cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all" onClick={() => addToCart(item)}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.part_name}</p>
                        <p className="text-sm text-muted-foreground">{item.part_number}</p>
                      </div>
                      <Badge variant={item.quantity <= item.reorder_level ? 'destructive' : 'secondary'} className="ml-2 shrink-0">
                        {item.quantity}
                      </Badge>
                    </div>
                    {item.categories?.name && (
                      <Badge variant="outline" className="text-xs mb-2">{item.categories.name}</Badge>
                    )}
                    <p className="font-display font-bold text-primary text-lg">${Number(item.selling_price).toFixed(2)}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Cart */}
        <Card className="glass h-fit sticky top-4">
          <CardHeader className="pb-3">
            <CardTitle className="font-display flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />Cart
              {cart.length > 0 && <Badge variant="secondary">{cart.reduce((s, c) => s + c.quantity, 0)}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4" />Customer</label>
              <Select value={selectedCustomer?.id || ''} onValueChange={id => setSelectedCustomer(customers.find(c => c.id === id) || null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.phone && `(${c.phone})`}</SelectItem>)}
                </SelectContent>
              </Select>
              {!selectedCustomer && (
                <Input 
                  placeholder="Or enter customer name..." 
                  value={manualCustomerName} 
                  onChange={e => setManualCustomerName(e.target.value)} 
                />
              )}
            </div>

            <Separator />

            {/* Cart Items */}
            {cart.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">Cart is empty</p>
            ) : (
              <>
                <div className="space-y-2 max-h-[200px] overflow-auto">
                  {cart.map(c => (
                    <div key={c.inventory.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{c.inventory.part_name}</p>
                        <p className="text-xs text-muted-foreground">${Number(c.inventory.selling_price).toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(c.inventory.id, -1)}><Minus className="h-3 w-3" /></Button>
                        <span className="w-8 text-center font-medium text-sm">{c.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(c.inventory.id, 1)}><Plus className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFromCart(c.inventory.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Discount Code */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2"><Tag className="h-4 w-4" />Discount Code</label>
                  {appliedDiscount ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-success/10 border border-success/20">
                      <span className="text-sm text-success font-medium">{appliedDiscount.code} applied!</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={removeDiscount}><X className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input placeholder="Enter code" value={discountCode} onChange={e => setDiscountCode(e.target.value.toUpperCase())} className="flex-1" />
                      <Button variant="outline" size="sm" onClick={applyDiscount}>Apply</Button>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>Discount</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="font-medium">Total</span>
                    <span className="font-display text-2xl font-bold text-primary">${total.toFixed(2)}</span>
                  </div>
                </div>

                <Button className="w-full glow" size="lg" onClick={completeSale} disabled={loading}>
                  {loading ? 'Processing...' : 'Complete Sale'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="glass max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Printer className="h-5 w-5" />Receipt
            </DialogTitle>
          </DialogHeader>
          <div ref={receiptRef} className="space-y-4 p-4 bg-background rounded-lg border">
            <div className="text-center border-b border-dashed pb-4">
              <h2 className="font-display font-bold text-lg">{businessName}</h2>
              <p className="text-sm text-muted-foreground">Receipt: {receiptData?.receiptNumber}</p>
              <p className="text-sm text-muted-foreground">{receiptData?.date}</p>
              <p className="text-sm">Customer: {receiptData?.customerName}</p>
            </div>
            
            <div className="space-y-2">
              {receiptData?.items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{item.name} x{item.quantity}</span>
                  <span>${item.total.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <Separator className="border-dashed" />

            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>${receiptData?.subtotal.toFixed(2)}</span>
              </div>
              {receiptData?.discount > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Discount ({receiptData?.discountCode}):</span>
                  <span>-${receiptData?.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-2 border-t">
                <span>TOTAL:</span>
                <span>${receiptData?.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground pt-4 border-t border-dashed">
              <p>Cashier: {receiptData?.cashier}</p>
              <p className="mt-2">Thank you for your business!</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={printReceipt}><Printer className="h-4 w-4 mr-2" />Print</Button>
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => {
                const pdf = generateReceiptPDF({ ...receiptData, businessName });
                pdf.save(`receipt-${receiptData?.receiptNumber}.pdf`);
              }}
            >
              <FileText className="h-4 w-4 mr-2" />Save PDF
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowReceipt(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Dialog */}
      <BarcodeScanner 
        open={showScanner} 
        onClose={() => setShowScanner(false)} 
        onScan={handleBarcodeScan} 
      />
    </div>
  );
}
