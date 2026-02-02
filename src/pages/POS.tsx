import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  ShoppingCart, Plus, Minus, Trash2, User, Tag, Printer, X, Search, Scan, FileText, 
  ChevronLeft, ChevronRight, Image as ImageIcon, CreditCard, Banknote, Wallet, 
  PauseCircle, PlayCircle, RotateCcw, Calculator, Receipt
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { generateReceiptPDF } from '@/utils/pdfGenerator';
import { Label } from '@/components/ui/label';

interface CartItem { inventory: any; quantity: number; }
interface Customer { id: string; name: string; phone: string | null; email: string | null; }
interface Discount { id: string; code: string; discount_type: string; discount_value: number; min_purchase: number | null; used_count: number; max_uses: number | null; valid_until: string | null; }
interface HeldOrder { 
  id: string; 
  cart: CartItem[]; 
  customer: Customer | null; 
  manualCustomerName: string;
  discount: Discount | null;
  timestamp: Date;
  note: string;
}

type PaymentMethod = 'cash' | 'card' | 'mobile';

const ITEMS_PER_PAGE = 10;

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
  const [currentPage, setCurrentPage] = useState(1);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const [holdNote, setHoldNote] = useState('');
  const [showHoldDialog, setShowHoldDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundReceiptNumber, setRefundReceiptNumber] = useState('');
  const receiptRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();

  useEffect(() => { 
    fetchItems(); 
    fetchCustomers();
    fetchBusinessName();
    // Load held orders from localStorage
    const savedOrders = localStorage.getItem('heldOrders');
    if (savedOrders) {
      setHeldOrders(JSON.parse(savedOrders));
    }
  }, []);

  // Save held orders to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('heldOrders', JSON.stringify(heldOrders));
  }, [heldOrders]);

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

  const formatYearRange = (from: number | null, to: number | null) => {
    if (from && to) return `${from}-${to}`;
    if (from) return `${from}+`;
    if (to) return `Up to ${to}`;
    return '';
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

  const setQuantity = (id: string, qty: number) => {
    const item = cart.find(c => c.inventory.id === id);
    if (!item) return;
    if (qty <= 0 || qty > item.inventory.quantity) {
      toast({ title: 'Invalid quantity', variant: 'destructive' });
      return;
    }
    setCart(cart.map(c => c.inventory.id === id ? { ...c, quantity: qty } : c));
  };

  const removeFromCart = (id: string) => setCart(cart.filter(c => c.inventory.id !== id));

  const clearCart = () => {
    setCart([]);
    setAppliedDiscount(null);
    setDiscountCode('');
    setSelectedCustomer(null);
    setManualCustomerName('');
  };

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
  const taxRate = 0; // Can be made configurable
  const taxAmount = (subtotal - discountAmount) * taxRate;
  const total = subtotal - discountAmount + taxAmount;

  const generateReceiptNumber = () => `RCP-${Date.now().toString(36).toUpperCase()}`;

  // Hold order functionality
  const holdOrder = () => {
    if (cart.length === 0) {
      toast({ title: 'Cart is empty', variant: 'destructive' });
      return;
    }
    setShowHoldDialog(true);
  };

  const confirmHoldOrder = () => {
    const newHeldOrder: HeldOrder = {
      id: Date.now().toString(),
      cart: [...cart],
      customer: selectedCustomer,
      manualCustomerName,
      discount: appliedDiscount,
      timestamp: new Date(),
      note: holdNote,
    };
    setHeldOrders([...heldOrders, newHeldOrder]);
    clearCart();
    setHoldNote('');
    setShowHoldDialog(false);
    toast({ title: 'Order held', description: 'You can resume it anytime' });
  };

  const resumeOrder = (order: HeldOrder) => {
    setCart(order.cart);
    setSelectedCustomer(order.customer);
    setManualCustomerName(order.manualCustomerName);
    setAppliedDiscount(order.discount);
    setHeldOrders(heldOrders.filter(o => o.id !== order.id));
    setShowHeldOrders(false);
    toast({ title: 'Order resumed' });
  };

  const removeHeldOrder = (id: string) => {
    setHeldOrders(heldOrders.filter(o => o.id !== id));
    toast({ title: 'Held order removed' });
  };

  // Payment processing
  const initiatePayment = () => {
    if (cart.length === 0) {
      toast({ title: 'Cart is empty', variant: 'destructive' });
      return;
    }
    setShowPaymentDialog(true);
    setCashReceived('');
  };

  const changeAmount = paymentMethod === 'cash' && cashReceived ? parseFloat(cashReceived) - total : 0;

  const processPayment = async () => {
    if (paymentMethod === 'cash') {
      const received = parseFloat(cashReceived);
      if (isNaN(received) || received < total) {
        toast({ title: 'Insufficient cash received', variant: 'destructive' });
        return;
      }
    }
    
    setShowPaymentDialog(false);
    await completeSale();
  };

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

    // Log activity
    await logActivity({
      action: 'Sale Completed',
      entityType: 'pos',
      entityId: receiptNumber,
      details: {
        items: cart.length,
        total,
        paymentMethod,
        customer: customerName,
      },
    });
    
    // Prepare receipt data with brand and year info
    setReceiptData({
      receiptNumber,
      date: new Date().toLocaleString(),
      customerName,
      items: cart.map(c => ({
        name: c.inventory.part_name,
        partNumber: c.inventory.part_number,
        brand: c.inventory.brand || null,
        yearRange: formatYearRange(c.inventory.car_year_from, c.inventory.car_year_to),
        quantity: c.quantity,
        price: Number(c.inventory.selling_price),
        total: c.quantity * Number(c.inventory.selling_price)
      })),
      subtotal,
      discount: discountAmount,
      discountCode: appliedDiscount?.code,
      tax: taxAmount,
      total,
      paymentMethod,
      cashReceived: paymentMethod === 'cash' ? parseFloat(cashReceived) : undefined,
      change: paymentMethod === 'cash' ? changeAmount : undefined,
      cashier: user.email
    });
    
    setShowReceipt(true);
    toast({ title: 'Sale Complete', description: `Receipt: ${receiptNumber}` });
    
    // Reset
    clearCart();
    setCashReceived('');
    fetchItems();
    setLoading(false);
  };

  // Refund functionality
  const processRefund = async () => {
    if (!refundReceiptNumber.trim()) {
      toast({ title: 'Enter receipt number', variant: 'destructive' });
      return;
    }

    const { data: sales, error } = await supabase
      .from('pos_sales')
      .select('*, inventory(part_name, part_number)')
      .eq('receipt_number', refundReceiptNumber.toUpperCase());

    if (error || !sales || sales.length === 0) {
      toast({ title: 'Receipt not found', variant: 'destructive' });
      return;
    }

    // Restore inventory
    for (const sale of sales) {
      const { data: currentInventory } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('id', sale.inventory_id)
        .single();

      if (currentInventory) {
        await supabase.from('inventory').update({ 
          quantity: currentInventory.quantity + sale.quantity_sold 
        }).eq('id', sale.inventory_id);
      }
    }

    // Delete sales records
    await supabase.from('pos_sales').delete().eq('receipt_number', refundReceiptNumber.toUpperCase());

    // Log activity
    await logActivity({
      action: 'Refund Processed',
      entityType: 'pos',
      entityId: refundReceiptNumber,
      details: { items: sales.length },
    });

    toast({ title: 'Refund processed', description: 'Inventory restored' });
    setShowRefundDialog(false);
    setRefundReceiptNumber('');
    fetchItems();
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
              .item { font-size: 12px; margin: 8px 0; border-bottom: 1px dotted #ccc; padding-bottom: 8px; }
              .item-name { font-weight: bold; }
              .item-details { color: #666; font-size: 10px; margin: 2px 0; }
              .item-price { display: flex; justify-content: space-between; margin-top: 4px; }
              .divider { border-top: 1px dashed #000; margin: 10px 0; }
              .total-line { display: flex; justify-content: space-between; font-size: 12px; margin: 5px 0; }
              .total { font-weight: bold; font-size: 14px; }
              .footer { text-align: center; margin-top: 20px; font-size: 11px; }
              .payment-info { background: #f5f5f5; padding: 8px; margin: 10px 0; font-size: 12px; }
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
                <div class="item-name">${item.name}</div>
                <div class="item-details">
                  ${item.partNumber}
                  ${item.brand ? ` | ${item.brand}` : ''}
                  ${item.yearRange ? ` | ${item.yearRange}` : ''}
                </div>
                <div class="item-price">
                  <span>${item.quantity} x $${item.price.toFixed(2)}</span>
                  <span>$${item.total.toFixed(2)}</span>
                </div>
              </div>
            `).join('')}
            <div class="divider"></div>
            <div class="total-line">
              <span>Subtotal:</span>
              <span>$${receiptData?.subtotal.toFixed(2)}</span>
            </div>
            ${receiptData?.discount > 0 ? `
              <div class="total-line" style="color: green;">
                <span>Discount (${receiptData?.discountCode}):</span>
                <span>-$${receiptData?.discount.toFixed(2)}</span>
              </div>
            ` : ''}
            ${receiptData?.tax > 0 ? `
              <div class="total-line">
                <span>Tax:</span>
                <span>$${receiptData?.tax.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-line total">
              <span>TOTAL:</span>
              <span>$${receiptData?.total.toFixed(2)}</span>
            </div>
            <div class="payment-info">
              <p><strong>Payment:</strong> ${receiptData?.paymentMethod?.toUpperCase()}</p>
              ${receiptData?.cashReceived ? `<p>Cash Received: $${receiptData.cashReceived.toFixed(2)}</p>` : ''}
              ${receiptData?.change !== undefined && receiptData.change > 0 ? `<p>Change: $${receiptData.change.toFixed(2)}</p>` : ''}
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

  const handleDownloadPDF = () => {
    if (!receiptData) return;
    const doc = generateReceiptPDF({ ...receiptData, businessName });
    doc.save(`receipt-${receiptData.receiptNumber}.pdf`);
  };

  const filtered = items.filter(i => 
    i.part_name.toLowerCase().includes(search.toLowerCase()) || 
    i.part_number.toLowerCase().includes(search.toLowerCase()) ||
    (i.brand && i.brand.toLowerCase().includes(search.toLowerCase()))
  );

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedItems = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Quick cash amounts
  const quickCashAmounts = [
    Math.ceil(total),
    Math.ceil(total / 5) * 5,
    Math.ceil(total / 10) * 10,
    Math.ceil(total / 20) * 20,
    50,
    100,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= total).slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold gradient-text">Point of Sale</h1>
          <p className="text-muted-foreground">Process customer transactions</p>
        </div>
        <div className="flex items-center gap-2">
          {heldOrders.length > 0 && (
            <Button variant="outline" onClick={() => setShowHeldOrders(true)}>
              <PauseCircle className="h-4 w-4 mr-2" />
              Held Orders ({heldOrders.length})
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowRefundDialog(true)}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Refund
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, part number, or brand..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Button variant="outline" onClick={() => setShowScanner(true)} className="shrink-0">
              <Scan className="h-4 w-4 mr-2" />
              Scan
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {paginatedItems.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}>
                <Card className="glass cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all" onClick={() => addToCart(item)}>
                  <CardContent className="p-4">
                    {/* Product Image */}
                    <div className="mb-3 relative">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.part_name} 
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
                          <ImageIcon className="h-10 w-10 text-muted-foreground" />
                        </div>
                      )}
                      <Badge 
                        variant={item.quantity <= item.reorder_level ? 'destructive' : 'secondary'} 
                        className="absolute top-2 right-2"
                      >
                        {item.quantity} in stock
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <p className="font-medium truncate">{item.part_name}</p>
                        <p className="text-sm text-muted-foreground">{item.part_number}</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {item.brand && (
                          <Badge variant="outline" className="text-xs">{item.brand}</Badge>
                        )}
                        {formatYearRange(item.car_year_from, item.car_year_to) && (
                          <Badge variant="outline" className="text-xs">{formatYearRange(item.car_year_from, item.car_year_to)}</Badge>
                        )}
                        {item.categories?.name && (
                          <Badge variant="outline" className="text-xs">{item.categories.name}</Badge>
                        )}
                      </div>
                      <p className="font-display font-bold text-primary text-lg">${Number(item.selling_price).toFixed(2)}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <span className="text-sm text-muted-foreground ml-2">
                {filtered.length} items
              </span>
            </div>
          )}
        </div>

        {/* Cart */}
        <Card className="glass h-fit sticky top-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />Cart
                {cart.length > 0 && <Badge variant="secondary">{cart.reduce((s, c) => s + c.quantity, 0)}</Badge>}
              </CardTitle>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
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
                <div className="space-y-2 max-h-[250px] overflow-auto">
                  {cart.map(c => (
                    <div key={c.inventory.id} className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{c.inventory.part_name}</p>
                          <p className="text-xs text-muted-foreground">{c.inventory.part_number}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {c.inventory.brand && <Badge variant="outline" className="text-xs py-0">{c.inventory.brand}</Badge>}
                            {formatYearRange(c.inventory.car_year_from, c.inventory.car_year_to) && (
                              <Badge variant="outline" className="text-xs py-0">{formatYearRange(c.inventory.car_year_from, c.inventory.car_year_to)}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">${Number(c.inventory.selling_price).toFixed(2)} each</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(c.inventory.id, -1)}><Minus className="h-3 w-3" /></Button>
                          <Input 
                            type="number" 
                            min="1" 
                            max={c.inventory.quantity}
                            value={c.quantity} 
                            onChange={(e) => setQuantity(c.inventory.id, parseInt(e.target.value) || 1)}
                            className="w-12 h-7 text-center text-sm p-0"
                          />
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(c.inventory.id, 1)}><Plus className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFromCart(c.inventory.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                        </div>
                      </div>
                      <div className="text-right mt-2">
                        <span className="text-sm font-medium">${(c.quantity * Number(c.inventory.selling_price)).toFixed(2)}</span>
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
                  {taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax ({(taxRate * 100).toFixed(0)}%)</span>
                      <span>${taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="font-medium">Total</span>
                    <span className="font-display text-2xl font-bold text-primary">${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={holdOrder}>
                    <PauseCircle className="h-4 w-4 mr-2" />
                    Hold
                  </Button>
                  <Button className="glow" onClick={initiatePayment} disabled={loading || cart.length === 0}>
                    <Calculator className="h-4 w-4 mr-2" />
                    Checkout
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="glass max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Process Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="text-center">
              <p className="text-muted-foreground">Total Amount</p>
              <p className="font-display text-4xl font-bold text-primary">${total.toFixed(2)}</p>
            </div>

            <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="cash" className="gap-2">
                  <Banknote className="h-4 w-4" />Cash
                </TabsTrigger>
                <TabsTrigger value="card" className="gap-2">
                  <CreditCard className="h-4 w-4" />Card
                </TabsTrigger>
                <TabsTrigger value="mobile" className="gap-2">
                  <Wallet className="h-4 w-4" />Mobile
                </TabsTrigger>
              </TabsList>

              <TabsContent value="cash" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Cash Received</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="text-2xl text-center h-14"
                    step="0.01"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {quickCashAmounts.map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      onClick={() => setCashReceived(amount.toString())}
                    >
                      ${amount}
                    </Button>
                  ))}
                </div>
                {cashReceived && parseFloat(cashReceived) >= total && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg bg-success/10 border border-success/20 text-center"
                  >
                    <p className="text-sm text-muted-foreground">Change Due</p>
                    <p className="font-display text-2xl font-bold text-success">
                      ${(parseFloat(cashReceived) - total).toFixed(2)}
                    </p>
                  </motion.div>
                )}
              </TabsContent>

              <TabsContent value="card" className="mt-4">
                <div className="p-8 rounded-lg border-2 border-dashed border-border text-center">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Insert, tap, or swipe card</p>
                  <p className="text-sm text-muted-foreground mt-2">Waiting for payment terminal...</p>
                </div>
              </TabsContent>

              <TabsContent value="mobile" className="mt-4">
                <div className="p-8 rounded-lg border-2 border-dashed border-border text-center">
                  <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Scan QR code or tap to pay</p>
                  <p className="text-sm text-muted-foreground mt-2">Apple Pay, Google Pay, etc.</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
            <Button 
              onClick={processPayment} 
              disabled={paymentMethod === 'cash' && (!cashReceived || parseFloat(cashReceived) < total)}
              className="glow"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Complete Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hold Order Dialog */}
      <Dialog open={showHoldDialog} onOpenChange={setShowHoldDialog}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle className="font-display">Hold Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Note (optional)</Label>
              <Input
                placeholder="e.g., Customer will return in 30 min"
                value={holdNote}
                onChange={(e) => setHoldNote(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              This order will be saved and can be resumed later. Items will remain in stock until the sale is completed.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHoldDialog(false)}>Cancel</Button>
            <Button onClick={confirmHoldOrder}>
              <PauseCircle className="h-4 w-4 mr-2" />
              Hold Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Held Orders Dialog */}
      <Dialog open={showHeldOrders} onOpenChange={setShowHeldOrders}>
        <DialogContent className="glass max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Held Orders</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-auto py-4">
            {heldOrders.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No held orders</p>
            ) : (
              heldOrders.map((order) => (
                <Card key={order.id} className="glass">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">{order.cart.length} items</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(order.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {order.note && (
                          <p className="text-sm text-muted-foreground mb-2">"{order.note}"</p>
                        )}
                        <p className="text-sm">
                          Customer: {order.customer?.name || order.manualCustomerName || 'Walk-in'}
                        </p>
                        <p className="font-medium mt-1">
                          Total: ${order.cart.reduce((s, c) => s + c.quantity * Number(c.inventory.selling_price), 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" onClick={() => resumeOrder(order)}>
                          <PlayCircle className="h-4 w-4 mr-1" />
                          Resume
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => removeHeldOrder(order.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle className="font-display">Process Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Receipt Number</Label>
              <Input
                placeholder="e.g., RCP-ABC123"
                value={refundReceiptNumber}
                onChange={(e) => setRefundReceiptNumber(e.target.value.toUpperCase())}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Enter the receipt number to refund. All items from that sale will be returned to inventory.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefundDialog(false)}>Cancel</Button>
            <Button onClick={processRefund} variant="destructive">
              <RotateCcw className="h-4 w-4 mr-2" />
              Process Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="glass max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Receipt</DialogTitle>
          </DialogHeader>
          <div ref={receiptRef} className="space-y-4 py-4">
            <div className="text-center border-b border-dashed border-border pb-4">
              <h2 className="font-display font-bold text-lg">{businessName}</h2>
              <p className="text-sm text-muted-foreground">Receipt: {receiptData?.receiptNumber}</p>
              <p className="text-sm text-muted-foreground">{receiptData?.date}</p>
              <p className="text-sm">Customer: {receiptData?.customerName}</p>
            </div>
            
            <div className="space-y-3">
              {receiptData?.items.map((item: any, i: number) => (
                <div key={i} className="border-b border-dotted border-border pb-2">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.partNumber}
                    {item.brand && ` | ${item.brand}`}
                    {item.yearRange && ` | ${item.yearRange}`}
                  </p>
                  <div className="flex justify-between text-sm mt-1">
                    <span>{item.quantity} x ${item.price.toFixed(2)}</span>
                    <span>${item.total.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-border pt-4 space-y-2">
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
              {receiptData?.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>${receiptData?.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>TOTAL:</span>
                <span>${receiptData?.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="capitalize font-medium">{receiptData?.paymentMethod}</span>
              </div>
              {receiptData?.cashReceived && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cash Received:</span>
                    <span>${receiptData.cashReceived.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-success">
                    <span>Change:</span>
                    <span>${receiptData.change?.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="text-center border-t border-dashed border-border pt-4 text-sm text-muted-foreground">
              <p>Cashier: {receiptData?.cashier}</p>
              <p>Thank you for your business!</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={printReceipt}>
              <Printer className="h-4 w-4 mr-2" />Print
            </Button>
            <Button className="flex-1" onClick={handleDownloadPDF}>
              <FileText className="h-4 w-4 mr-2" />Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner */}
      <BarcodeScanner 
        open={showScanner} 
        onClose={() => setShowScanner(false)} 
        onScan={handleBarcodeScan} 
      />
    </div>
  );
}
