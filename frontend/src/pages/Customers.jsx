import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { useSettings } from '../context/SettingsContext';
import { Plus, Edit, Trash2, User, Phone, Mail, Award, History } from 'lucide-react';

const Customers = () => {
    const { formatCurrency } = useSettings();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    
    const [modalOpen, setModalOpen] = useState(false);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [selectedCustomerDetail, setSelectedCustomerDetail] = useState(null);

    const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/customers?search=${search}`);
            if (response.data.status === 'success') {
                setCustomers(response.data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, [search]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let res;
            if (editingCustomer) {
                res = await axios.put(`/customers/${editingCustomer.id}`, form);
            } else {
                res = await axios.post('/customers', form);
            }
            if (res.data.status === 'success') {
                fetchCustomers();
                setModalOpen(false);
                setEditingCustomer(null);
                setForm({ name: '', phone: '', email: '', address: '' });
            }
        } catch (err) {
            alert('Failed to save customer details. Ensure unique details.');
        }
    };

    const startEdit = (c) => {
        setEditingCustomer(c);
        setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '' });
        setModalOpen(true);
    };

    const deleteCustomer = async (id) => {
        if (!confirm('Are you sure you want to delete this customer?')) return;
        try {
            const res = await axios.delete(`/customers/${id}`);
            if (res.data.status === 'success') {
                fetchCustomers();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete customer.');
        }
    };

    const viewDetails = async (id) => {
        try {
            const response = await axios.get(`/customers/${id}`);
            if (response.data.status === 'success') {
                setSelectedCustomerDetail(response.data.data);
                setDetailModalOpen(true);
            }
        } catch (err) {
            alert('Failed to load profile.');
        }
    };

    const columns = [
        {
            header: 'Customer Details',
            accessor: 'name',
            render: (val, row) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                        {val.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-bold text-slate-800 dark:text-white leading-snug">{val}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{row.phone || 'No phone number'}</p>
                    </div>
                </div>
            )
        },
        { header: 'Email Address', accessor: 'email', render: (val) => val || '-' },
        { header: 'Home Address', accessor: 'address', render: (val) => val || '-' },
        {
            header: 'Loyalty Points',
            accessor: 'loyalty_points',
            render: (val) => (
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
                    <Award className="w-4 h-4" />
                    <span>{val} Pts</span>
                </div>
            )
        },
        {
            header: 'Actions',
            accessor: 'id',
            render: (val, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => viewDetails(val)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-250 border dark:border-slate-700 rounded-lg text-xs font-semibold"
                    >
                        View History
                    </button>
                    {row.id !== 1 && (
                        <>
                            <button
                                onClick={() => startEdit(row)}
                                className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-550 hover:text-indigo-600"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => deleteCustomer(val)}
                                className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-550 hover:text-red-500"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Customer Database</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Manage customer accounts, loyalty schemes, and track buyer logs.
                    </p>
                </div>
                <button
                    onClick={() => { setEditingCustomer(null); setModalOpen(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition"
                >
                    <Plus className="w-4.5 h-4.5" />
                    <span>Register Customer</span>
                </button>
            </div>

            {/* List */}
            <DataTable
                columns={columns}
                data={customers}
                loading={loading}
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search by name, phone or email..."
            />

            {/* Modal: Add/Edit Customer */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingCustomer ? 'Edit Customer Info' : 'Register New Customer'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Customer Full Name *</label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                            placeholder="Rachel Green"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Phone Number</label>
                            <input
                                type="text"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                                placeholder="E.g. +1 555 123 4567"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Email Address</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                                placeholder="E.g. rachel@fashion.com"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Home Address</label>
                        <textarea
                            value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                            placeholder="Home / billing location..."
                            rows="3"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition"
                    >
                        Save Profile
                    </button>
                </form>
            </Modal>

            {/* Modal: Customer Details & History */}
            <Modal
                isOpen={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                title={selectedCustomerDetail ? `${selectedCustomerDetail.name}'s Purchasing Profile` : ''}
                size="lg"
            >
                {selectedCustomerDetail && (
                    <div className="space-y-6">
                        {/* Profile Summary Panel */}
                        <div className="grid grid-cols-3 gap-4 p-4 border dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 text-center">
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Orders</p>
                                <p className="text-xl font-bold mt-1 text-slate-800 dark:text-white">
                                    {selectedCustomerDetail.sales?.length || 0} Sales
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Loyalty Level</p>
                                <p className="text-xl font-bold mt-1 text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1">
                                    <Award className="w-5 h-5" />
                                    <span>{selectedCustomerDetail.loyalty_points} Pts</span>
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Value</p>
                                <p className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-450">
                                    {formatCurrency(
                                        selectedCustomerDetail.sales
                                            ?.filter(s => s.status === 'completed')
                                            .reduce((sum, s) => sum + parseFloat(s.payable_amount), 0) || 0
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Transactions List */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <History className="w-4.5 h-4.5" />
                                <span>Recent Purchase History</span>
                            </h4>
                            <div className="overflow-x-auto border dark:border-slate-800 rounded-2xl">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-bold uppercase">
                                            <th className="p-3">Invoice ID</th>
                                            <th className="p-3">Sale Date</th>
                                            <th className="p-3">Payment Method</th>
                                            <th className="p-3 text-right">Amount</th>
                                            <th className="p-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-slate-850">
                                        {selectedCustomerDetail.sales?.length > 0 ? (
                                            selectedCustomerDetail.sales.map((sale) => (
                                                <tr key={sale.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10">
                                                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-350">{sale.invoice_number}</td>
                                                    <td className="p-3 text-slate-500">{new Date(sale.sale_date).toLocaleDateString()}</td>
                                                    <td className="p-3 text-slate-600 capitalize">{sale.payment_method?.replace('_', ' ')}</td>
                                                    <td className="p-3 text-right font-bold text-slate-800 dark:text-white">{formatCurrency(sale.payable_amount)}</td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                                            sale.status === 'completed'
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20'
                                                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20'
                                                        }`}>
                                                            {sale.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="p-4 text-center text-slate-400">
                                                    No transactions recorded.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

        </div>
    );
};

export default Customers;
