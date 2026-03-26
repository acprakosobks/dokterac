import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Store, TrendingUp } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell,
  AreaChart, Area,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(142 76% 36%)",
  "hsl(48 96% 53%)",
];

const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0, activeVendors: 0 });
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);
  const [topVendors, setTopVendors] = useState<{ name: string; orders: number }[]>([]);
  const [trendData, setTrendData] = useState<{ date: string; orders: number }[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch all bookings
    const { data: bookings } = await supabase.from("bookings").select("*, vendors(company_name)");
    const { data: vendors } = await supabase.from("vendors").select("*");

    if (!bookings || !vendors) return;

    // Stats
    const totalRevenue = bookings.reduce((sum, b) => {
      const services = (b.selected_services as any[]) || [];
      return sum + services.reduce((s: number, svc: any) => s + (svc.price || 0), 0);
    }, 0);
    const activeVendors = vendors.filter((v: any) => v.is_active).length;
    setStats({ totalRevenue, totalOrders: bookings.length, activeVendors });

    // Status distribution
    const statusMap: Record<string, number> = {};
    bookings.forEach((b) => {
      statusMap[b.status] = (statusMap[b.status] || 0) + 1;
    });
    setStatusData(Object.entries(statusMap).map(([name, value]) => ({ name, value })));

    // Top 5 vendors
    const vendorMap: Record<string, { name: string; orders: number }> = {};
    bookings.forEach((b: any) => {
      const name = b.vendors?.company_name || "Unknown";
      if (!vendorMap[b.vendor_id]) vendorMap[b.vendor_id] = { name, orders: 0 };
      vendorMap[b.vendor_id].orders++;
    });
    setTopVendors(
      Object.values(vendorMap)
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 5)
    );

    // Trend (last 30 days)
    const trend: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      trend[d.toISOString().split("T")[0]] = 0;
    }
    bookings.forEach((b) => {
      const d = b.booking_date;
      if (trend[d] !== undefined) trend[d]++;
    });
    setTrendData(Object.entries(trend).map(([date, orders]) => ({ date, orders })));
  };

  const pieConfig: ChartConfig = {
    value: { label: "Jumlah" },
  };
  const barConfig: ChartConfig = {
    orders: { label: "Pesanan", color: "hsl(var(--primary))" },
  };
  const areaConfig: ChartConfig = {
    orders: { label: "Pesanan", color: "hsl(var(--primary))" },
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {stats.totalRevenue.toLocaleString("id-ID")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Pesanan</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vendor Aktif</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeVendors}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Order Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Tren Pesanan (30 Hari)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={areaConfig} className="h-[250px]">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="orders" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.2)" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Status Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribusi Status Pesanan</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={pieConfig} className="h-[250px]">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Vendors Bar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Top 5 Vendor</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barConfig} className="h-[250px]">
              <BarChart data={topVendors}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
