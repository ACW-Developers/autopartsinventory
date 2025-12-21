import { useEffect, useState } from 'react';
import { Package, AlertTriangle, DollarSign, TrendingUp, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DashboardStats {
  totalItems: number;
  lowStockCount: number;
  todaySales: number;
  monthlyRevenue: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({ totalItems: 0, lowStockCount: 0, todaySales: 0, monthlyRevenue: 0 });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const { data: inventory } = await supabase.from('inventory').select('*');
    const { data: sales } = await supabase.from('pos_sales').select('*, inventory(part_name), profiles(full_name)').order('created_at', { ascending: false }).limit(5);
    
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    
    const { data: todaySalesData } = await supabase.from('pos_sales').select('total_price').gte('created_at', today);
    const { data: monthlySalesData } = await supabase.from('pos_sales').select('total_price').gte('created_at', monthStart);

    const lowStock = inventory?.filter(item => item.quantity <= item.reorder_level) || [];
    
    setStats({
      totalItems: inventory?.length || 0,
      lowStockCount: lowStock.length,
      todaySales: todaySalesData?.reduce((sum, s) => sum + Number(s.total_price), 0) || 0,
      monthlyRevenue: monthlySalesData?.reduce((sum, s) => sum + Number(s.total_price), 0) || 0,
    });
    setRecentSales(sales || []);
    setLowStockItems(lowStock.slice(0, 5));
  };

  const statCards = [
    { title: 'Total Inventory', value: stats.totalItems, icon: Package, color: 'text-primary' },
    { title: 'Low Stock Alerts', value: stats.lowStockCount, icon: AlertTriangle, color: 'text-warning' },
    { title: 'Today\'s Sales', value: `$${stats.todaySales.toFixed(2)}`, icon: ShoppingCart, color: 'text-success' },
    { title: 'Monthly Revenue', value: `$${stats.monthlyRevenue.toFixed(2)}`, icon: TrendingUp, color: 'text-info' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold gradient-text">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your auto parts inventory</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="metric-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-display font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="font-display">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No sales yet</p>
            ) : (
              <div className="space-y-3">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium">{sale.inventory?.part_name}</p>
                      <p className="text-sm text-muted-foreground">Qty: {sale.quantity_sold}</p>
                    </div>
                    <p className="font-display font-bold text-success">${Number(sale.total_price).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="font-display">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">All items well stocked</p>
            ) : (
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium">{item.part_name}</p>
                      <p className="text-sm text-muted-foreground">{item.part_number}</p>
                    </div>
                    <Badge variant="destructive">{item.quantity} left</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
