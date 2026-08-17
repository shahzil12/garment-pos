import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { useSettings } from '../context/SettingsContext';
import { Plus, Edit, Trash2, DollarSign, Layers } from 'lucide-react';

const Expenses = () => {
    const { formatCurrency } = useSettings();
    const [activeTab, setActiveTab] = useState('expenses');

    // Data sets
    const [expenses, setExpenses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

    // Modals
    const [expenseModalOpen, setExpenseModalOpen] = useState(false);
    const [catModalOpen, setCatModalOpen] = useState(false);

    // Edit states
    const [editingExpense, setEditingExpense] = useState(null);
    const [editingCategory, setEditingCategory] = useState(null);

    // Form fields
    const [expenseForm, setExpenseForm] = useState({ expense_category_id: '', amount: '', date: '', description: '' });
    const [catForm, setCatForm] = useState({ name: '' });

    const fetchExpenses = async (page = 1) => {
        setLoading(true);
        try {
            let url = `/expenses?page=${page}&search=${search}&per_page=10`;
            if (categoryFilter) url += `&expense_category_id=${categoryFilter}`;
            if (dateFrom && dateTo) url += `&date_from=${dateFrom}&date_to=${dateTo}`;
            
            const res = await axios.get(url);
            setExpenses(res.data.data.data);
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

    const fetchCategories = async () => {
        try {
            const res = await axios.get('/expenses/categories');
            setCategories(res.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (activeTab === 'expenses') {
            fetchExpenses();
        } else {
            fetchCategories();
        }
    }, [activeTab, search, categoryFilter, dateFrom, dateTo]);

    useEffect(() => {
        fetchCategories();
    }, []);

    // Expense CRUD
    const handleExpenseSubmit = async (e) => {
        e.preventDefault();
        try {
            let res;
            if (editingExpense) {
                res = await axios.put(`/expenses/${editingExpense.id}`, expenseForm);
            } else {
                res = await axios.post('/expenses', expenseForm);
            }
            if (res.data.status === 'success') {
                fetchExpenses(pagination.current_page);
                setExpenseModalOpen(false);
                setEditingExpense(null);
                setExpenseForm({ expense_category_id: '', amount: '', date: '', description: '' });
            }
        } catch (err) {
            alert('Failed to save expense details.');
        }
    };

    const startExpenseEdit = (exp) => {
        setEditingExpense(exp);
        setExpenseForm({
            expense_category_id: exp.expense_category_id,
            amount: exp.amount,
            date: exp.date,
            description: exp.description || ''
        });
        setExpenseModalOpen(true);
    };

    const deleteExpense = async (id) => {
        if (!confirm('Are you sure you want to delete this expense record?')) return;
        try {
            await axios.delete(`/expenses/${id}`);
            fetchExpenses(pagination.current_page);
        } catch (err) {
            alert('Error deleting expense.');
        }
    };

    // Category CRUD
    const handleCategorySubmit = async (e) => {
        e.preventDefault();
        try {
            let res;
            if (editingCategory) {
                res = await axios.put(`/expenses/categories/${editingCategory.id}`, catForm);
            } else {
                res = await axios.post('/expenses/categories', catForm);
            }
            if (res.data.status === 'success') {
                fetchCategories();
                setCatModalOpen(false);
                setEditingCategory(null);
                setCatForm({ name: '' });
            }
        } catch (err) {
            alert('Failed to save expense category.');
        }
    };

    const startCategoryEdit = (cat) => {
        setEditingCategory(cat);
        setCatForm({ name: cat.name });
        setCatModalOpen(true);
    };

    const deleteCategory = async (id) => {
        if (!confirm('Are you sure you want to delete this category? All expenses linked to it will also be deleted.')) return;
        try {
            await axios.delete(`/expenses/categories/${id}`);
            fetchCategories();
        } catch (err) {
            alert('Error deleting category.');
        }
    };

    const expenseCols = [
        { header: 'Date', accessor: 'date' },
        { header: 'Expense Category', accessor: 'category', render: (val) => val?.name || '-' },
        { header: 'Description / Note', accessor: 'description', render: (val) => val || '-' },
        { header: 'Amount spent', accessor: 'amount', render: (val) => <span className="font-bold text-rose-600 dark:text-rose-455">{formatCurrency(val)}</span> },
        {
            header: 'Actions',
            accessor: 'id',
            render: (val, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => startExpenseEdit(row)}
                        className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-550 hover:text-indigo-600"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => deleteExpense(val)}
                        className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-550 hover:text-red-500"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ];

    const categoryCols = [
        { header: 'Category Name', accessor: 'name', render: (val) => <span className="font-bold">{val}</span> },
        { header: 'Logged Count', accessor: 'expenses_count' },
        {
            header: 'Actions',
            accessor: 'id',
            render: (val, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => startCategoryEdit(row)}
                        className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-555 hover:text-indigo-605"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => deleteCategory(val)}
                        className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-555 hover:text-red-500"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            
            {/* Headers */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Shop Expenses Ledger</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Track daily overheads, rent, salaries, packaging materials, and marketing costs.
                    </p>
                </div>
                
                <div>
                    {activeTab === 'expenses' ? (
                        <button
                            onClick={() => { setEditingExpense(null); setExpenseModalOpen(true); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md transition"
                        >
                            <Plus className="w-4.5 h-4.5" />
                            <span>Log Expense</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => { setEditingCategory(null); setCatModalOpen(true); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md transition"
                        >
                            <Plus className="w-4.5 h-4.5" />
                            <span>Add Category</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
                <button
                    onClick={() => setActiveTab('expenses')}
                    className={`flex items-center gap-2 pb-3 text-sm font-semibold transition border-b-2 ${
                        activeTab === 'expenses' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold' : 'border-transparent text-slate-550'
                    }`}
                >
                    <DollarSign className="w-4.5 h-4.5" />
                    <span>Expenses Ledger</span>
                </button>
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`flex items-center gap-2 pb-3 text-sm font-semibold transition border-b-2 ${
                        activeTab === 'categories' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold' : 'border-transparent text-slate-550'
                    }`}
                >
                    <Layers className="w-4.5 h-4.5" />
                    <span>Expense Categories</span>
                </button>
            </div>

            {/* View renders */}
            {activeTab === 'expenses' ? (
                <DataTable
                    columns={expenseCols}
                    data={expenses}
                    loading={loading}
                    search={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search descriptions..."
                    pagination={{
                        current_page: pagination.current_page,
                        last_page: pagination.last_page,
                        total: pagination.total,
                        onPageChange: (p) => fetchExpenses(p)
                    }}
                    csvData={expenses.map(ex => [ex.id, ex.date, ex.category?.name, ex.description, ex.amount])}
                    csvHeaders={['ID', 'Date', 'Category', 'Description', 'Amount']}
                    csvFileName="expenses_ledger.csv"
                    filterComponent={
                        <div className="flex gap-2 flex-wrap items-center">
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                            >
                                <option value="">All Categories</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="px-3 py-2 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                            />
                            <span className="text-xs text-slate-400">to</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="px-3 py-2 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                            />
                        </div>
                    }
                />
            ) : (
                <DataTable
                    columns={categoryCols}
                    data={categories}
                    search={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search categories..."
                />
            )}

            {/* Modal: Expense Log */}
            <Modal
                isOpen={expenseModalOpen}
                onClose={() => setExpenseModalOpen(false)}
                title={editingExpense ? 'Edit Expense Record' : 'Log New Expense'}
            >
                <form onSubmit={handleExpenseSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Date *</label>
                            <input
                                type="date"
                                required
                                value={expenseForm.date}
                                onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Expense Category *</label>
                            <select
                                required
                                value={expenseForm.expense_category_id}
                                onChange={(e) => setExpenseForm({ ...expenseForm, expense_category_id: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none"
                            >
                                <option value="">-- Choose Category --</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Amount Spent *</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={expenseForm.amount}
                            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none text-right font-bold text-rose-600"
                            placeholder="0.00"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Description / Memo</label>
                        <textarea
                            value={expenseForm.description}
                            onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none"
                            placeholder="Additional details (e.g. landlord receipt ref, wages name)"
                            rows="2"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
                    >
                        Save Record
                    </button>
                </form>
            </Modal>

            {/* Modal: Category */}
            <Modal
                isOpen={catModalOpen}
                onClose={() => setCatModalOpen(false)}
                title={editingCategory ? 'Edit Category' : 'Add Expense Category'}
            >
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Category Name *</label>
                        <input
                            type="text"
                            required
                            value={catForm.name}
                            onChange={(e) => setCatForm({ name: e.target.value })}
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                            placeholder="E.g. Electricity & Utilities"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition"
                    >
                        Save Category
                    </button>
                </form>
            </Modal>

        </div>
    );
};

export default Expenses;
