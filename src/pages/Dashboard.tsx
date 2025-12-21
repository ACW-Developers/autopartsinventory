import { useEffect, useState } from 'react';
import { Package, AlertTriangle, DollarSign, TrendingUp, ShoppingCart, Users, Truck, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DashboardStats {
  totalItems: number;
  lowStockCount: number;
  todaySales: number;
  monthlyRevenue: number;
  totalCustomers: number;
  totalSuppliers: number;
  pendingOrders: number;
  weeklyGrowth: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--info))', 'hsl(var(--destructive))'];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({ 
    totalItems: 0, lowStockCount: 0, todaySales: 0, monthlyRevenue: 0,
    totalCustomers: 0, totalSuppliers: 0, pendingOrders: 0, weeklyGrowth: 0
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const [inventoryRes, salesRes, todaySalesRes, monthlySalesRes, customersRes, suppliersRes, ordersRes, lastWeekRes, prevWeekRes] = await Promise.all([
      supabase.from('inventory').select('*'),
      supabase.from('pos_sales').select('*, inventory(part_name, category), profiles(full_name)').order('created_at', { ascending: false }).limit(4),
      supabase.from('pos_sales').select('total_price').gte('created_at', today),
      supabase.from('pos_sales').select('total_price').gte('created_at', monthStart),
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase.from('suppliers').select('id', { count: 'exact', head: true }),
      supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('pos_sales').select('total_price').gte('created_at', weekAgo),
      supabase.from('pos_sales').select('total_price').gte('created_at', twoWeeksAgo).lt('created_at', weekAgo)
    ]);

    const inventory = inventoryRes.data || [];
    const lowStock = inventory.filter(item => item.quantity <= item.reorder_level);
    
    const lastWeekTotal = lastWeekRes.data?.reduce((sum, s) => sum + Number(s.total_price), 0) || 0;
    const prevWeekTotal = prevWeekRes.data?.reduce((sum, s) => sum + Number(s.total_price), 0) || 0;
    const growth = prevWeekTotal > 0 ? ((lastWeekTotal - prevWeekTotal) / prevWeekTotal) * 100 : 0;

    setStats({
      totalItems: inventory.length,
      lowStockCount: lowStock.length,
      todaySales: todaySalesRes.data?.reduce((sum, s) => sum + Number(s.total_price), 0) || 0,
      monthlyRevenue: monthlySalesRes.data?.reduce((sum, s) => sum + Number(s.total_price), 0) || 0,
      totalCustomers: customersRes.count || 0,
      totalSuppliers: suppliersRes.count || 0,
      pendingOrders: ordersRes.count || 0,
      weeklyGrowth: growth
    });
    setRecentSales(salesRes.data || []);
    setLowStockItems(lowStock.slice(0, 5));

    // Generate sales trend data (last 7 days)
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const { data } = await supabase
        .from('pos_sales')
        .select('total_price')
        .gte('created_at', dateStr)
        .lt('created_at', nextDate);
      
      trendData.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        sales: data?.reduce((sum, s) => sum + Number(s.total_price), 0) || 0,
        transactions: data?.length || 0
      });
    }
    setSalesTrend(trendData);

    // Category distribution
    const categoryMap: Record<string, number> = {};
    inventory.forEach(item => {
      const cat = item.category || 'Uncategorized';
      categoryMap[cat] = (categoryMap[cat] || 0) + item.quantity;
    });
    setCategoryData(Object.entries(categoryMap).slice(0, 5).map(([name, value]) => ({ name, value })));

    // Monthly revenue data (last 6 months)
    const revenueArr = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();
      
      const { data } = await supabase
        .from('pos_sales')
        .select('total_price, cost:inventory(cost_price), quantity_sold')
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);
      
      const revenue = data?.reduce((sum, s) => sum + Number(s.total_price), 0) || 0;
      const cost = data?.reduce((sum, s) => sum + (Number((s.cost as any)?.cost_price || 0) * s.quantity_sold), 0) || 0;
      
      revenueArr.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        revenue,
        profit: revenue - cost
      });
    }
    setRevenueData(revenueArr);
  };

  const statCards = [
    { title: 'Total Inventory', value: stats.totalItems, icon: Package, color: 'text-primary', bg: 'bg-primary/20' },
    { title: 'Low Stock Alerts', value: stats.lowStockCount, icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/20' },
    { title: 'Today\'s Sales', value: `$${stats.todaySales.toFixed(2)}`, icon: ShoppingCart, color: 'text-success', bg: 'bg-success/20' },
    { title: 'Monthly Revenue', value: `$${stats.monthlyRevenue.toFixed(2)}`, icon: TrendingUp, color: 'text-info', bg: 'bg-info/20' },
    { title: 'Customers', value: stats.totalCustomers, icon: Users, color: 'text-primary', bg: 'bg-primary/20' },
    { title: 'Suppliers', value: stats.totalSuppliers, icon: Truck, color: 'text-success', bg: 'bg-success/20' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold gradient-text">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Real-time overview of your auto parts business</p>
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl glass self-start sm:self-auto"
        >
          {stats.weeklyGrowth >= 0 ? (
            <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
          ) : (
            <ArrowDownRight className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
          )}
          <span className={`font-display text-sm sm:text-base font-bold ${stats.weeklyGrowth >= 0 ? 'text-success' : 'text-destructive'}`}>
            {stats.weeklyGrowth >= 0 ? '+' : ''}{stats.weeklyGrowth.toFixed(1)}%
          </span>
          <span className="text-xs sm:text-sm text-muted-foreground hidden xs:inline">vs last week</span>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
        {statCards.map((stat, i) => (
          <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="metric-card overflow-hidden relative">
              <div className={`absolute inset-0 ${stat.bg} opacity-20`} />
              <CardContent className="p-3 sm:p-4 relative">
                <div className="flex items-center justify-between mb-2">
                  <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                </div>
                <p className="text-lg sm:text-2xl font-display font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground truncate">{stat.title}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Sales Trend */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Sales Trend (7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={salesTrend}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `$${v}`} width={50} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Sales']}
                  />
                  <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#salesGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Revenue & Profit */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                Revenue & Profit (6 Mo)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `$${v}`} width={50} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`]}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="profit" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Profit" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Category Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base sm:text-lg">Inventory by Category</CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                {categoryData.map((cat, i) => (
                  <Badge key={cat.name} variant="outline" className="text-[10px] sm:text-xs" style={{ borderColor: COLORS[i % COLORS.length] }}>
                    {cat.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Sales */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base sm:text-lg">Recent Sales</CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              {recentSales.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">No sales yet</p>
              ) : (
                <div className="space-y-2">
                  {recentSales.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/30">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{sale.inventory?.part_name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {sale.quantity_sold}</p>
                      </div>
                      <p className="font-display text-sm font-bold text-success">${Number(sale.total_price).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Low Stock Items */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="md:col-span-2 lg:col-span-1">
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="font-display flex items-center gap-2 text-base sm:text-lg">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
                Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              {lowStockItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">All items well stocked</p>
              ) : (
                <div className="space-y-2">
                  {lowStockItems.slice(0, 4).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/30">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{item.part_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.part_number}</p>
                      </div>
                      <Badge variant="destructive" className="text-xs shrink-0">{item.quantity} left</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
