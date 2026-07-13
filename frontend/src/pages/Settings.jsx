import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import { useSettings } from '../context/SettingsContext';
import { Settings as SettingsIcon, Database, Download, Trash, RefreshCw, Upload } from 'lucide-react';

const Settings = () => {
    const { settings: globalSettings, refreshSettings, updateSettingsState } = useSettings();
    
    // Forms
    const [shopForm, setShopForm] = useState({
        shop_name: '',
        currency_symbol: '',
        tax_rate: '',
        shop_email: '',
        shop_phone: '',
        shop_address: '',
        receipt_header: '',
        receipt_footer: '',
        cashier_can_access_dashboard: '1',
        cashier_can_access_pos: '1',
        cashier_can_access_products: '1',
        cashier_can_access_customers: '1',
        cashier_can_access_invoices: '1',
    });

    const [backups, setBackups] = useState([]);
    const [loadingBackups, setLoadingBackups] = useState(false);
    const [submittingSettings, setSubmittingSettings] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [backupLoading, setBackupLoading] = useState(false);

    // Sync state with global context on mount
    useEffect(() => {
        if (globalSettings) {
            setShopForm({
                shop_name: globalSettings.shop_name || '',
                currency_symbol: globalSettings.currency_symbol || '',
                tax_rate: globalSettings.tax_rate || '',
                shop_email: globalSettings.shop_email || '',
                shop_phone: globalSettings.shop_phone || '',
                shop_address: globalSettings.shop_address || '',
                receipt_header: globalSettings.receipt_header || '',
                receipt_footer: globalSettings.receipt_footer || '',
                cashier_can_access_dashboard: globalSettings.cashier_can_access_dashboard !== undefined ? globalSettings.cashier_can_access_dashboard : '1',
                cashier_can_access_pos: globalSettings.cashier_can_access_pos !== undefined ? globalSettings.cashier_can_access_pos : '1',
                cashier_can_access_products: globalSettings.cashier_can_access_products !== undefined ? globalSettings.cashier_can_access_products : '1',
                cashier_can_access_customers: globalSettings.cashier_can_access_customers !== undefined ? globalSettings.cashier_can_access_customers : '1',
                cashier_can_access_invoices: globalSettings.cashier_can_access_invoices !== undefined ? globalSettings.cashier_can_access_invoices : '1',
            });
        }
    }, [globalSettings]);

    const fetchBackups = async () => {
        setLoadingBackups(true);
        try {
            const response = await axios.get('/backups');
            setBackups(response.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingBackups(false);
        }
    };

    useEffect(() => {
        fetchBackups();
    }, []);

    // Update settings submit
    const handleSettingsSubmit = async (e) => {
        e.preventDefault();
        setSubmittingSettings(true);
        try {
            const response = await axios.post('/settings', { settings: shopForm });
            if (response.data.status === 'success') {
                updateSettingsState(response.data.data);
                alert('Shop configurations updated successfully!');
                refreshSettings();
            }
        } catch (err) {
            alert('Failed to save settings.');
        } finally {
            setSubmittingSettings(false);
        }
    };

    // Trigger backup
    const handleCreateBackup = async () => {
        setBackupLoading(true);
        try {
            const response = await axios.post('/backups');
            if (response.data.status === 'success') {
                fetchBackups();
                alert(`Backup created successfully: ${response.data.data}`);
            }
        } catch (err) {
            alert('Database backup creation failed.');
        } finally {
            setBackupLoading(false);
        }
    };

    // Download backup file
    const downloadBackupFile = (filename) => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
        window.open(`${apiUrl}/backups/${filename}?token=${localStorage.getItem('token')}`, '_blank');
    };

    // Delete backup
    const deleteBackupFile = async (filename) => {
        if (!confirm(`Are you sure you want to delete backup file: ${filename}?`)) return;
        try {
            const response = await axios.delete(`/backups/${filename}`);
            if (response.data.status === 'success') {
                fetchBackups();
            }
        } catch (err) {
            alert('Failed to delete backup file.');
        }
    };

    // Restore backup
    const handleRestoreUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm('WARNING: Restoring the database will overwrite your current configuration and all transaction histories. Proceed?')) return;

        setRestoring(true);
        const formData = new FormData();
        formData.append('backup_file', file);

        try {
            const response = await axios.post('/backups/restore', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (response.data.status === 'success') {
                alert('Database restored successfully! Reloading...');
                window.location.reload();
            }
        } catch (err) {
            alert('Database restore failed. Validate the SQL backup file.');
        } finally {
            setRestoring(false);
            e.target.value = null; // Clear input
        }
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = 2;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const backupCols = [
        { header: 'File Name', accessor: 'filename', render: (val) => <span className="font-semibold text-xs">{val}</span> },
        { header: 'File Size', accessor: 'size', render: (val) => formatBytes(val) },
        { header: 'Created On', accessor: 'last_modified' },
        {
            header: 'Actions',
            accessor: 'filename',
            render: (val) => (
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => downloadBackupFile(val)}
                        className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-650"
                        title="Download SQL"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => deleteBackupFile(val)}
                        className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-550 hover:text-red-500"
                        title="Delete Backup"
                    >
                        <Trash className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            
            {/* Headers */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">System Configuration</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Customize shop invoice details, taxes, currency codes, and manage database backup/restore operations.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Side: Shop Info (7 cols) */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                    <form onSubmit={handleSettingsSubmit} className="space-y-4">
                        <h3 className="text-base font-bold flex items-center gap-2 border-b dark:border-slate-800 pb-3 text-slate-800 dark:text-white">
                            <SettingsIcon className="w-5 h-5 text-indigo-500" />
                            <span>Shop Details & Invoicing</span>
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Shop Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={shopForm.shop_name}
                                    onChange={(e) => setShopForm({ ...shopForm, shop_name: e.target.value })}
                                    className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Currency *</label>
                                    <input
                                        type="text"
                                        required
                                        value={shopForm.currency_symbol}
                                        onChange={(e) => setShopForm({ ...shopForm, currency_symbol: e.target.value })}
                                        className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm text-center font-bold focus:outline-none"
                                        placeholder="Rs."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tax Rate (%) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={shopForm.tax_rate}
                                        onChange={(e) => setShopForm({ ...shopForm, tax_rate: e.target.value })}
                                        className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm text-center font-bold focus:outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Contact Phone</label>
                                <input
                                    type="text"
                                    value={shopForm.shop_phone}
                                    onChange={(e) => setShopForm({ ...shopForm, shop_phone: e.target.value })}
                                    className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Contact Email</label>
                                <input
                                    type="email"
                                    value={shopForm.shop_email}
                                    onChange={(e) => setShopForm({ ...shopForm, shop_email: e.target.value })}
                                    className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Shop Address</label>
                            <textarea
                                value={shopForm.shop_address}
                                onChange={(e) => setShopForm({ ...shopForm, shop_address: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none"
                                rows="2"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Receipt Header Greeting</label>
                                <input
                                    type="text"
                                    value={shopForm.receipt_header}
                                    onChange={(e) => setShopForm({ ...shopForm, receipt_header: e.target.value })}
                                    className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none"
                                    placeholder="Welcome to our store!"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Receipt Footer Note</label>
                                <input
                                    type="text"
                                    value={shopForm.receipt_footer}
                                    onChange={(e) => setShopForm({ ...shopForm, receipt_footer: e.target.value })}
                                    className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none"
                                    placeholder="Thank you for shopping!"
                                />
                            </div>
                        </div>

                        {/* Cashier Sidebar Permissions */}
                        <div className="border-t dark:border-slate-800 pt-4 mt-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Cashier Menu Permissions</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border dark:border-slate-850">
                                {[
                                    { key: 'cashier_can_access_dashboard', label: 'Dashboard Access' },
                                    { key: 'cashier_can_access_pos', label: 'POS Screen Access' },
                                    { key: 'cashier_can_access_products', label: 'Products Catalog Access' },
                                    { key: 'cashier_can_access_customers', label: 'Customers List Access' },
                                    { key: 'cashier_can_access_invoices', label: 'Invoices History Access' },
                                ].map((perm) => (
                                    <label key={perm.key} className="flex items-center gap-3 cursor-pointer select-none py-1">
                                        <input
                                            type="checkbox"
                                            checked={shopForm[perm.key] === '1'}
                                            onChange={(e) => setShopForm({
                                                ...shopForm,
                                                [perm.key]: e.target.checked ? '1' : '0'
                                            })}
                                            className="w-4 h-4 rounded text-indigo-650 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                        />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-350">{perm.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submittingSettings}
                            className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                        >
                            {submittingSettings ? 'Updating...' : 'Save Configurations'}
                        </button>
                    </form>
                </div>

                {/* Right Side: Backups & Restore (5 cols) */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                    <div>
                        <h3 className="text-base font-bold flex items-center justify-between border-b dark:border-slate-800 pb-3 text-slate-800 dark:text-white">
                            <div className="flex items-center gap-2">
                                <Database className="w-5 h-5 text-indigo-500" />
                                <span>Database Backups</span>
                            </div>
                            <button
                                onClick={handleCreateBackup}
                                disabled={backupLoading}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm transition"
                            >
                                {backupLoading ? 'Backing up...' : 'Create Backup'}
                            </button>
                        </h3>

                        {/* Backups list */}
                        <div className="mt-4">
                            <DataTable
                                columns={backupCols}
                                data={backups}
                                loading={loadingBackups}
                            />
                        </div>
                    </div>

                    {/* Restore Area */}
                    <div className="border-t dark:border-slate-800 pt-4 space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Upload className="w-4 h-4 text-indigo-500" />
                            <span>Restore Database Schema</span>
                        </h4>
                        
                        <div className="flex items-center gap-3">
                            <label className="flex-1 px-4 py-3 border border-dashed border-slate-350 dark:border-slate-800 rounded-2xl cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-950/20 text-center flex flex-col items-center justify-center gap-1 transition">
                                <Upload className="w-6 h-6 text-slate-400" />
                                <span className="text-xs font-bold text-slate-650 dark:text-slate-350">
                                    {restoring ? 'Restoring configuration...' : 'Upload .sql backup archive'}
                                </span>
                                <input
                                    type="file"
                                    accept=".sql"
                                    disabled={restoring}
                                    onChange={handleRestoreUpload}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Settings;
