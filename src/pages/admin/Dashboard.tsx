import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { IndianRupee, Package, TrendingUp, Users, AlertTriangle, ShoppingBag, Tag, Ticket, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { Link } from "react-router-dom";

type Duration = "today" | "week" | "month" | "year" | "lifetime";

const STATUS_COLORS: Record<string, string> = {
  pending: "#FFA726",
  confirmed: "#29B6F6",
  processing: "#AB47BC",
  shipped: "#26A69A",
  delivered: "#66BB6A",
  cancelled: "#EF5350",
  returned: "#8D6E63",
  refunded: "#78909C",
};

const Dashboard = () => {
  const [duration, setDuration] = useState<Duration>("month");
  const [stats, setStats] = useState<any>({ revenue: 0, orders: 0, aov: 0, newCustomers: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [quickStats, setQuickStats] = useState({ products: 0, coupons: 0, tickets: 0, outOfStock: 0, pendingReturns: 0 });

  useEffect(() => {
    fetchDashboardData();
  }, [duration]);

  const getDateFilter = () => {
    const now = new Date();
    switch (duration) {
      case "today": return new Date(now.setHours(0, 0, 0, 0)).toISOString();
      case "week": return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case "month": return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
      case "year": return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
      default: return new Date("2020-01-01").toISOString();
    }
  };

  const fetchDashboardData = async () => {
    const dateFilter = getDateFilter();

    // Fetch orders for stats
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', dateFilter);

    const validOrders = (orders || []).filter(o => !['cancelled', 'returned', 'refunded'].includes(o.status));
    const revenue = validOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const orderCount = validOrders.length;

    // Customers
    const { count: customerCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', dateFilter);

    setStats({
      revenue,
      orders: orderCount,
      aov: orderCount > 0 ? Math.round(revenue / orderCount) : 0,
      newCustomers: customerCount || 0,
    });

    // Status breakdown
    const statusMap: Record<string, number> = {};
    (orders || []).forEach(o => { statusMap[o.status] = (statusMap[o.status] || 0) + 1; });
    setStatusData(Object.entries(statusMap).map(([name, value]) => ({ name, value })));

    // Revenue by day (last 30 days for simplicity)
    const dailyMap: Record<string, number> = {};
    validOrders.forEach(o => {
      const day = new Date(o.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      dailyMap[day] = (dailyMap[day] || 0) + Number(o.total_amount);
    });
    setRevenueData(Object.entries(dailyMap).map(([date, revenue]) => ({ date, revenue })));

    // Recent orders
    const { data: recent } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setRecentOrders(recent || []);

    // Low stock
    const { data: lowStockItems } = await supabase
      .from('product_variants')
      .select('*, products(name)')
      .lte('stock_qty', 5)
      .eq('is_active', true)
      .limit(10);
    setLowStock(lowStockItems || []);

    // Quick stats
    const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true);
    const { count: couponCount } = await supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('is_active', true);
    const { count: ticketCount } = await supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open');
    const { count: oosCount } = await supabase.from('product_variants').select('*', { count: 'exact', head: true }).eq('stock_qty', 0).eq('is_active', true);

    setQuickStats({
      products: productCount || 0,
      coupons: couponCount || 0,
      tickets: ticketCount || 0,
      outOfStock: oosCount || 0,
    });
  };

  return (
    <div className="space-y-6">
      {/* Duration selector */}
      <div className="flex justify-end overflow-x-auto">
        <Tabs value={duration} onValueChange={(v) => setDuration(v as Duration)}>
          <TabsList className="flex-nowrap">
            <TabsTrigger value="today" className="text-xs">Today</TabsTrigger>
            <TabsTrigger value="week" className="text-xs">Week</TabsTrigger>
            <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
            <TabsTrigger value="year" className="text-xs">Year</TabsTrigger>
            <TabsTrigger value="lifetime" className="text-xs">Lifetime</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-body">Total Revenue</p>
                <p className="text-xl font-bold font-body">₹{stats.revenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-body">Total Orders</p>
                <p className="text-xl font-bold font-body">{stats.orders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-body">Avg Order Value</p>
                <p className="text-xl font-bold font-body">₹{stats.aov.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-body">New Customers</p>
                <p className="text-xl font-bold font-body">{stats.newCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-body">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm font-body">No data yet</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-body">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {statusData.map((entry, index) => (
                      <Cell key={index} fill={STATUS_COLORS[entry.name] || "hsl(var(--muted))"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm font-body">No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-body">Recent Orders</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/orders">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto"><Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-body text-xs">Order #</TableHead>
                <TableHead className="font-body text-xs">Customer</TableHead>
                <TableHead className="font-body text-xs">Total</TableHead>
                <TableHead className="font-body text-xs">Status</TableHead>
                <TableHead className="font-body text-xs">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground font-body text-sm py-8">No orders yet</TableCell>
                </TableRow>
              ) : recentOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">
                    <Link to={`/admin/orders/${order.id}`} className="text-primary hover:underline">{order.order_number}</Link>
                  </TableCell>
                  <TableCell className="font-body text-sm">{order.shipping_name}</TableCell>
                  <TableCell className="font-body text-sm">₹{Number(order.total_amount).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="text-[10px] capitalize"
                      style={{ backgroundColor: STATUS_COLORS[order.status] + '20', color: STATUS_COLORS[order.status] }}
                    >
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-body text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString('en-IN')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
        </CardContent>
      </Card>

      {/* Low stock + Quick stats */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-accent" />
              <CardTitle className="text-sm font-body">Low Stock Alerts</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground font-body">No low stock items</p>
            ) : (
              <div className="space-y-2">
                {lowStock.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 text-sm font-body overflow-hidden">
                    <span className="min-w-0 truncate">{(item.products as any)?.name} — {item.size} / {item.color_name}</span>
                    <Badge variant={item.stock_qty === 0 ? "destructive" : "secondary"} className="text-[10px] shrink-0">
                      {item.stock_qty} left
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-sm font-body">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 min-w-0">
                <ShoppingBag className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-lg font-bold font-body">{quickStats.products}</p>
                  <p className="text-[10px] text-muted-foreground font-body">Active Products</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 min-w-0">
                <Tag className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-lg font-bold font-body">{quickStats.coupons}</p>
                  <p className="text-[10px] text-muted-foreground font-body">Active Coupons</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 min-w-0">
                <Ticket className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-lg font-bold font-body">{quickStats.tickets}</p>
                  <p className="text-[10px] text-muted-foreground font-body">Open Tickets</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 min-w-0">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <div>
                  <p className="text-lg font-bold font-body">{quickStats.outOfStock}</p>
                  <p className="text-[10px] text-muted-foreground font-body">Out of Stock</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
