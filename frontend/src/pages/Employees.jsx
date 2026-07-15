import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { Plus, Edit, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';

const Employees = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);

    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'cashier' });

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/employees');
            if (response.data.status === 'success') {
                setEmployees(response.data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let res;
            if (editingEmployee) {
                res = await axios.put(`/employees/${editingEmployee.id}`, form);
            } else {
                res = await axios.post('/employees', form);
            }
            if (res.data.status === 'success') {
                fetchEmployees();
                setModalOpen(false);
                setEditingEmployee(null);
                setForm({ name: '', email: '', password: '', role: 'cashier' });
            }
        } catch (err) {
            alert('Failed to save account. Check email is unique.');
        }
    };

    const handleToggleStatus = async (id) => {
        try {
            const res = await axios.post(`/employees/${id}/toggle-status`);
            if (res.data.status === 'success') {
                fetchEmployees();
            }
        } catch (err) {
            alert('Failed to toggle status.');
        }
    };

    const startEdit = (emp) => {
        setEditingEmployee(emp);
        setForm({ name: emp.name, email: emp.email, password: '', role: emp.role || 'cashier' }); // keep pass blank
        setModalOpen(true);
    };

    const columns = [
        {
            header: 'Name',
            accessor: 'name',
            render: (val, row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                        {val.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-bold">{val}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{row.role}</p>
                    </div>
                </div>
            )
        },
        { header: 'Email Address', accessor: 'email' },
        {
            header: 'Status',
            accessor: 'is_active',
            render: (val) => (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    val
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20'
                        : 'bg-red-50 text-red-750 dark:bg-red-950/20'
                }`}>
                    {val ? 'Active' : 'Suspended'}
                </span>
            )
        },
        {
            header: 'Created On',
            accessor: 'created_at',
            render: (val) => new Date(val).toLocaleDateString()
        },
        {
            header: 'Actions',
            accessor: 'id',
            render: (val, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => startEdit(row)}
                        className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-550 hover:text-indigo-600"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleToggleStatus(val)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                            row.is_active
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-450'
                        }`}
                    >
                        {row.is_active ? 'Suspend' : 'Activate'}
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Create staff credentials, activate or suspend staff access, and audit log histories.
                    </p>
                </div>
                <button
                    onClick={() => { setEditingEmployee(null); setForm({ name: '', email: '', password: '', role: 'cashier' }); setModalOpen(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md transition"
                >
                    <Plus className="w-4.5 h-4.5" />
                    <span>Create Staff Member</span>
                </button>
            </div>

            {/* List */}
            <DataTable
                columns={columns}
                data={employees}
                loading={loading}
            />

            {/* Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingEmployee ? 'Edit Staff Account' : 'Register New Staff Member'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Full Name *</label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                            placeholder="Jane Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Email Address *</label>
                        <input
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                            placeholder="jane@shop.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Role *</label>
                        <select
                            value={form.role}
                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                        >
                            <option value="cashier">Cashier</option>
                            <option value="manager">Manager</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                            {editingEmployee ? 'Password (Leave blank to keep current)' : 'Password *'}
                        </label>
                        <input
                            type="password"
                            required={!editingEmployee}
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                            placeholder="Min 6 characters"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition"
                    >
                        Save Account
                    </button>
                </form>
            </Modal>

        </div>
    );
};

export default Employees;
