import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import { useSettings } from '../context/SettingsContext';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Calendar,
    Search,
    Package,
    Truck,
    UserCheck,
    Percent,
    Award,
    ArrowUpDown,
    ShoppingBag,
    AlertCircle
} from 'lucide-react';

const Reports = () => {
    const { formatCurrency } = useSettings();
    const [activeTab, setActiveTab] = useState('analytics');

    // Date range states (default to today / single date or range)
    const [dateFrom, setDateFrom] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

    // Data sets
    const [analyticsData, setAnalyticsData] = useState({
        summary: { total_items_sold: 0, total_revenue: 0, top_performer: null, lowest_performer: null },
        items: []
    });
    const [pnlData, setPnlData] = useState(null);
    const [salesReport, setSalesReport] = useState({ summary: {}, sales: [] });
    const [inventoryReport, setInventoryReport] = useState({ summary: {}, products: [] });
    const [vendorReport, setVendorReport] = useState([]);
    const [cashierReport, setCashierReport] = useState([]);
    const [loading, setLoading] = useState(false);

    // Sorting state for Analytics Report
    const [analyticsSortBy, setAnalyticsSortBy] = useState('total_qty_sold'); // 'total_qty_sold' or 'total_revenue'
    const [analyticsSortOrder, setAnalyticsSortOrder] = useState('desc');

    const fetchAnalyticsReport = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/reports/analytics?date_from=${dateFrom}&date_to=${dateTo}`);
            if (res.data.status === 'success') {
                setAnalyticsData(res.data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPnLAndSales = async () => {
        setLoading(true);
        try {
            const [pnlRes, salesRes] = await Promise.all([
                axios.get(`/reports/profit-loss?date_from=${dateFrom}&date_to=${dateTo}`),
                axios.get(`/reports/sales?date_from=${dateFrom}&date_to=${dateTo}`)
            ]);
            setPnlData(pnlRes.data.data);
            setSalesReport(salesRes.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchInventoryReport = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/reports/inventory');
            setInventoryReport(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchVendorReport = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/reports/vendors');
            setVendorReport(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCashierReport = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/reports/cashiers?date_from=${dateFrom}&date_to=${dateTo}`);
            setCashierReport(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Refetch data when tab or date changes
    useEffect(() => {
        if (activeTab === 'analytics') {
            fetchAnalyticsReport();
        } else if (activeTab === 'pnl') {
            fetchPnLAndSales();
        } else if (activeTab === 'inventory') {
            fetchInventoryReport();
        } else if (activeTab === 'vendors') {
            fetchVendorReport();
        } else if (activeTab === 'cashiers') {
            fetchCashierReport();
        }
    }, [activeTab, dateFrom, dateTo]);

    // Sorting logic for Analytics items
    const getSortedAnalyticsItems = () => {
        const items = [...(analyticsData.items || [])];
        return items.sort((a, b) => {
            const valA = parseFloat(a[analyticsSortBy]) || 0;
            const valB = parseFloat(b[analyticsSortBy]) || 0;
            return analyticsSortOrder === 'desc' ? valB - valA : valA - valB;
        });
    };

    const toggleSort = (field) => {
        if (analyticsSortBy === field) {
            setAnalyticsSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
        } else {
            setAnalyticsSortBy(field);
            setAnalyticsSortOrder('desc');
        }
    };

    const getSoldProductsData = () => {
        const productMap = {};
        salesReport.sales?.forEach(sale => {
            sale.items?.forEach(item => {
                const productId = item.product_id;
                if (!productId) return;
                const productName = item.product?.name || 'Unknown Product';
                const sku = item.product?.sku || 'N/A';
                const costPrice = parseFloat(item.product?.purchase_price || 0);
                const qty = parseInt(item.quantity || 0);
                const subtotal = parseFloat(item.subtotal || 0);
                
                if (!productMap[productId]) {
                    productMap[productId] = {
                        id: productId,
                        name: productName,
                        sku: sku,
                        costPrice: costPrice,
                        qtySold: 0,
                        totalRevenue: 0,
                        totalCost: 0,
                    };
                }
                
                productMap[productId].qtySold += qty;
                productMap[productId].totalRevenue += subtotal;
                productMap[productId].totalCost += (costPrice * qty);
            });
        });
        
        return Object.values(productMap).map(p => ({
            ...p,
            netProfit: p.totalRevenue - p.totalCost
        })).sort((a, b) => b.netProfit - a.netProfit);
    };

    // Columns config
    const analyticsColumns = [
        {
            header: 'Item ID / SKU',
            accessor: 'sku',
            render: (val) => <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{val || 'N/A'}</span>
        },
        {
            header: 'Item Name',
            accessor: 'name',
            render: (val, row) => (
                <div>
                    <span className="font-bold text-slate-800 dark:text-white">{val}</span>
                </div>
            )
        },
        {
            header: 'Category',
            accessor: 'category',
            render: (val) => <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[11px] font-semibold text-slate-600 dark:text-slate-300">{val}</span>
        },
        {
            header: 'Unit Price',
            accessor: 'unit_price',
            render: (val) => formatCurrency(val)
        },
        {
            header: 'Total Qty Sold',
            accessor: 'total_qty_sold',
            render: (val) => <span className="font-bold text-indigo-600 dark:text-indigo-400">{val} Units</span>
        },
        {
            header: 'Total Sales Revenue',
            accessor: 'total_revenue',
            render: (val) => <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(val)}</span>
        },
        {
            header: 'Current Stock Level',
            accessor: 'current_stock',
            render: (val) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    val <= 5
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                    {val} in stock
                </span>
            )
        }
    ];

    const salesColumns = [
        { header: 'Invoice', accessor: 'invoice_number', render: (val) => <span className="font-bold">{val}</span> },
        { header: 'Customer', accessor: 'customer', render: (val) => val?.name || 'Walk-In' },
        { header: 'Date', accessor: 'sale_date', render: (val) => new Date(val).toLocaleDateString() },
        { header: 'Subtotal', accessor: 'total_amount', render: (val) => formatCurrency(val) },
        { header: 'Discount', accessor: 'discount_amount', render: (val) => <span className="text-red-500">-{formatCurrency(val)}</span> },
        { header: 'Tax Paid', accessor: 'tax_amount', render: (val) => formatCurrency(val) },
        { header: 'Payable Net', accessor: 'payable_amount', render: (val) => <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(val)}</span> },
        {
            header: 'Net Profit',
            accessor: 'items',
            render: (items, row) => {
                const totalCost = items?.reduce((sum, item) => sum + (parseFloat(item.product?.purchase_price || 0) * item.quantity), 0) || 0;
                const invoiceProfit = (parseFloat(row.payable_amount) - parseFloat(row.tax_amount)) - totalCost;
                return (
                    <span className={`font-bold ${invoiceProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(invoiceProfit)}
                    </span>
                );
            }
        },
        { header: 'Payment', accessor: 'payment_method', render: (val) => <span className="capitalize">{val?.replace('_', ' ')}</span> }
    ];

    const soldProductColumns = [
        { header: 'Product Name', accessor: 'name', render: (val, row) => (
            <div>
                <span className="font-bold text-slate-800 dark:text-white">{val}</span>
                <span className="block text-[10px] text-slate-400">SKU: {row.sku}</span>
            </div>
        )},
        { header: 'Cost Price', accessor: 'costPrice', render: (val) => formatCurrency(val) },
        { header: 'Qty Sold', accessor: 'qtySold', render: (val) => <span className="font-semibold">{val} Units</span> },
        { header: 'Total Revenue', accessor: 'totalRevenue', render: (val) => formatCurrency(val) },
        { header: 'Total Cost', accessor: 'totalCost', render: (val) => formatCurrency(val) },
        { 
            header: 'Net Profit', 
            accessor: 'netProfit', 
            render: (val) => (
                <span className={`font-bold ${val >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(val)}
                </span>
            )
        }
    ];

    const inventoryColumns = [
        { header: 'Garment Description', accessor: 'name', render: (val, row) => (
            <div>
                <p className="font-bold">{val}</p>
                {row.size_stock && Object.keys(row.size_stock).length > 0 && (
                    <p className="text-[10px] text-slate-500 mt-0.5">
                        Sizes: {Object.entries(row.size_stock).map(([sz, q]) => `${sz}: ${q}`).join(' | ')}
                    </p>
                )}
                {row.colors && row.colors.length > 0 && (
                    <p className="text-[10px] text-slate-500 mt-0.5">
                        Colors: {row.colors.join(', ')}
                    </p>
                )}
                <p className="text-[10px] text-slate-400">SKU: {row.sku} | Barcode: {row.barcode || '-'}</p>
            </div>
        )},
        { header: 'Cost Price', accessor: 'purchase_price', render: (val) => formatCurrency(val) },
        { header: 'Retail Price', accessor: 'selling_price', render: (val) => formatCurrency(val) },
        { header: 'Unit Profit', accessor: 'id', render: (_, row) => formatCurrency(row.selling_price - row.purchase_price) },
        { header: 'Current Stock', accessor: 'quantity', render: (val) => <span className="font-semibold">{val} Units</span> },
        { header: 'Cost Value Asset', accessor: 'id', render: (_, row) => formatCurrency(row.quantity * row.purchase_price) },
        { header: 'Retail Value Asset', accessor: 'id', render: (_, row) => formatCurrency(row.quantity * row.selling_price) },
        { header: 'Potential Margin', accessor: 'id', render: (_, row) => formatCurrency((row.selling_price - row.purchase_price) * row.quantity) }
    ];

    const vendorColumns = [
        { header: 'Supplier Name', accessor: 'name', render: (val) => <span className="font-bold">{val}</span> },
        { header: 'Contact Person', accessor: 'contact_person' },
        { header: 'POs Ordered', accessor: 'total_orders' },
        { header: 'Total Ordered Amt', accessor: 'total_amount', render: (val) => formatCurrency(val) },
        { header: 'Total Paid Out', accessor: 'total_paid', render: (val) => formatCurrency(val) },
        { header: 'Outstanding Balance', accessor: 'balance_due', render: (val) => <span className={`font-bold ${val > 0 ? 'text-red-500' : 'text-slate-500'}`}>{formatCurrency(val)}</span> }
    ];

    const cashierColumns = [
        { header: 'Cashier Name', accessor: 'name', render: (val) => <span className="font-bold">{val}</span> },
        { header: 'Cashier Email', accessor: 'email' },
        { header: 'Transactions Served', accessor: 'transactions' },
        { header: 'Total Sales Revenue', accessor: 'total_sales', render: (val) => <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(val)}</span> },
        { header: 'Average Ticket Value', accessor: 'avg_transaction_value', render: (val) => formatCurrency(val) }
    ];

    return (
        <div className="space-y-6">
            
            {/* Headers row with Date Range Selectors */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics Dashboard</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Date-filtered sales performance, peak & lowest items breakdown, revenue analytics, and valuation.
                    </p>
                </div>

                {/* Date Selection UI */}
                {activeTab !== 'inventory' && (
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-2xl shadow-sm self-start md:self-auto">
                        <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider hidden sm:inline">Filter Date:</span>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="bg-transparent border-none outline-none text-xs font-semibold focus:ring-0 w-28 text-slate-800 dark:text-slate-100"
                        />
                        <span className="text-slate-400 text-xs font-bold">to</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="bg-transparent border-none outline-none text-xs font-semibold focus:ring-0 w-28 text-slate-800 dark:text-slate-100"
                        />
                    </div>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 overflow-x-auto">
                {[
                    { id: 'analytics', label: 'Item Analytics', icon: TrendingUp },
                    { id: 'pnl', label: 'Profit & Loss (P&L)', icon: BarChart3 },
                    { id: 'inventory', label: 'Inventory Valuation', icon: Package },
                    { id: 'vendors', label: 'Supplier Summaries', icon: Truck },
                    { id: 'cashiers', label: 'Cashier Performance', icon: UserCheck },
                ].map((tab) => {
                    const Icon = tab.icon;
                    const isAct = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 pb-3 text-sm font-semibold transition border-b-2 whitespace-nowrap ${
                                isAct
                                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <Icon className="w-4.5 h-4.5" />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Displaying Reports: ITEM ANALYTICS TAB */}
            {activeTab === 'analytics' && (
                <div className="space-y-6">
                    {/* Analytics Breakdown Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        
                        {/* 1. Total Sales & Revenue */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sales & Revenue</p>
                                    <h3 className="text-2xl font-black mt-2 text-indigo-600 dark:text-indigo-400">
                                        {formatCurrency(analyticsData.summary?.total_revenue || 0)}
                                    </h3>
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-1">
                                        <ShoppingBag className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>{analyticsData.summary?.total_items_sold || 0} Total Items Sold</span>
                                    </p>
                                </div>
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                            </div>
                        </div>

                        {/* 2. Top Performer (Peak Item) */}
                        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 p-5 rounded-2xl shadow-sm relative overflow-hidden bg-gradient-to-br from-emerald-50/30 to-transparent dark:from-emerald-950/10">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-md text-[10px] font-extrabold uppercase tracking-wider inline-block">
                                        Peak Item (Top Performer)
                                    </span>
                                    {analyticsData.summary?.top_performer ? (
                                        <>
                                            <h4 className="text-base font-extrabold text-slate-800 dark:text-white truncate max-w-[220px]">
                                                {analyticsData.summary.top_performer.name}
                                            </h4>
                                            <p className="text-xs text-slate-500 font-mono">SKU: {analyticsData.summary.top_performer.sku}</p>
                                            <div className="pt-2 flex items-center gap-3 text-xs">
                                                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                                    {analyticsData.summary.top_performer.total_qty_sold} Units Sold
                                                </span>
                                                <span className="text-slate-300">•</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-200">
                                                    {formatCurrency(analyticsData.summary.top_performer.total_revenue)} Revenue
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic pt-2">No sales recorded for selected date.</p>
                                    )}
                                </div>
                                <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                    <Award className="w-6 h-6" />
                                </div>
                            </div>
                        </div>

                        {/* 3. Lowest Performer */}
                        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 p-5 rounded-2xl shadow-sm relative overflow-hidden bg-gradient-to-br from-amber-50/30 to-transparent dark:from-amber-950/10">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-md text-[10px] font-extrabold uppercase tracking-wider inline-block">
                                        Lowest Performer
                                    </span>
                                    {analyticsData.summary?.lowest_performer ? (
                                        <>
                                            <h4 className="text-base font-extrabold text-slate-800 dark:text-white truncate max-w-[220px]">
                                                {analyticsData.summary.lowest_performer.name}
                                            </h4>
                                            <p className="text-xs text-slate-500 font-mono">SKU: {analyticsData.summary.lowest_performer.sku}</p>
                                            <div className="pt-2 flex items-center gap-3 text-xs">
                                                <span className="font-bold text-amber-700 dark:text-amber-400">
                                                    {analyticsData.summary.lowest_performer.total_qty_sold} Units Sold
                                                </span>
                                                <span className="text-slate-300">•</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-200">
                                                    {formatCurrency(analyticsData.summary.lowest_performer.total_revenue)} Revenue
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic pt-2">No sales recorded for selected date.</p>
                                    )}
                                </div>
                                <div className="p-3 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
                                    <TrendingDown className="w-6 h-6" />
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Detailed Items Table / List */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dark:border-slate-800 pb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 dark:text-white">Detailed Items Sales Report</h3>
                                <p className="text-xs text-slate-500">Every item sold on {dateFrom === dateTo ? dateFrom : `${dateFrom} to ${dateTo}`} with current stock levels.</p>
                            </div>

                            {/* Sorting controls */}
                            <div className="flex items-center gap-2 self-start sm:self-auto">
                                <span className="text-xs font-bold text-slate-400">Sort By:</span>
                                <button
                                    onClick={() => toggleSort('total_qty_sold')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                                        analyticsSortBy === 'total_qty_sold'
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                    }`}
                                >
                                    <span>Quantity Sold</span>
                                    <ArrowUpDown className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={() => toggleSort('total_revenue')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                                        analyticsSortBy === 'total_revenue'
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                    }`}
                                >
                                    <span>Sales Revenue</span>
                                    <ArrowUpDown className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* Table Render & Empty state handling */}
                        {analyticsData.items && analyticsData.items.length > 0 ? (
                            <DataTable
                                columns={analyticsColumns}
                                data={getSortedAnalyticsItems()}
                                loading={loading}
                                csvData={getSortedAnalyticsItems().map(i => [i.sku, i.name, i.category, i.unit_price, i.total_qty_sold, i.total_revenue, i.current_stock])}
                                csvHeaders={['SKU', 'Item Name', 'Category', 'Unit Price', 'Total Qty Sold', 'Total Sales Revenue', 'Current Stock Level']}
                                csvFileName={`item_analytics_${dateFrom}_to_${dateTo}.csv`}
                            />
                        ) : (
                            <div className="py-12 text-center space-y-3">
                                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Sales Recorded on Selected Date</h4>
                                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                    There were no item transactions found for {dateFrom === dateTo ? dateFrom : `${dateFrom} to ${dateTo}`}. Try selecting a different date range.
                                </p>
                            </div>
                        )}
                    </div>

                </div>
            )}

            {/* Displaying Reports: P&L TAB */}
            {activeTab === 'pnl' && (
                <div className="space-y-6">
                    {/* P&L Summaries Cards */}
                    {pnlData && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Gross Revenue</p>
                                <h3 className="text-lg font-extrabold mt-1 text-slate-800 dark:text-white">{formatCurrency(pnlData.revenue)}</h3>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cost of Goods (COGS)</p>
                                <h3 className="text-lg font-extrabold mt-1 text-slate-800 dark:text-white">{formatCurrency(pnlData.cogs)}</h3>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Overhead Expenses</p>
                                <h3 className="text-lg font-extrabold mt-1 text-rose-600">{formatCurrency(pnlData.expenses)}</h3>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Net Profit</p>
                                <h3 className={`text-lg font-extrabold mt-1 ${pnlData.net_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {formatCurrency(pnlData.net_profit)}
                                </h3>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Operating Margin</p>
                                <h3 className="text-lg font-extrabold mt-1 text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                    <Percent className="w-4 h-4" />
                                    <span>{pnlData.margin}%</span>
                                </h3>
                            </div>
                        </div>
                    )}

                    {/* Tables grid/stack */}
                    <div className="grid grid-cols-1 gap-6">
                        {/* Invoice Sales & Profit Table */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Invoice Sales & Profit Summary</h3>
                                <p className="text-xs text-slate-500">Sales invoices with item cost, tax deduction, and calculated net profit.</p>
                            </div>
                            <DataTable
                                columns={salesColumns}
                                data={salesReport.sales}
                                loading={loading}
                                csvData={salesReport.sales.map(s => {
                                    const totalCost = s.items?.reduce((sum, item) => sum + (parseFloat(item.product?.purchase_price || 0) * item.quantity), 0) || 0;
                                    const invoiceProfit = (parseFloat(s.payable_amount) - parseFloat(s.tax_amount)) - totalCost;
                                    return [s.invoice_number, s.customer?.name || 'Walk-In', s.sale_date, s.payable_amount, invoiceProfit, s.payment_method];
                                })}
                                csvHeaders={['Invoice Number', 'Customer', 'Date', 'Payable Amount', 'Net Profit', 'Payment Method']}
                                csvFileName={`sales_report_${dateFrom}_to_${dateTo}.csv`}
                            />
                        </div>

                        {/* Product-wise Sales & Profit Table */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Product-wise Sales & Profit Breakdown</h3>
                                <p className="text-xs text-slate-500">Aggregated quantities sold and generated profits for each unique garment type.</p>
                            </div>
                            <DataTable
                                columns={soldProductColumns}
                                data={getSoldProductsData()}
                                loading={loading}
                                csvData={getSoldProductsData().map(p => [p.name, p.sku, p.costPrice, p.qtySold, p.totalRevenue, p.totalCost, p.netProfit])}
                                csvHeaders={['Product Name', 'SKU', 'Cost Price', 'Quantity Sold', 'Total Revenue', 'Total Cost', 'Net Profit']}
                                csvFileName={`product_profit_report_${dateFrom}_to_${dateTo}.csv`}
                            />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'inventory' && (
                <div className="space-y-6">
                    {/* Valuations Summary */}
                    {inventoryReport.summary && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Items Stocked</p>
                                <h3 className="text-lg font-extrabold mt-1 text-slate-800 dark:text-white">{inventoryReport.summary.total_items} Units</h3>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cost Value (Capital Asset)</p>
                                <h3 className="text-lg font-extrabold mt-1 text-slate-800 dark:text-white">{formatCurrency(inventoryReport.summary.total_cost_value)}</h3>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Retail Value (Potential Revenue)</p>
                                <h3 className="text-lg font-extrabold mt-1 text-indigo-600">{formatCurrency(inventoryReport.summary.total_retail_value)}</h3>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Potential Profits</p>
                                <h3 className="text-lg font-extrabold mt-1 text-emerald-600">{formatCurrency(inventoryReport.summary.potential_profit)}</h3>
                            </div>
                        </div>
                    )}

                    <DataTable
                        columns={inventoryColumns}
                        data={inventoryReport.products}
                        loading={loading}
                        csvData={inventoryReport.products?.map(p => [p.name, p.sku, p.purchase_price, p.selling_price, p.quantity, p.quantity * p.purchase_price, p.quantity * p.selling_price])}
                        csvHeaders={['Product Name', 'SKU', 'Cost Price', 'Retail Price', 'Stock Qty', 'Total Cost Value', 'Total Retail Value']}
                        csvFileName="inventory_valuation_report.csv"
                    />
                </div>
            )}

            {activeTab === 'vendors' && (
                <DataTable
                    columns={vendorColumns}
                    data={vendorReport}
                    loading={loading}
                    csvData={vendorReport.map(v => [v.name, v.contact_person, v.total_orders, v.total_amount, v.total_paid, v.balance_due])}
                    csvHeaders={['Supplier Name', 'Contact Person', 'POs Count', 'Total Cost Amount', 'Total Paid Out', 'Balance Due']}
                    csvFileName="vendors_summary_report.csv"
                />
            )}

            {activeTab === 'cashiers' && (
                <DataTable
                    columns={cashierColumns}
                    data={cashierReport}
                    loading={loading}
                    csvData={cashierReport.map(c => [c.name, c.email, c.transactions, c.total_sales, c.avg_transaction_value])}
                    csvHeaders={['Cashier Name', 'Email', 'Transactions count', 'Total Revenue', 'Avg Ticket Value']}
                    csvFileName={`cashier_performance_${dateFrom}_to_${dateTo}.csv`}
                />
            )}

        </div>
    );
};

export default Reports;
