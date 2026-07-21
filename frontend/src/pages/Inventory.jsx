import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { Package, Plus, AlertTriangle, RefreshCw } from 'lucide-react';

const Inventory = () => {
    const [adjustments, setAdjustments] = useState([]);
    const [lowStockList, setLowStockList] = useState([]);
    const [products, setProducts] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({
        product_id: '',
        type: 'in',
        quantity: '',
        reason: '',
    });

    const fetchAdjustments = async (page = 1) => {
        setLoading(true);
        try {
            let url = `/inventory/adjustments?page=${page}&search=${search}&per_page=10`;
            if (typeFilter) url += `&type=${typeFilter}`;
            
            const response = await axios.get(url);
            if (response.data.status === 'success') {
                setAdjustments(response.data.data.data);
                setPagination({
                    current_page: response.data.data.current_page,
                    last_page: response.data.data.last_page,
                    total: response.data.data.total
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLowStock = async () => {
        try {
            const response = await axios.get('/inventory/low-stock');
            setLowStockList(response.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await axios.get('/pos/search?q=');
            setProducts(response.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchAdjustments();
    }, [search, typeFilter]);

    useEffect(() => {
        fetchLowStock();
        fetchProducts();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('/inventory/adjustments', form);
            if (response.data.status === 'success') {
                fetchAdjustments(1);
                fetchLowStock();
                setModalOpen(false);
                setForm({ product_id: '', type: 'in', quantity: '', reason: '' });
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error processing stock adjustment.');
        }
    };

    const typeBadges = {
        in: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450',
        out: 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-455',
        damaged: 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-455',
        returned: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-455',
        adjustment: 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-455',
    };

    const columns = [
        {
            header: 'Product Details',
            accessor: 'product',
            render: (val) => (
                <div>
                    <p className="font-bold text-slate-800 dark:text-white">{val?.name}</p>
                    {val?.size_stock && Object.keys(val.size_stock).length > 0 && (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                            Sizes: {Object.entries(val.size_stock).map(([sz, q]) => `${sz}: ${q}`).join(' | ')}
                        </p>
                    )}
                    {val?.colors && val.colors.length > 0 && (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                            Colors: {val.colors.join(', ')}
                        </p>
                    )}
                    <p className="text-[10px] text-slate-500 mt-0.5">SKU: {val?.sku}</p>
                </div>
            )
        },
        {
            header: 'Adjustment Type',
            accessor: 'type',
            render: (val) => (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${typeBadges[val] || 'bg-slate-100'}`}>
                    {val}
                </span>
            )
        },
        {
            header: 'Quantity',
            accessor: 'quantity',
            render: (val, row) => (
                <span className={`font-bold ${['in', 'returned'].includes(row.type) ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {['in', 'returned'].includes(row.type) ? '+' : '-'}{val} Units
                </span>
            )
        },
        { header: 'Logged Reason', accessor: 'reason', render: (val) => val || 'N/A' },
        { header: 'Cashier / Admin', accessor: 'user', render: (val) => val?.name || '-' },
        {
            header: 'Logged Date',
            accessor: 'created_at',
            render: (val) => new Date(val).toLocaleString()
        }
    ];

    return (
        <div className="space-y-6">
            
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Inventory Stock Logs</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Record stock adjustments, handle damaged items, customer returns, and track audit history.
                    </p>
                </div>
                <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition"
                >
                    <Plus className="w-4.5 h-4.5" />
                    <span>Log Adjustment</span>
                </button>
            </div>

            {/* Low stock alerts panel at the top */}
            {lowStockList.length > 0 && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/80 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold text-rose-850 dark:text-rose-455">Critical Stock Warning</h4>
                        <p className="text-xs text-rose-700 dark:text-rose-455 mt-0.5">
                            The following products are running low or out of stock: {lowStockList.map(p => {
                                const sizeStr = p.size_stock && Object.keys(p.size_stock).length > 0
                                    ? ` - Sizes: ${Object.entries(p.size_stock).map(([sz, q]) => `${sz}: ${q}`).join(', ')}`
                                    : '';
                                const colorStr = p.colors && p.colors.length > 0
                                    ? ` - Colors: ${p.colors.join(', ')}`
                                    : '';
                                return `${p.name} (${p.quantity} Left${sizeStr}${colorStr})`;
                            }).join(', ')}. Please coordinate restocks.
                        </p>
                    </div>
                </div>
            )}

            {/* Main Log Table */}
            <DataTable
                columns={columns}
                data={adjustments}
                loading={loading}
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search adjustments by product..."
                pagination={{
                    current_page: pagination.current_page,
                    last_page: pagination.last_page,
                    total: pagination.total,
                    onPageChange: (p) => fetchAdjustments(p)
                }}
                csvData={adjustments.map(ad => [ad.id, ad.product?.name, ad.product?.sku, ad.type, ad.quantity, ad.reason, ad.user?.name, ad.created_at])}
                csvHeaders={['ID', 'Product Name', 'SKU', 'Type', 'Quantity', 'Reason', 'User', 'Date']}
                csvFileName="inventory_adjustments.csv"
                filterComponent={
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                    >
                        <option value="">All Adjustment Types</option>
                        <option value="in">Stock In (Restock)</option>
                        <option value="out">Stock Out (Deductions)</option>
                        <option value="damaged">Damaged Products</option>
                        <option value="returned">Returned Goods</option>
                        <option value="adjustment">Manual Correction</option>
                    </select>
                }
            />

            {/* Modal: Log Adjustment */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Log Stock Adjustment">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Select Garment / SKU *</label>
                        <select
                            required
                            value={form.product_id}
                            onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                        >
                            <option value="">-- Choose Product --</option>
                            {products.map(p => {
                                const sizeStr = p.size_stock && Object.keys(p.size_stock).length > 0
                                    ? ` | Sizes: ${Object.entries(p.size_stock).map(([sz, q]) => `${sz}: ${q}`).join(', ')}`
                                    : '';
                                const colorStr = p.colors && p.colors.length > 0
                                    ? ` | Colors: ${p.colors.join(', ')}`
                                    : '';
                                return (
                                    <option key={p.id} value={p.id}>
                                        {p.name} (SKU: {p.sku} | Qty: {p.quantity}{sizeStr}{colorStr})
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Adjustment Type *</label>
                            <select
                                required
                                value={form.type}
                                onChange={(e) => setForm({ ...form, type: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                            >
                                <option value="in">Stock In (Restock)</option>
                                <option value="out">Stock Out (Deduction)</option>
                                <option value="damaged">Damaged Product</option>
                                <option value="returned">Customer Return</option>
                                <option value="adjustment">Manual Adjustment</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Quantity *</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={form.quantity}
                                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                                placeholder="Units"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Reason / Note *</label>
                        <textarea
                            required
                            value={form.reason}
                            onChange={(e) => setForm({ ...form, reason: e.target.value })}
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                            placeholder="State detail (e.g. Received shipment, fabric tear, sizing exchange)"
                            rows="3"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl hover:shadow-lg transition-all mt-2"
                    >
                        Apply Stock Adjustment
                    </button>
                </form>
            </Modal>

        </div>
    );
};

export default Inventory;
