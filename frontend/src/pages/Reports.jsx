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
    Percent
} from 'lucide-react';

const Reports = () => {
    const { formatCurrency } = useSettings();
    const [activeTab, setActiveTab] = useState('pnl');

    // Date range states (default to last 30 days)
    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

    // Data sets
    const [pnlData, setPnlData] = useState(null);
    const [salesReport, setSalesReport] = useState({ summary: {}, sales: [] });
    const [inventoryReport, setInventoryReport] = useState({ summary: {}, products: [] });
    const [vendorReport, setVendorReport] = useState([]);
    const [cashierReport, setCashierReport] = useState([]);
    const [loading, setLoading] = useState(false);

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
        if (activeTab === 'pnl') {
            fetchPnLAndSales();
        } else if (activeTab === 'inventory') {
            fetchInventoryReport();
        } else if (activeTab === 'vendors') {
            fetchVendorReport();
        } else if (activeTab === 'cashiers') {
            fetchCashierReport();
        }
    }, [activeTab, dateFrom, dateTo]);

    // Columns config
    const salesColumns = [
        { header: 'Invoice', accessor: 'invoice_number', render: (val) => <span className="font-bold">{val}</span> },
        { header: 'Customer', accessor: 'customer', render: (val) => val?.name || 'Walk-In' },
        { header: 'Date', accessor: 'sale_date', render: (val) => new Date(val).toLocaleDateString() },
        { header: 'Subtotal', accessor: 'total_amount', render: (val) => formatCurrency(val) },
        { header: 'Discount', accessor: 'discount_amount', render: (val) => <span className="text-red-500">-{formatCurrency(val)}</span> },
        { header: 'Tax Paid', accessor: 'tax_amount', render: (val) => formatCurrency(val) },
        { header: 'Payable Net', accessor: 'payable_amount', render: (val) => <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(val)}</span> },
        { header: 'Payment', accessor: 'payment_method', render: (val) => <span className="capitalize">{val?.replace('_', ' ')}</span> }
    ];

    const inventoryColumns = [
        { header: 'Garment Description', accessor: 'name', render: (val, row) => (
            <div>
                <p className="font-bold">{val}</p>
                <p className="text-[10px] text-slate-400">SKU: {row.sku} | Barcode: {row.barcode || '-'}</p>
            </div>
        )},
        { header: 'Cost Price', accessor: 'purchase_price', render: (val) => formatCurrency(val) },
        { header: 'Retail Price', accessor: 'selling_price', render: (val) => formatCurrency(val) },
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
                    <h1 className="text-2xl font-bold tracking-tight">Reports & Business Analytics</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Analyze revenues, cost of goods, net margins, cashier sheets, and inventory worth.
                    </p>
                </div>

                {/* Date Controls */}
                {activeTab !== 'inventory' && (
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-2xl shadow-sm self-start md:self-auto">
                        <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="bg-transparent border-none outline-none text-xs font-semibold focus:ring-0 w-28"
                        />
                        <span className="text-slate-400 text-xs font-bold">to</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="bg-transparent border-none outline-none text-xs font-semibold focus:ring-0 w-28"
                        />
                    </div>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
                {[
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
                            className={`flex items-center gap-2 pb-3 text-sm font-semibold transition border-b-2 ${
                                isAct
                                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                                    : 'border-transparent text-slate-550'
                            }`}
                        >
                            <Icon className="w-4.5 h-4.5" />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Displaying Reports */}
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

                    {/* Sales detailed data */}
                    <DataTable
                        columns={salesColumns}
                        data={salesReport.sales}
                        loading={loading}
                        csvData={salesReport.sales.map(s => [s.invoice_number, s.customer?.name || 'Walk-In', s.sale_date, s.payable_amount, s.payment_method])}
                        csvHeaders={['Invoice Number', 'Customer', 'Date', 'Payable Amount', 'Payment Method']}
                        csvFileName={`sales_report_${dateFrom}_to_${dateTo}.csv`}
                    />
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
