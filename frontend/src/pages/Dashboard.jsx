import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    AlertTriangle,
    ShoppingBag,
    Calendar,
    ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Line, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement
);

const Dashboard = () => {
    const { formatCurrency } = useSettings();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        try {
            const response = await axios.get('/dashboard');
            if (response.data.status === 'success') {
                setData(response.data.data);
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[70vh]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Loading metrics...</span>
                </div>
            </div>
        );
    }

    const { stats, low_stock_alerts, recent_sales, top_selling, sales_chart } = data || {};

    // Chart.js Line Chart Data
    const lineChartData = {
        labels: sales_chart?.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }) || [],
        datasets: [
            {
                fill: true,
                label: 'Daily Sales',
                data: sales_chart?.map(item => item.sales) || [],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                borderWidth: 2,
                pointBackgroundColor: '#6366f1',
                tension: 0.35,
            }
        ]
    };

    const lineChartOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: {
                padding: 12,
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleFont: { size: 13, weight: 'bold' },
                bodyFont: { size: 12 },
                cornerRadius: 8,
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
            y: { grid: { borderDash: [5, 5] }, ticks: { font: { size: 10 } } }
        }
    };

    // Doughnut Chart Data for Top Selling Products
    const doughnutChartData = {
        labels: top_selling?.map(item => item.name) || [],
        datasets: [
            {
                data: top_selling?.map(item => item.total_qty) || [],
                backgroundColor: [
                    '#6366f1',
                    '#3b82f6',
                    '#ec4899',
                    '#f59e0b',
                    '#10b981',
                ],
                borderWidth: 0,
            }
        ]
    };

    const doughnutChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } },
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Overview Dashboard</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Real-time business performance metrics.
                    </p>
                </div>
                <div className="text-xs font-semibold px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span>Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                
                {/* Today's Sales */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Today's Sales</p>
                        <h3 className="text-xl font-extrabold mt-1">{formatCurrency(stats.today_sales)}</h3>
                    </div>
                </div>

                {/* Today's Profit */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Today's Profit</p>
                        <h3 className="text-xl font-extrabold mt-1">{formatCurrency(stats.today_profit)}</h3>
                    </div>
                </div>

                {/* Monthly Sales */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-xl">
                        <ShoppingBag className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Monthly Sales</p>
                        <h3 className="text-xl font-extrabold mt-1">{formatCurrency(stats.monthly_sales)}</h3>
                    </div>
                </div>

                {/* Low Stock Warning */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200">
                    <div className={`p-3 rounded-xl ${stats.low_stock_count > 0 ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-650'}`}>
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Low Stock Products</p>
                        <h3 className="text-xl font-extrabold mt-1">{stats.low_stock_count} Items</h3>
                    </div>
                </div>
            </div>

            {/* Graphs Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sales Chart (2 cols) */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
                    <h3 className="text-base font-bold mb-4">Sales Trend (Last 30 Days)</h3>
                    <div className="h-64">
                        <Line data={lineChartData} options={lineChartOptions} />
                    </div>
                </div>

                {/* Top Products Share (1 col) */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex flex-col">
                    <h3 className="text-base font-bold mb-4">Top Selling Products</h3>
                    <div className="relative flex-1 min-h-[220px]">
                        {top_selling?.length > 0 ? (
                            <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
                                No sales data available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tables and alerts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Recent Transactions */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold">Recent Sales</h3>
                        <Link to="/invoices" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
                            <span>View All</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 pb-2 text-slate-500 font-semibold uppercase">
                                    <th className="py-2">Invoice</th>
                                    <th className="py-2">Customer</th>
                                    <th className="py-2">Total</th>
                                    <th className="py-2">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                                {recent_sales?.map((sale) => (
                                    <tr key={sale.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                        <td className="py-3 font-semibold text-slate-700 dark:text-slate-300">
                                            {sale.invoice_number}
                                        </td>
                                        <td className="py-3 text-slate-600 dark:text-slate-400">
                                            {sale.customer?.name || 'Walk-In'}
                                        </td>
                                        <td className="py-3 font-bold text-slate-800 dark:text-white">
                                            {formatCurrency(sale.payable_amount)}
                                        </td>
                                        <td className="py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                sale.status === 'completed'
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450'
                                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-450'
                                            }`}>
                                                {sale.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Low Stock Alerts */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold flex items-center gap-2">
                            <span>Low Stock Alerts</span>
                            {stats.low_stock_count > 0 && (
                                <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                    {stats.low_stock_count}
                                </span>
                            )}
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-56 divide-y divide-slate-100 dark:divide-slate-800/60">
                        {low_stock_alerts?.length > 0 ? (
                            low_stock_alerts.map((prod) => (
                                <div key={prod.id} className="py-3 flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-355">{prod.name}</h4>
                                        <p className="text-[10px] text-slate-500 mt-0.5">SKU: {prod.sku} | Brand: {prod.brand?.name || 'N/A'}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400">
                                            {prod.quantity} Left
                                        </span>
                                        <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">Threshold: {prod.low_stock_warning}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center justify-center h-full py-8 text-xs text-slate-400">
                                All products are well stocked.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
