import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { Package, Plus, AlertTriangle, Layers, ListFilter } from 'lucide-react';

const Inventory = () => {
    const [activeTab, setActiveTab] = useState('grouped'); // 'grouped' or 'logs'
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
            const response = await axios.get('/products?per_page=100');
            if (response.data.status === 'success') {
                setProducts(response.data.data.data || []);
            }
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
                fetchProducts();
                setModalOpen(false);
                setForm({ product_id: '', type: 'in', quantity: '', reason: '' });
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error processing stock adjustment.');
        }
    };

    // Helper to extract variations (Color + Size) for a product
    const getProductVariations = (p) => {
        // 1. Check explicit variation_stock (Color + Size matrix)
        if (p.variation_stock && Object.keys(p.variation_stock).length > 0) {
            return Object.entries(p.variation_stock).map(([combination, qty]) => ({
                variationName: combination,
                quantity: parseInt(qty) || 0
            }));
        }

        // 2. Check if sizes and colors arrays both exist
        const sizes = Array.isArray(p.sizes) ? p.sizes : (p.sizes ? p.sizes.split(',').map(s => s.trim()) : []);
        const colors = Array.isArray(p.colors) ? p.colors : (p.colors ? p.colors.split(',').map(c => c.trim()) : []);

        if (sizes.length > 0 && colors.length > 0) {
            const list = [];
            colors.forEach(col => {
                sizes.forEach(sz => {
                    const key = `${col} - ${sz}`;
                    const qty = p.size_stock?.[sz] ?? p.color_stock?.[col] ?? 0;
                    list.push({ variationName: key, quantity: parseInt(qty) || 0 });
                });
            });
            return list;
        }

        // 3. Size-only variations
        if (p.size_stock && Object.keys(p.size_stock).length > 0) {
            return Object.entries(p.size_stock).map(([sz, qty]) => ({
                variationName: `Size: ${sz}`,
                quantity: parseInt(qty) || 0
            }));
        }

        // 4. Color-only variations
        if (p.color_stock && Object.keys(p.color_stock).length > 0) {
            return Object.entries(p.color_stock).map(([col, qty]) => ({
                variationName: `Color: ${col}`,
                quantity: parseInt(qty) || 0
            }));
        }

        return [{ variationName: 'Standard (No Variation)', quantity: p.quantity || 0 }];
    };

    // Group products by Category -> Product -> Variation
    const getGroupedInventory = () => {
        const categoriesMap = {};

        products.forEach(p => {
            const catName = p.category?.name || 'Uncategorized';
            if (!categoriesMap[catName]) {
                categoriesMap[catName] = [];
            }

            const variations = getProductVariations(p);

            categoriesMap[catName].push({
                id: p.id,
                name: p.name,
                sku: p.sku,
                totalQuantity: p.quantity,
                variations: variations
            });
        });

        return categoriesMap;
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
                    {val?.variation_stock && Object.keys(val.variation_stock).length > 0 && (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                            Variations: {Object.entries(val.variation_stock).map(([v, q]) => `${v}: ${q}`).join(' | ')}
                        </p>
                    )}
                    {val?.size_stock && Object.keys(val.size_stock).length > 0 && !val?.variation_stock && (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                            Sizes: {Object.entries(val.size_stock).map(([sz, q]) => `${sz}: ${q}`).join(' | ')}
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

    const groupedInventory = getGroupedInventory();

    return (
        <div className="space-y-6">
            
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Inventory & Variations Management</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Categorized stock inventory grouped by Color & Size variations, plus audit adjustment logs.
                    </p>
                </div>
                <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition self-start sm:self-auto"
                >
                    <Plus className="w-4.5 h-4.5" />
                    <span>Log Adjustment</span>
                </button>
            </div>

            {/* Low stock alerts panel */}
            {lowStockList.length > 0 && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/80 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold text-rose-850 dark:text-rose-455">Critical Stock Warning</h4>
                        <p className="text-xs text-rose-700 dark:text-rose-455 mt-0.5">
                            The following products are running low or out of stock: {lowStockList.map(p => `${p.name} (${p.quantity} Left)`).join(', ')}. Please coordinate restocks.
                        </p>
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
                <button
                    onClick={() => setActiveTab('grouped')}
                    className={`flex items-center gap-2 pb-3 text-sm font-semibold transition border-b-2 ${
                        activeTab === 'grouped'
                            ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Layers className="w-4 h-4" />
                    <span>Category & Variation Stock View</span>
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`flex items-center gap-2 pb-3 text-sm font-semibold transition border-b-2 ${
                        activeTab === 'logs'
                            ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <ListFilter className="w-4 h-4" />
                    <span>Stock Adjustment Logs</span>
                </button>
            </div>

            {/* TAB 1: Category > Product Name > Variation [Color/Size] > Available Quantity */}
            {activeTab === 'grouped' && (
                <div className="space-y-6">
                    {Object.keys(groupedInventory).length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">No products found in inventory.</div>
                    ) : (
                        Object.entries(groupedInventory).map(([categoryName, prodList]) => (
                            <div key={categoryName} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
                                <div className="flex items-center gap-2 border-b dark:border-slate-800 pb-3">
                                    <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    <h3 className="text-base font-extrabold tracking-tight text-slate-800 dark:text-white uppercase">{categoryName}</h3>
                                    <span className="ml-auto px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-full">
                                        {prodList.length} Product(s)
                                    </span>
                                </div>

                                <div className="space-y-4 divide-y dark:divide-slate-800">
                                    {prodList.map(prod => (
                                        <div key={prod.id} className="pt-4 first:pt-0 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">{prod.name}</h4>
                                                    <p className="text-xs text-slate-400">SKU: <span className="font-mono">{prod.sku}</span></p>
                                                </div>
                                                <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-lg">
                                                    Total Available: {prod.totalQuantity} Units
                                                </span>
                                            </div>

                                            {/* Variation Breakdown Table */}
                                            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3">
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Variation Breakdown (Color / Size)</p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                                    {prod.variations.map((v, vIdx) => (
                                                        <div key={vIdx} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex justify-between items-center text-xs">
                                                            <span className="font-semibold text-slate-700 dark:text-slate-300">{v.variationName}</span>
                                                            <span className={`font-bold px-1.5 py-0.5 rounded ${
                                                                v.quantity <= 0 
                                                                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30' 
                                                                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30'
                                                            }`}>
                                                                {v.quantity} Units
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* TAB 2: Stock Adjustment Logs */}
            {activeTab === 'logs' && (
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
            )}

            {/* Modal: Log Adjustment */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Log Stock Adjustment">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Select Garment / SKU *</label>
                        <select
                            required
                            value={form.product_id}
                            onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none"
                        >
                            <option value="">-- Choose Product --</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} (SKU: {p.sku} | Qty: {p.quantity})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Adjustment Type *</label>
                            <select
                                required
                                value={form.type}
                                onChange={(e) => setForm({ ...form, type: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none"
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
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none"
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
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none"
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
