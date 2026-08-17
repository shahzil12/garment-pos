import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { useSettings } from '../context/SettingsContext';
import { Plus, Edit, Trash2, Truck, FileText, DollarSign, Trash } from 'lucide-react';

const Vendors = () => {
    const { formatCurrency } = useSettings();
    const [activeTab, setActiveTab] = useState('vendors');
    
    // Core data lists
    const [vendors, setVendors] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

    // Modals
    const [vendorModalOpen, setVendorModalOpen] = useState(false);
    const [poModalOpen, setPoModalOpen] = useState(false);
    const [payModalOpen, setPayModalOpen] = useState(false);
    
    // Editing states
    const [editingVendor, setEditingVendor] = useState(null);
    const [selectedPO, setSelectedPO] = useState(null);

    // Form states
    const [vendorForm, setVendorForm] = useState({ name: '', contact_person: '', email: '', phone: '', address: '' });
    const [poForm, setPoForm] = useState({ vendor_id: '', order_date: '', items: [{ product_id: '', quantity: 1, unit_price: 0 }] });
    const [payForm, setPayForm] = useState({ vendor_id: '', purchase_order_id: '', amount: '', payment_date: '', payment_method: 'Cheque', note: '' });

    // Load data based on tab
    const fetchVendors = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/vendors?search=${search}`);
            setVendors(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPurchaseOrders = async (page = 1) => {
        setLoading(true);
        try {
            const res = await axios.get(`/vendors/purchase-orders?page=${page}&per_page=10`);
            setPurchaseOrders(res.data.data.data);
            setPagination({
                current_page: res.data.data.current_page,
                last_page: res.data.data.last_page,
                total: res.data.data.total
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await axios.get('/pos/search?q=');
            setProducts(res.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (activeTab === 'vendors') {
            fetchVendors();
        } else if (activeTab === 'pos') {
            fetchPurchaseOrders();
        }
    }, [activeTab, search]);

    useEffect(() => {
        fetchProducts();
        fetchVendors();
    }, []);

    // Vendor CRUD
    const handleVendorSubmit = async (e) => {
        e.preventDefault();
        try {
            let res;
            if (editingVendor) {
                res = await axios.put(`/vendors/${editingVendor.id}`, vendorForm);
            } else {
                res = await axios.post('/vendors', vendorForm);
            }
            if (res.data.status === 'success') {
                fetchVendors();
                setVendorModalOpen(false);
                setEditingVendor(null);
                setVendorForm({ name: '', contact_person: '', email: '', phone: '', address: '' });
            }
        } catch (err) {
            alert('Failed to save vendor.');
        }
    };

    const startVendorEdit = (v) => {
        setEditingVendor(v);
        setVendorForm({ name: v.name, contact_person: v.contact_person || '', email: v.email || '', phone: v.phone || '', address: v.address || '' });
        setVendorModalOpen(true);
    };

    const deleteVendor = async (id) => {
        if (!confirm('Are you sure you want to delete this vendor?')) return;
        try {
            await axios.delete(`/vendors/${id}`);
            fetchVendors();
        } catch (err) {
            alert('Failed to delete vendor.');
        }
    };

    // Purchase Order Items management
    const addPoRow = () => {
        setPoForm({
            ...poForm,
            items: [...poForm.items, { product_id: '', quantity: 1, unit_price: 0 }]
        });
    };

    const removePoRow = (idx) => {
        const items = [...poForm.items];
        items.splice(idx, 1);
        setPoForm({ ...poForm, items });
    };

    const updatePoItem = (idx, field, value) => {
        const items = [...poForm.items];
        items[idx][field] = value;

        // Auto-populate purchase price when product changes
        if (field === 'product_id') {
            const prod = products.find(p => p.id === parseInt(value));
            if (prod) {
                items[idx].unit_price = parseFloat(prod.purchase_price);
            }
        }

        setPoForm({ ...poForm, items });
    };

    const handlePoSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/vendors/purchase-orders', poForm);
            if (res.data.status === 'success') {
                fetchPurchaseOrders();
                setPoModalOpen(false);
                setPoForm({ vendor_id: '', order_date: '', items: [{ product_id: '', quantity: 1, unit_price: 0 }] });
            }
        } catch (err) {
            alert('Error creating purchase order. Validate all rows.');
        }
    };

    const handlePOStatusUpdate = async (poId, newStatus) => {
        try {
            const res = await axios.post(`/vendors/purchase-orders/${poId}/status`, { status: newStatus });
            if (res.data.status === 'success') {
                fetchPurchaseOrders(pagination.current_page);
                setSelectedPO(null);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update status.');
        }
    };

    // Payment submit
    const handlePaySubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/vendors/payments', payForm);
            if (res.data.status === 'success') {
                fetchPurchaseOrders(pagination.current_page);
                setPayModalOpen(false);
                setPayForm({ vendor_id: '', purchase_order_id: '', amount: '', payment_date: '', payment_method: 'Cheque', note: '' });
            }
        } catch (err) {
            alert('Failed to log payment.');
        }
    };

    const startPaymentLog = (po) => {
        setPayForm({
            vendor_id: po.vendor_id,
            purchase_order_id: po.id,
            amount: (parseFloat(po.total_amount) - parseFloat(po.paid_amount)).toFixed(2),
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: 'Bank Transfer',
            note: `Payment for PO #${po.id}`
        });
        setPayModalOpen(true);
    };

    // Column layouts
    const vendorCols = [
        { header: 'Vendor Name', accessor: 'name', render: (val) => <span className="font-bold">{val}</span> },
        { header: 'Contact Person', accessor: 'contact_person' },
        { header: 'Email Address', accessor: 'email', render: (val) => val || '-' },
        { header: 'Phone', accessor: 'phone', render: (val) => val || '-' },
        { header: 'Office Address', accessor: 'address', render: (val) => val || '-' },
        { header: 'Total Orders', accessor: 'purchase_orders_count' },
        {
            header: 'Actions',
            accessor: 'id',
            render: (val, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => startVendorEdit(row)}
                        className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-550 hover:text-indigo-600"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => deleteVendor(val)}
                        className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-550 hover:text-red-500"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ];

    const poCols = [
        { header: 'Order Ref ID', accessor: 'id', render: (val) => <span className="font-bold">PO #{val}</span> },
        { header: 'Vendor Name', accessor: 'vendor', render: (val) => val?.name },
        { header: 'Order Date', accessor: 'order_date' },
        {
            header: 'Delivery Status',
            accessor: 'status',
            render: (val, row) => {
                const colors = {
                    pending: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
                    ordered: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400',
                    received: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450',
                    cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-455',
                };
                return (
                    <button
                        onClick={() => setSelectedPO(row)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors[val] || 'bg-slate-100'}`}
                    >
                        {val}
                    </button>
                );
            }
        },
        { header: 'Total Bill', accessor: 'total_amount', render: (val) => formatCurrency(val) },
        { header: 'Paid Amount', accessor: 'paid_amount', render: (val) => formatCurrency(val) },
        {
            header: 'Payment Status',
            accessor: 'payment_status',
            render: (val, row) => {
                const colors = {
                    unpaid: 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-450',
                    partial: 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-455',
                    paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450',
                };
                return (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors[val]}`}>
                        {val}
                    </span>
                );
            }
        },
        {
            header: 'Actions',
            accessor: 'id',
            render: (val, row) => (
                <div className="flex items-center gap-2">
                    {row.payment_status !== 'paid' && (
                        <button
                            onClick={() => startPaymentLog(row)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                        >
                            Pay Balance
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            
            {/* Page Headers */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Vendors & Purchases</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Record purchase orders, verify supplier inventories, and handle vendor payments.
                    </p>
                </div>
                
                <div>
                    {activeTab === 'vendors' && (
                        <button
                            onClick={() => { setEditingVendor(null); setVendorModalOpen(true); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition"
                        >
                            <Plus className="w-4.5 h-4.5" />
                            <span>Add Vendor</span>
                        </button>
                    )}
                    {activeTab === 'pos' && (
                        <button
                            onClick={() => setPoModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition"
                        >
                            <Plus className="w-4.5 h-4.5" />
                            <span>Create PO</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
                <button
                    onClick={() => setActiveTab('vendors')}
                    className={`flex items-center gap-2 pb-3 text-sm font-semibold transition border-b-2 ${
                        activeTab === 'vendors' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold' : 'border-transparent text-slate-550'
                    }`}
                >
                    <Truck className="w-4.5 h-4.5" />
                    <span>Vendor Directory</span>
                </button>
                <button
                    onClick={() => setActiveTab('pos')}
                    className={`flex items-center gap-2 pb-3 text-sm font-semibold transition border-b-2 ${
                        activeTab === 'pos' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold' : 'border-transparent text-slate-550'
                    }`}
                >
                    <FileText className="w-4.5 h-4.5" />
                    <span>Purchase Orders</span>
                </button>
            </div>

            {/* Tab content display */}
            {activeTab === 'vendors' && (
                <DataTable
                    columns={vendorCols}
                    data={vendors}
                    loading={loading}
                    search={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search vendors..."
                />
            )}

            {activeTab === 'pos' && (
                <DataTable
                    columns={poCols}
                    data={purchaseOrders}
                    loading={loading}
                    pagination={{
                        current_page: pagination.current_page,
                        last_page: pagination.last_page,
                        total: pagination.total,
                        onPageChange: (p) => fetchPurchaseOrders(p)
                    }}
                />
            )}

            {/* Modal: Vendor CRUD */}
            <Modal
                isOpen={vendorModalOpen}
                onClose={() => setVendorModalOpen(false)}
                title={editingVendor ? 'Edit Supplier' : 'Register Supplier'}
            >
                <form onSubmit={handleVendorSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Company / Vendor Name *</label>
                        <input
                            type="text"
                            required
                            value={vendorForm.name}
                            onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                            placeholder="Indigo Fabrics"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Contact Person</label>
                            <input
                                type="text"
                                value={vendorForm.contact_person}
                                onChange={(e) => setVendorForm({ ...vendorForm, contact_person: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                                placeholder="Manager Name"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Phone Number</label>
                            <input
                                type="text"
                                value={vendorForm.phone}
                                onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                                placeholder="555-0199"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Email Address</label>
                        <input
                            type="email"
                            value={vendorForm.email}
                            onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                            placeholder="supplier@company.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Vendor Warehouse Address</label>
                        <textarea
                            value={vendorForm.address}
                            onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                            placeholder="Full address..."
                            rows="2"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition"
                    >
                        Save Vendor
                    </button>
                </form>
            </Modal>

            {/* Modal: Create Purchase Order */}
            <Modal
                isOpen={poModalOpen}
                onClose={() => setPoModalOpen(false)}
                title="Create Purchase Order (Stock Inflow)"
                size="lg"
            >
                <form onSubmit={handlePoSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Select Supplier *</label>
                            <select
                                required
                                value={poForm.vendor_id}
                                onChange={(e) => setPoForm({ ...poForm, vendor_id: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                            >
                                <option value="">-- Choose Vendor --</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Order Date *</label>
                            <input
                                type="date"
                                required
                                value={poForm.order_date}
                                onChange={(e) => setPoForm({ ...poForm, order_date: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Dynamic Items Rows */}
                    <div className="space-y-2.5 border-t dark:border-slate-800 pt-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Garments Ordered</h4>
                            <button
                                type="button"
                                onClick={addPoRow}
                                className="px-2.5 py-1.5 border border-indigo-500 text-indigo-500 dark:border-indigo-400 dark:text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-50 transition"
                            >
                                Add Row
                            </button>
                        </div>

                        {poForm.items.map((item, idx) => (
                            <div key={idx} className="flex gap-3 items-end">
                                <div className="flex-1">
                                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Product</label>
                                    <select
                                        required
                                        value={item.product_id}
                                        onChange={(e) => updatePoItem(idx, 'product_id', e.target.value)}
                                        className="w-full px-3 py-1.5 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-xs focus:outline-none"
                                    >
                                        <option value="">-- Select --</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>)}
                                    </select>
                                </div>
                                <div className="w-24">
                                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Qty</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => updatePoItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-1.5 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-xs text-center focus:outline-none"
                                    />
                                </div>
                                <div className="w-28">
                                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Unit Cost</label>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        min="0"
                                        value={item.unit_price}
                                        onChange={(e) => updatePoItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                                        className="w-full px-3 py-1.5 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-xs text-right focus:outline-none"
                                    />
                                </div>
                                <button
                                    type="button"
                                    disabled={poForm.items.length === 1}
                                    onClick={() => removePoRow(idx)}
                                    className="p-2 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-red-500 rounded-xl disabled:opacity-30 disabled:hover:text-slate-400"
                                >
                                    <Trash className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg mt-4"
                    >
                        Draft Purchase Order
                    </button>
                </form>
            </Modal>

            {/* Modal: Status Detail PO */}
            <Modal
                isOpen={selectedPO !== null}
                onClose={() => setSelectedPO(null)}
                title={selectedPO ? `Purchase Order Details (PO #${selectedPO.id})` : ''}
                size="lg"
            >
                {selectedPO && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <p><strong>Supplier:</strong> {selectedPO.vendor?.name}</p>
                            <p><strong>Order Date:</strong> {selectedPO.order_date}</p>
                            <p><strong>Status:</strong> <span className="uppercase font-bold">{selectedPO.status}</span></p>
                            <p><strong>Payment Status:</strong> <span className="uppercase font-bold">{selectedPO.payment_status}</span></p>
                        </div>

                        <div className="border-t dark:border-slate-800 pt-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-500">Ordered Items</h4>
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b dark:border-slate-800 font-bold bg-slate-50 dark:bg-slate-900/50">
                                        <th className="p-2">Item</th>
                                        <th className="p-2 text-center">Quantity</th>
                                        <th className="p-2 text-right">Cost Price</th>
                                        <th className="p-2 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-slate-850">
                                    {selectedPO.items?.map((item) => (
                                        <tr key={item.id}>
                                            <td className="p-2 font-semibold">{item.product?.name}</td>
                                            <td className="p-2 text-center">{item.quantity}</td>
                                            <td className="p-2 text-right">{formatCurrency(item.unit_price)}</td>
                                            <td className="p-2 text-right">{formatCurrency(item.total_price)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="text-right font-bold text-sm mt-3 pr-2">
                                Total Amount: {formatCurrency(selectedPO.total_amount)}
                            </div>
                        </div>

                        {selectedPO.status !== 'received' && selectedPO.status !== 'cancelled' && (
                            <div className="border-t dark:border-slate-800 pt-4 flex justify-end gap-3">
                                <button
                                    onClick={() => handlePOStatusUpdate(selectedPO.id, 'cancelled')}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold"
                                >
                                    Cancel Order
                                </button>
                                <button
                                    onClick={() => handlePOStatusUpdate(selectedPO.id, 'received')}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/10"
                                >
                                    Receive Order (Update Inventory Stock)
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Modal: Log Payment */}
            <Modal isOpen={payModalOpen} onClose={() => setPayModalOpen(false)} title="Log Supplier Payment">
                <form onSubmit={handlePaySubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 font-semibold">Payment Date *</label>
                        <input
                            type="date"
                            required
                            value={payForm.payment_date}
                            onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 font-semibold">Amount *</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={payForm.amount}
                                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none text-right font-bold text-indigo-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 font-semibold">Method *</label>
                            <select
                                required
                                value={payForm.payment_method}
                                onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none font-semibold text-slate-700"
                            >
                                <option value="Cheque">Cheque</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Cash">Cash</option>
                                <option value="Card">Card</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 font-semibold">Note / Memo</label>
                        <input
                            type="text"
                            value={payForm.note}
                            onChange={(e) => setPayForm({ ...payForm, note: e.target.value })}
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                            placeholder="Cheque Ref / Bank receipt details..."
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold shadow-md"
                    >
                        Record Payment
                    </button>
                </form>
            </Modal>

        </div>
    );
};

export default Vendors;
