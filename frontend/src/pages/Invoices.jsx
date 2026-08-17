import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import html2canvas from 'html2canvas-pro';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { FileText, Eye, Printer, RotateCcw, X, AlertTriangle, Edit3, Plus, Trash2, Save, Search } from 'lucide-react';

const Invoices = () => {
    const { formatCurrency, settings } = useSettings();
    const { user } = useAuth();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [printType, setPrintType] = useState('thermal'); // 'thermal' or 'a4'
    const [modalTab, setModalTab] = useState('invoice');

    const fetchInvoices = async (page = 1) => {
        setLoading(true);
        try {
            let url = `/pos/invoices?page=${page}&search=${search}&per_page=10`;
            if (dateFrom && dateTo) {
                url += `&date_from=${dateFrom}&date_to=${dateTo}`;
            }
            const response = await axios.get(url);
            if (response.data.status === 'success') {
                setInvoices(response.data.data.data);
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

    useEffect(() => {
        fetchInvoices();
    }, [search, dateFrom, dateTo]);

    const viewInvoiceDetails = async (id) => {
        try {
            const response = await axios.get(`/pos/invoices/${id}`);
            if (response.data.status === 'success') {
                setSelectedInvoice(response.data.data);
                setModalTab('invoice');
            }
        } catch (err) {
            alert('Failed to load invoice details.');
        }
    };

    const handleRefund = async (invoiceId) => {
        if (!confirm('Are you sure you want to refund this invoice? All sold garment items will be returned to store inventory.')) return;
        try {
            const response = await axios.post(`/pos/invoices/${invoiceId}/refund`);
            if (response.data.status === 'success') {
                fetchInvoices(pagination.current_page);
                setSelectedInvoice(null);
                alert('Invoice has been refunded and garment stock restored!');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to refund invoice.');
        }
    };

    const triggerPrint = () => {
        window.print();
    };

    // RBAC check for editing invoice line items
    const canEditInvoice = ['admin', 'manager', 'cashier'].includes(user?.role?.toLowerCase() || '');

    // Line-item editing state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [editItems, setEditItems] = useState([]);
    const [editDiscountAmount, setEditDiscountAmount] = useState(0);
    const [editTaxAmount, setEditTaxAmount] = useState(0);
    const [prodSearchQuery, setProdSearchQuery] = useState('');
    const [prodSearchResults, setProdSearchResults] = useState([]);
    const [isSearchingProds, setIsSearchingProds] = useState(false);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const openEditModal = async (invoiceId) => {
        if (!canEditInvoice) {
            alert('Unauthorized: Only Admins, Managers, and Cashiers can edit invoices.');
            return;
        }
        try {
            const response = await axios.get(`/pos/invoices/${invoiceId}`);
            if (response.data.status === 'success') {
                const inv = response.data.data;
                setEditingInvoice(inv);
                setEditTaxAmount(parseFloat(inv.tax_amount) || 0);
                setEditItems(
                    (inv.items || []).map(item => ({
                        product_id: item.product_id,
                        name: item.product?.name || 'Product',
                        sku: item.product?.sku || '',
                        quantity: item.quantity,
                        unit_price: parseFloat(item.unit_price) || 0,
                        original_price: parseFloat(item.original_price) || parseFloat(item.unit_price) || 0,
                        discount: parseFloat(item.discount) / (item.quantity || 1) || 0,
                        tax: parseFloat(item.tax) || 0,
                        size: item.size || '',
                        color: item.color || '',
                    }))
                );
                setIsEditModalOpen(true);
            }
        } catch (err) {
            alert('Failed to load invoice for editing.');
        }
    };

    const searchProducts = async (q) => {
        setProdSearchQuery(q);
        if (!q.trim()) {
            setProdSearchResults([]);
            return;
        }
        setIsSearchingProds(true);
        try {
            const res = await axios.get(`/pos/search?q=${encodeURIComponent(q)}`);
            if (res.data.status === 'success') {
                setProdSearchResults(res.data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearchingProds(false);
        }
    };

    const addProductToEdit = (prod) => {
        const existingIdx = editItems.findIndex(i => i.product_id === prod.id);
        if (existingIdx >= 0) {
            updateEditItem(existingIdx, 'quantity', editItems[existingIdx].quantity + 1);
        } else {
            setEditItems([
                ...editItems,
                {
                    product_id: prod.id,
                    name: prod.name,
                    sku: prod.sku,
                    quantity: 1,
                    unit_price: parseFloat(prod.price) || 0,
                    original_price: parseFloat(prod.price) || 0,
                    discount: 0,
                    tax: 0,
                    size: '',
                    color: '',
                }
            ]);
        }
        setProdSearchQuery('');
        setProdSearchResults([]);
    };

    const updateEditItem = (index, field, value) => {
        const updated = [...editItems];
        updated[index] = { ...updated[index], [field]: value };
        setEditItems(updated);
    };

    const removeEditItem = (index) => {
        if (editItems.length <= 1) {
            alert('An invoice must contain at least one line item.');
            return;
        }
        setEditItems(editItems.filter((_, i) => i !== index));
    };

    const calculateEditTotals = () => {
        const itemsSubtotal = editItems.reduce((acc, item) => {
            const q = parseInt(item.quantity) || 0;
            const p = parseFloat(item.unit_price) || 0;
            const d = parseFloat(item.discount) || 0;
            return acc + Math.max(0, (p - d) * q);
        }, 0);
        const tax = parseFloat(editTaxAmount) || 0;
        const payable = Math.max(0, itemsSubtotal + tax);
        return { itemsSubtotal, tax, payable };
    };

    const handleSaveInvoiceItems = async () => {
        if (editItems.length === 0) {
            alert('Cannot save an empty invoice.');
            return;
        }

        setIsSavingEdit(true);
        try {
            const totalItemDiscount = editItems.reduce((sum, item) => {
                const q = parseInt(item.quantity) || 0;
                const d = parseFloat(item.discount) || 0;
                return sum + (d * q);
            }, 0);

            const payload = {
                items: editItems.map(item => ({
                    product_id: item.product_id,
                    quantity: parseInt(item.quantity) || 1,
                    unit_price: parseFloat(item.unit_price) || 0,
                    original_price: parseFloat(item.original_price) || parseFloat(item.unit_price) || 0,
                    discount: parseFloat(item.discount) || 0,
                    tax: parseFloat(item.tax) || 0,
                    size: item.size || null,
                    color: item.color || null,
                })),
                discount_amount: totalItemDiscount,
                tax_amount: parseFloat(editTaxAmount) || 0,
            };

            const response = await axios.put(`/pos/invoices/${editingInvoice.id}/items`, payload);
            if (response.data.status === 'success') {
                alert('Invoice line items updated & totals recalculated successfully!');
                setIsEditModalOpen(false);
                fetchInvoices(pagination.current_page);
                
                try {
                    const freshRes = await axios.get(`/pos/invoices/${editingInvoice.id}`);
                    if (freshRes.data.status === 'success') {
                        setSelectedInvoice(freshRes.data.data);
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update invoice line items.');
        } finally {
            setIsSavingEdit(false);
        }
    };

    const [sharingWhatsApp, setSharingWhatsApp] = useState(false);

    const shareInvoiceOnWhatsApp = async () => {
        const element = document.getElementById('printable-area');
        if (!element) return;

        setSharingWhatsApp(true);
        try {
            // Calculate dynamic total canvas height based on line items and scroll dimensions
            const itemCount = selectedInvoice?.items?.length || 0;
            const isThermal = printType === 'thermal';
            const headerHeight = isThermal ? 120 : 220;
            const itemRowHeight = isThermal ? 36 : 45;
            const footerHeight = isThermal ? 140 : 160;
            const calculatedMinHeight = headerHeight + (itemCount * itemRowHeight) + footerHeight;
            const totalHeight = Math.max(element.scrollHeight, element.offsetHeight, calculatedMinHeight);

            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: true,
                height: totalHeight,
                windowHeight: totalHeight,
                scrollY: 0,
                scrollX: 0,
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.getElementById('printable-area');
                    if (clonedElement) {
                        clonedElement.style.height = `${totalHeight}px`;
                        clonedElement.style.minHeight = `${totalHeight}px`;
                        clonedElement.style.maxHeight = 'none';
                        clonedElement.style.overflow = 'visible';
                    }
                }
            });

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    alert('Failed to generate invoice image (empty canvas blob).');
                    setSharingWhatsApp(false);
                    return;
                }

                const file = new File([blob], `invoice_${selectedInvoice.invoice_number}.png`, { type: 'image/png' });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: `Invoice ${selectedInvoice.invoice_number}`,
                            text: `Here is your invoice from ${settings.shop_name}`,
                        });
                        setSharingWhatsApp(false);
                        return;
                    } catch (shareErr) {
                        console.log('Native share failed:', shareErr);
                    }
                }

                try {
                    const data = [new ClipboardItem({ 'image/png': blob })];
                    await navigator.clipboard.write(data);
                    alert(`Invoice image copied to clipboard! \n\nPlease paste (Ctrl+V) in WhatsApp to send.`);
                } catch (clipErr) {
                    console.error('Clipboard copy failed:', clipErr);
                }

                const text = `${settings.shop_name} Receipt ${selectedInvoice?.invoice_number}: Total ${formatCurrency(selectedInvoice?.payable_amount)}`;
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                setSharingWhatsApp(false);
            }, 'image/png');
        } catch (err) {
            console.error('Failed to capture invoice:', err);
            alert(`Failed to generate invoice image: ${err.message || err}`);
            setSharingWhatsApp(false);
        }
    };

    const columns = [
        { header: 'Invoice Code', accessor: 'invoice_number', render: (val) => <span className="font-bold">{val}</span> },
        { header: 'Customer', accessor: 'customer', render: (val) => val?.name || 'Walk-In Customer' },
        { header: 'Date & Time', accessor: 'sale_date', render: (val) => new Date(val).toLocaleString() },
        { header: 'Payable Net', accessor: 'payable_amount', render: (val) => formatCurrency(val) },
        { header: 'Payment', accessor: 'payment_method', render: (val) => <span className="capitalize">{val?.replace('_', ' ')}</span> },
        {
            header: 'Status',
            accessor: 'status',
            render: (val) => (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    val === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20'
                }`}>
                    {val}
                </span>
            )
        },
        {
            header: 'Actions',
            accessor: 'id',
            render: (val, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => viewInvoiceDetails(val)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                    </button>
                    {row.status === 'completed' && canEditInvoice && (
                        <button
                            onClick={() => openEditModal(val)}
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200 dark:border-amber-900 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                            title="Edit Invoice Products & Line Items"
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Items</span>
                        </button>
                    )}
                    {row.status === 'completed' && (
                        <button
                            onClick={() => handleRefund(val)}
                            className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-950/20 rounded-lg text-slate-500 hover:text-red-600 transition"
                            title="Refund & Restock"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Sales Invoice Directory</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Audit purchase receipts, manage returns, download transaction PDF formats.
                </p>
            </div>

            {/* Invoices List with Date Range Filters */}
            <DataTable
                columns={columns}
                data={invoices}
                loading={loading}
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search by invoice number..."
                pagination={{
                    current_page: pagination.current_page,
                    last_page: pagination.last_page,
                    total: pagination.total,
                    onPageChange: (p) => fetchInvoices(p)
                }}
                csvData={invoices.map(inv => [inv.id, inv.invoice_number, inv.customer?.name || 'Walk-In', inv.sale_date, inv.payable_amount, inv.payment_method, inv.status])}
                csvHeaders={['ID', 'Invoice Number', 'Customer', 'Date', 'Payable Amount', 'Payment Method', 'Status']}
                csvFileName="sales_invoices.csv"
                filterComponent={
                    <div className="flex gap-2 flex-wrap items-center">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                        />
                        <span className="text-xs text-slate-400">to</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
                        />
                    </div>
                }
            />

            {/* Modal: View Invoice Details & Printable View */}
            <Modal
                isOpen={selectedInvoice !== null}
                onClose={() => {
                    setSelectedInvoice(null);
                    setModalTab('invoice');
                }}
                title={selectedInvoice ? `Invoice details: ${selectedInvoice.invoice_number}` : ''}
                size="lg"
            >
                {selectedInvoice && (
                    <div className="space-y-6">
                        
                        {/* Refund warning if voided */}
                        {selectedInvoice.status === 'refunded' && (
                            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
                                <AlertTriangle className="w-4.5 h-4.5" />
                                <span className="font-bold">VOIDED / REFUNDED: Garments in this invoice have been restocked.</span>
                            </div>
                        )}

                        {/* Format selector */}
                        <div className="flex justify-center border-b dark:border-slate-800 pb-3">
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                <button
                                    onClick={() => setPrintType('thermal')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        printType === 'thermal' ? 'bg-white dark:bg-slate-900 shadow-sm font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
                                    }`}
                                >
                                    Thermal Receipt
                                </button>
                                <button
                                    onClick={() => setPrintType('a4')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        printType === 'a4' ? 'bg-white dark:bg-slate-900 shadow-sm font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
                                    }`}
                                >
                                    A4 Invoice
                                </button>
                            </div>
                        </div>

                        {/* Invoice preview box */}
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl flex justify-center overflow-y-auto min-h-fit h-auto max-h-[70vh]">
                            {printType === 'thermal' ? (
                                /* Thermal Receipt Layout (80mm width standard) */
                                <div id="printable-area" className="w-[300px] h-auto min-h-fit bg-white text-black p-4 text-xs font-mono border border-dashed border-slate-300">
                                    <div className="text-center space-y-1 border-b border-dashed border-black pb-2">
                                        <h3 className="text-base font-bold uppercase">{settings.shop_name}</h3>
                                        <p className="text-[10px]">{settings.shop_address}</p>
                                        <p className="text-[10px]">Ph: {settings.shop_phone}</p>
                                    </div>
                                    <div className="py-2 space-y-0.5 border-b border-dashed border-black text-[10px]">
                                        <p><strong>INVOICE:</strong> {selectedInvoice.invoice_number}</p>
                                        <p><strong>DATE:</strong> {new Date(selectedInvoice.sale_date).toLocaleString()}</p>
                                        <p><strong>CASHIER:</strong> {selectedInvoice.user?.name || 'N/A'}</p>
                                        <p><strong>CUSTOMER:</strong> {selectedInvoice.customer?.name || 'Walk-In Customer'}</p>
                                    </div>
                                    <table className="w-full text-[10px] my-2">
                                        <thead>
                                            <tr className="border-b border-black text-left">
                                                <th className="pb-1">Item</th>
                                                <th className="pb-1 text-center">Qty</th>
                                                <th className="pb-1 text-right">Price</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedInvoice.items?.map((item) => {
                                                const originalPrice = parseFloat(item.original_price);
                                                const unitPrice = parseFloat(item.unit_price);
                                                const hasDiscount = !isNaN(originalPrice) && originalPrice > unitPrice;
                                                return (
                                                    <tr key={item.id}>
                                                        <td className="py-1">
                                                            {item.product?.name}
                                                            <span className="block text-[8px] text-slate-555">
                                                                {item.size || '-'}/{item.color || '-'} • @ {hasDiscount && <span className="line-through mr-1 text-slate-400">{formatCurrency(originalPrice)}</span>}{formatCurrency(unitPrice)}
                                                            </span>
                                                        </td>
                                                        <td className="py-1 text-center">{item.quantity}</td>
                                                        <td className="py-1 text-right">{formatCurrency(item.subtotal)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    <div className="border-t border-dashed border-black pt-2 space-y-1 text-right text-[10px]">
                                        <p>Subtotal: {formatCurrency(parseFloat(selectedInvoice.payable_amount) - parseFloat(selectedInvoice.tax_amount) + parseFloat(selectedInvoice.discount_amount))}</p>
                                        <p>Discount: -{formatCurrency(selectedInvoice.discount_amount)}</p>
                                        <p>Tax: {formatCurrency(selectedInvoice.tax_amount)}</p>
                                        <p className="text-xs font-bold">Total: {formatCurrency(selectedInvoice.payable_amount)}</p>
                                    </div>
                                    <div className="text-center pt-4 border-t border-dashed border-black text-[9px] mt-3">
                                        <p>{settings.receipt_footer || 'Thank you for shopping!'}</p>
                                    </div>
                                </div>
                            ) : (
                                /* A4 Invoice Layout */
                                <div id="printable-area" className="w-[595px] h-auto min-h-fit bg-white text-black p-6 text-xs border border-slate-300 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start border-b pb-4 mb-4">
                                            <div>
                                                <h2 className="text-lg font-bold uppercase tracking-wider">{settings.shop_name}</h2>
                                                <p className="text-slate-500 mt-1">{settings.shop_address}</p>
                                                <p className="text-slate-550">Phone: {settings.shop_phone} | Email: {settings.shop_email}</p>
                                            </div>
                                            <div className="text-right">
                                                <h3 className="text-xl font-extrabold text-slate-400">INVOICE</h3>
                                                <p className="font-semibold mt-1">Ref: {selectedInvoice.invoice_number}</p>
                                                <p className="text-slate-550">Date: {new Date(selectedInvoice.sale_date).toLocaleDateString()}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6 mb-6">
                                            <div>
                                                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Billed To:</h4>
                                                <p className="font-bold">{selectedInvoice.customer?.name || 'Walk-In Customer'}</p>
                                                {selectedInvoice.customer && (
                                                    <div className="text-slate-500 space-y-0.5 mt-1">
                                                        <p>Ph: {selectedInvoice.customer.phone || 'N/A'}</p>
                                                        <p>Email: {selectedInvoice.customer.email || 'N/A'}</p>
                                                        <p>Addr: {selectedInvoice.customer.address || 'N/A'}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Payment Method:</h4>
                                                <p className="font-bold capitalize">{selectedInvoice.payment_method?.replace('_', ' ')}</p>
                                                <p className="text-slate-550 mt-1">Status: Paid In Full</p>
                                            </div>
                                        </div>

                                        <table className="w-full text-left border-collapse mb-6">
                                            <thead>
                                                <tr className="border-b border-slate-300 font-bold bg-slate-50">
                                                    <th className="p-2">Item / Variant</th>
                                                    <th className="p-2 text-center">SKU</th>
                                                    <th className="p-2 text-center">Qty</th>
                                                    <th className="p-2 text-right">Price</th>
                                                    <th className="p-2 text-right">Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y border-b">
                                                {selectedInvoice.items?.map((item) => {
                                                    const originalPrice = parseFloat(item.original_price);
                                                    const unitPrice = parseFloat(item.unit_price);
                                                    const hasDiscount = !isNaN(originalPrice) && originalPrice > unitPrice;
                                                    return (
                                                        <tr key={item.id}>
                                                            <td className="p-2">
                                                                <span className="font-bold">{item.product?.name}</span>
                                                                <span className="block text-[10px] text-slate-555 mt-0.5">Size: {item.size || 'N/A'} | Color: {item.color || 'N/A'}</span>
                                                            </td>
                                                            <td className="p-2 text-center text-slate-500">{item.product?.sku}</td>
                                                            <td className="p-2 text-center">{item.quantity}</td>
                                                            <td className="p-2 text-right">
                                                                {hasDiscount && <span className="line-through text-xs text-slate-400 mr-2">{formatCurrency(originalPrice)}</span>}
                                                                {formatCurrency(unitPrice)}
                                                            </td>
                                                            <td className="p-2 text-right">{formatCurrency(item.subtotal)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <div className="w-1/2">
                                            <p className="text-[10px] italic text-slate-400">Notes: {selectedInvoice.notes || 'No special notes.'}</p>
                                        </div>
                                        <div className="w-1/3 space-y-1.5 text-right font-medium">
                                            <div className="flex justify-between">
                                                <span className="text-slate-555">Subtotal:</span>
                                                <span>{formatCurrency(parseFloat(selectedInvoice.payable_amount) - parseFloat(selectedInvoice.tax_amount) + parseFloat(selectedInvoice.discount_amount))}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-555">Discount:</span>
                                                <span className="text-red-500">-{formatCurrency(selectedInvoice.discount_amount)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-555">GST/Tax:</span>
                                                <span>{formatCurrency(selectedInvoice.tax_amount)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm font-bold border-t pt-1.5">
                                                <span>Total:</span>
                                                <span>{formatCurrency(selectedInvoice.payable_amount)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-800">
                            {selectedInvoice.status !== 'refunded' && canEditInvoice && (
                                <button
                                    onClick={() => openEditModal(selectedInvoice.id)}
                                    className="px-4 py-2.5 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-400 border dark:border-amber-900 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                                >
                                    <Edit3 className="w-4 h-4" />
                                    <span>Edit Line Items</span>
                                </button>
                            )}
                            {selectedInvoice.status !== 'refunded' && user?.role !== 'cashier' && (
                                <button
                                    onClick={() => handleRefund(selectedInvoice.id)}
                                    className="px-4 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 border dark:border-rose-900 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    <span>Void & Refund Invoice</span>
                                </button>
                            )}
                            <button
                                onClick={shareInvoiceOnWhatsApp}
                                disabled={sharingWhatsApp}
                                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                            >
                                {sharingWhatsApp ? 'Generating...' : 'Share on WhatsApp'}
                            </button>
                            <button
                                onClick={triggerPrint}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-2 transition"
                            >
                                <Printer className="w-4 h-4" />
                                <span>Print Receipt</span>
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal: Edit Invoice Line Items */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title={editingInvoice ? `Edit Line Items — Invoice ${editingInvoice.invoice_number}` : 'Edit Invoice Line Items'}
                size="xl"
            >
                {editingInvoice && (
                    <div className="space-y-6">
                        {/* Header Info */}
                        <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs flex justify-between items-center">
                            <div>
                                <span className="font-bold text-amber-900 dark:text-amber-300">Customer: </span>
                                <span className="text-amber-800 dark:text-amber-400">{editingInvoice.customer?.name || 'Walk-In Customer'}</span>
                                <span className="mx-2 text-amber-400">•</span>
                                <span className="font-bold text-amber-900 dark:text-amber-300">Payment: </span>
                                <span className="capitalize text-amber-800 dark:text-amber-400">{editingInvoice.payment_method?.replace('_', ' ')}</span>
                            </div>
                            <span className="px-2 py-0.5 bg-amber-200/60 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 rounded-md font-bold text-[10px] uppercase">
                                RBAC Authorized ({user?.role})
                            </span>
                        </div>

                        {/* Product Search / Add line item */}
                        <div className="relative">
                            <label className="block text-xs font-bold mb-1">Add or Swap Products:</label>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name, SKU or barcode to add items..."
                                    value={prodSearchQuery}
                                    onChange={(e) => searchProducts(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                            {prodSearchResults.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y dark:divide-slate-800">
                                    {prodSearchResults.map(prod => (
                                        <div
                                            key={prod.id}
                                            onClick={() => addProductToEdit(prod)}
                                            className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex justify-between items-center text-xs"
                                        >
                                            <div>
                                                <p className="font-bold">{prod.name}</p>
                                                <p className="text-[10px] text-slate-400">SKU: {prod.sku} | Stock: {prod.quantity}</p>
                                            </div>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(prod.price)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Editable Items Table */}
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500">
                                    <tr>
                                        <th className="p-2.5">Product</th>
                                        <th className="p-2.5 w-24">Size/Color</th>
                                        <th className="p-2.5 w-24 text-right">Unit Price</th>
                                        <th className="p-2.5 w-20 text-right">Disc/Unit</th>
                                        <th className="p-2.5 w-24 text-center">Qty</th>
                                        <th className="p-2.5 w-24 text-right">Subtotal</th>
                                        <th className="p-2.5 w-10 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y border-b dark:border-slate-800">
                                    {editItems.map((item, idx) => {
                                        const qty = parseInt(item.quantity) || 0;
                                        const price = parseFloat(item.unit_price) || 0;
                                        const disc = parseFloat(item.discount) || 0;
                                        const subtotal = Math.max(0, (price - disc) * qty);
                                        return (
                                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                                                <td className="p-2.5">
                                                    <p className="font-bold">{item.name}</p>
                                                    <p className="text-[10px] text-slate-400">{item.sku}</p>
                                                </td>
                                                <td className="p-2.5">
                                                    <div className="space-y-1">
                                                        <input
                                                            type="text"
                                                            placeholder="Size"
                                                            value={item.size}
                                                            onChange={(e) => updateEditItem(idx, 'size', e.target.value)}
                                                            className="w-full px-1.5 py-0.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-[11px]"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="p-2.5 text-right">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.unit_price}
                                                        onChange={(e) => updateEditItem(idx, 'unit_price', e.target.value)}
                                                        className="w-20 px-1.5 py-0.5 text-right bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs font-semibold"
                                                    />
                                                </td>
                                                <td className="p-2.5 text-right">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.discount}
                                                        onChange={(e) => updateEditItem(idx, 'discount', e.target.value)}
                                                        className="w-16 px-1.5 py-0.5 text-right bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs"
                                                    />
                                                </td>
                                                <td className="p-2.5 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateEditItem(idx, 'quantity', Math.max(1, item.quantity - 1))}
                                                            className="w-5 h-5 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center font-bold text-xs hover:bg-slate-200"
                                                        >
                                                            -
                                                        </button>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={(e) => updateEditItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                                            className="w-10 text-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs font-bold"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => updateEditItem(idx, 'quantity', item.quantity + 1)}
                                                            className="w-5 h-5 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center font-bold text-xs hover:bg-slate-200"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-2.5 text-right font-bold">
                                                    {formatCurrency(subtotal)}
                                                </td>
                                                <td className="p-2.5 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeEditItem(idx)}
                                                        className="text-slate-400 hover:text-red-600 transition"
                                                        title="Remove Line Item"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Financial Recalculation Summary */}
                        {(() => {
                            const { itemsSubtotal, tax, payable } = calculateEditTotals();
                            return (
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Tax / GST Amount ($):</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editTaxAmount}
                                            onChange={(e) => setEditTaxAmount(e.target.value)}
                                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold"
                                        />
                                    </div>
                                    <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between items-center text-xs">
                                        <div className="space-x-4">
                                            <span>Items Subtotal: <strong className="text-slate-700 dark:text-slate-200">{formatCurrency(itemsSubtotal)}</strong></span>
                                            <span>Tax: <strong className="text-slate-700 dark:text-slate-200">+{formatCurrency(tax)}</strong></span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">Recalculated Grand Total</span>
                                            <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{formatCurrency(payable)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Action buttons */}
                        <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveInvoiceItems}
                                disabled={isSavingEdit}
                                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-2 transition"
                            >
                                <Save className="w-4 h-4" />
                                <span>{isSavingEdit ? 'Recalculating & Saving...' : 'Save & Update Line Items'}</span>
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Injected Print Styles */}
            <style>{`
                @media print {
                    @page {
                        size: auto;
                        margin: 0mm;
                    }
                    html, body {
                        height: auto !important;
                        min-height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                    }
                    body * {
                        visibility: hidden !important;
                    }
                    div, section, main, article {
                        max-height: none !important;
                        height: auto !important;
                        overflow: visible !important;
                        transform: none !important;
                        animation: none !important;
                        backdrop-filter: none !important;
                    }
                    #printable-area, #printable-area * {
                        visibility: visible !important;
                    }
                    #printable-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        min-height: fit-content !important;
                        max-height: none !important;
                        overflow: visible !important;
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                }
            `}</style>

        </div>
    );
};

export default Invoices;
