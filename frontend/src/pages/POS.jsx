import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import {
    Search,
    Plus,
    Minus,
    Trash2,
    UserPlus,
    User,
    DollarSign,
    CreditCard,
    Smartphone,
    Percent,
    FileText,
    Printer,
    CheckCircle,
    X,
    FileCheck,
    Shirt,
    ShoppingCart
} from 'lucide-react';
import canvasConfetti from 'canvas-confetti';

const POS = () => {
    const { formatCurrency, settings } = useSettings();
    const { user } = useAuth();
    
    // POS States
    const [searchQuery, setSearchQuery] = useState('');
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    
    // Cart & Checkout States
    const [cart, setCart] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [cartDiscount, setCartDiscount] = useState(0); // overall discount
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [checkoutNotes, setCheckoutNotes] = useState('');
    const [submittingCheckout, setSubmittingCheckout] = useState(false);
    
    // Modals
    const [addCustomerOpen, setAddCustomerOpen] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerPhone, setNewCustomerPhone] = useState('');
    const [newCustomerEmail, setNewCustomerEmail] = useState('');
    const [newCustomerAddress, setNewCustomerAddress] = useState('');
    
    const [checkoutSuccessOpen, setCheckoutSuccessOpen] = useState(false);
    const [completedInvoice, setCompletedInvoice] = useState(null);
    const [printType, setPrintType] = useState('thermal'); // 'thermal' or 'a4'

    const barcodeInputRef = useRef(null);

    // Load initial data
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [catsRes, custsRes] = await Promise.all([
                    axios.get('/categories'),
                    axios.get('/customers')
                ]);
                setCategories(catsRes.data.data);
                // Pre-select Walk-in Customer (which is index 0 usually, or ID 1)
                const walkIn = custsRes.data.data.find(c => c.id === 1 || c.name.toLowerCase().includes('walk-in'));
                setCustomers(custsRes.data.data);
                if (walkIn) {
                    setSelectedCustomerId(walkIn.id);
                }
            } catch (err) {
                console.error('Failed to load initial POS data:', err);
            }
        };
        loadInitialData();
    }, []);

    // Load products on search query or category filter changes
    useEffect(() => {
        const fetchProducts = async () => {
            setLoadingProducts(true);
            try {
                let url = '/pos/search';
                if (searchQuery) {
                    url += `?q=${searchQuery}`;
                } else if (selectedCategory) {
                    url += `?q=&category_id=${selectedCategory}`;
                }
                const response = await axios.get(url);
                setProducts(response.data.data);

                // Auto-add product if barcode matches exactly and it's the only one found
                if (searchQuery && response.data.data.length === 1) {
                    const matchedProd = response.data.data[0];
                    if (matchedProd.barcode === searchQuery || matchedProd.sku === searchQuery) {
                        addToCart(matchedProd);
                        setSearchQuery(''); // Clear search
                    }
                }
            } catch (err) {
                console.error('Failed to load products:', err);
            } finally {
                setLoadingProducts(false);
            }
        };

        const timer = setTimeout(() => {
            fetchProducts();
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, selectedCategory]);

    // Cart Operations
    const addToCart = (product) => {
        if (product.quantity <= 0) {
            alert('This product is out of stock!');
            return;
        }

        const defaultSize = product.sizes && product.sizes.length > 0 ? product.sizes[0] : '';
        const defaultColor = product.colors && product.colors.length > 0 ? product.colors[0] : '';

        // Check if item exists with same ID, size, and color
        const existingIdx = cart.findIndex(
            (item) => item.product_id === product.id && item.size === defaultSize && item.color === defaultColor
        );

        if (existingIdx > -1) {
            const currentQty = cart[existingIdx].quantity;
            if (currentQty >= product.quantity) {
                alert('Cannot add more items. Max stock reached.');
                return;
            }
            const updated = [...cart];
            updated[existingIdx].quantity += 1;
            setCart(updated);
        } else {
            setCart([
                ...cart,
                {
                    product_id: product.id,
                    name: product.name,
                    sku: product.sku,
                    barcode: product.barcode,
                    unit_price: parseFloat(product.selling_price),
                    purchase_price: parseFloat(product.purchase_price),
                    max_quantity: product.quantity,
                    quantity: 1,
                    discount: 0,
                    tax: 0,
                    size: defaultSize,
                    color: defaultColor,
                    sizes: product.sizes || [],
                    colors: product.colors || []
                }
            ]);
        }
    };

    const updateCartQty = (idx, newQty) => {
        const item = cart[idx];
        if (newQty <= 0) {
            removeFromCart(idx);
            return;
        }
        if (newQty > item.max_quantity) {
            alert(`Insufficient stock. Only ${item.max_quantity} items available.`);
            return;
        }
        const updated = [...cart];
        updated[idx].quantity = newQty;
        setCart(updated);
    };

    const updateVariant = (idx, field, value) => {
        const updated = [...cart];
        updated[idx][field] = value;
        
        // Re-check duplicates after variation edit
        const item = updated[idx];
        const duplicateIdx = updated.findIndex(
            (it, itIdx) => itIdx !== idx && it.product_id === item.product_id && it.size === item.size && it.color === item.color
        );

        if (duplicateIdx > -1) {
            // Merge duplicate into other
            const combinedQty = updated[duplicateIdx].quantity + item.quantity;
            if (combinedQty > item.max_quantity) {
                updated[duplicateIdx].quantity = item.max_quantity;
            } else {
                updated[duplicateIdx].quantity = combinedQty;
            }
            updated.splice(idx, 1);
        }
        setCart(updated);
    };

    const removeFromCart = (idx) => {
        const updated = [...cart];
        updated.splice(idx, 1);
        setCart(updated);
    };

    // Calculate totals
    const getCartSubtotal = () => {
        return cart.reduce((total, item) => total + (item.unit_price * item.quantity), 0);
    };

    const getCartDiscountAmount = () => {
        // Flat rate discount from bottom panel
        return parseFloat(cartDiscount) || 0;
    };

    const getCartTaxAmount = (subtotal, discount) => {
        const rate = parseFloat(settings.tax_rate) || 0;
        const taxable = Math.max(0, subtotal - discount);
        return taxable * (rate / 100);
    };

    const getCartPayableAmount = () => {
        const sub = getCartSubtotal();
        const disc = getCartDiscountAmount();
        const tax = getCartTaxAmount(sub, disc);
        return Math.max(0, sub - disc + tax);
    };

    // Customer CRUD
    const handleAddCustomer = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('/customers', {
                name: newCustomerName,
                phone: newCustomerPhone,
                email: newCustomerEmail,
                address: newCustomerAddress
            });
            if (response.data.status === 'success') {
                const newCust = response.data.data;
                setCustomers([...customers, newCust]);
                setSelectedCustomerId(newCust.id);
                setAddCustomerOpen(false);
                // Reset form
                setNewCustomerName('');
                setNewCustomerPhone('');
                setNewCustomerEmail('');
                setNewCustomerAddress('');
            }
        } catch (err) {
            alert('Failed to save customer. Make sure email/phone is unique.');
        }
    };

    // Checkout Submit
    const handleCheckout = async () => {
        if (cart.length === 0) {
            alert('Your cart is empty!');
            return;
        }

        setSubmittingCheckout(true);
        const subtotal = getCartSubtotal();
        const discount = getCartDiscountAmount();
        const tax = getCartTaxAmount(subtotal, discount);
        const payable = getCartPayableAmount();

        const payload = {
            customer_id: selectedCustomerId || null,
            items: cart.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount: 0, // item-specific discount is 0 since we apply flat overall
                tax: 0,
                size: item.size,
                color: item.color
            })),
            discount_amount: discount,
            tax_amount: tax,
            payable_amount: payable,
            paid_amount: payable, // for simplicity, assume full payment
            payment_method: paymentMethod,
            notes: checkoutNotes
        };

        try {
            const response = await axios.post('/pos/checkout', payload);
            if (response.data.status === 'success') {
                setCompletedInvoice(response.data.data);
                setCart([]);
                setCartDiscount(0);
                setCheckoutNotes('');
                setCheckoutSuccessOpen(true);
                canvasConfetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Checkout failed. Please inspect product stocks.');
        } finally {
            setSubmittingCheckout(false);
        }
    };

    // Printing function
    const triggerBrowserPrint = () => {
        window.print();
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-8.5rem)] min-h-[500px]">
            
            {/* Left Column: Product Selection (7 cols) */}
            <div className="lg:col-span-7 flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                
                {/* Product Search & Barcode Scan */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input
                            ref={barcodeInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name, SKU or scan Barcode..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-550"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-650"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Categories Horizontal Carousel */}
                <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/60 flex gap-2 overflow-x-auto scrollbar-none">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-100 ${
                            selectedCategory === null
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                    >
                        All Categories
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-100 ${
                                selectedCategory === cat.id
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Product Catalog Grid */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-950/20">
                    {loadingProducts ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                            <Shirt className="w-12 h-12 mb-2 text-slate-300 dark:text-slate-700" />
                            <span>No garments found matching query.</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                            {products.map((prod) => {
                                const isLowStock = prod.quantity <= prod.low_stock_warning;
                                const isOutOfStock = prod.quantity <= 0;
                                return (
                                    <button
                                        key={prod.id}
                                        disabled={isOutOfStock}
                                        onClick={() => addToCart(prod)}
                                        className={`group text-left p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-500/40 dark:hover:border-indigo-400/40 disabled:opacity-50 disabled:hover:border-slate-200 dark:disabled:hover:border-slate-800 transition-all flex flex-col justify-between h-40 relative`}
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-1">
                                                <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[70%]">
                                                    {prod.brand?.name || 'Vogue'}
                                                </span>
                                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                                    isOutOfStock
                                                        ? 'bg-red-50 text-red-650 dark:bg-red-950/20'
                                                        : isLowStock
                                                        ? 'bg-amber-50 text-amber-650 dark:bg-amber-950/20'
                                                        : 'bg-emerald-50 text-emerald-650 dark:bg-emerald-950/20'
                                                }`}>
                                                    {isOutOfStock ? 'Out' : isLowStock ? `${prod.quantity} Left` : 'In Stock'}
                                                </span>
                                            </div>
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                {prod.name}
                                            </h4>
                                        </div>
                                        <div className="mt-4">
                                            <p className="text-[9px] text-slate-400">SKU: {prod.sku}</p>
                                            <p className="text-sm font-extrabold text-slate-950 dark:text-white mt-0.5">
                                                {formatCurrency(prod.selling_price)}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Checkout Shopping Cart (5 cols) */}
            <div className="lg:col-span-5 flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                
                {/* Cart Customer Selector */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
                    <div className="flex-1 relative">
                        <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <select
                            value={selectedCustomerId}
                            onChange={(e) => setSelectedCustomerId(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-550"
                        >
                            {customers.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} {c.phone ? `(${c.phone})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={() => setAddCustomerOpen(true)}
                        className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-600/10 flex items-center justify-center transition-all duration-150"
                        title="Add Customer"
                    >
                        <UserPlus className="w-4 h-4" />
                    </button>
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm py-12">
                            <ShoppingCart className="w-12 h-12 mb-2 text-slate-200 dark:text-slate-800" />
                            <span>Your cart is empty.</span>
                        </div>
                    ) : (
                        cart.map((item, idx) => (
                            <div key={`${item.product_id}-${item.size}-${item.color}`} className="p-4 hover:bg-slate-50/40 dark:hover:bg-slate-800/10 flex flex-col gap-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.name}</h4>
                                        <p className="text-[10px] text-slate-400 mt-0.5">SKU: {item.sku}</p>
                                    </div>
                                    <button
                                        onClick={() => removeFromCart(idx)}
                                        className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 mt-1.5">
                                    
                                    {/* Variant Selectors */}
                                    <div className="flex items-center gap-2">
                                        {item.sizes.length > 0 && (
                                            <select
                                                value={item.size}
                                                onChange={(e) => updateVariant(idx, 'size', e.target.value)}
                                                className="px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-semibold focus:outline-none"
                                            >
                                                {item.sizes.map((s) => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        )}
                                        {item.colors.length > 0 && (
                                            <select
                                                value={item.color}
                                                onChange={(e) => updateVariant(idx, 'color', e.target.value)}
                                                className="px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-semibold focus:outline-none"
                                            >
                                                {item.colors.map((c) => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    {/* Quantity adjustments */}
                                    <div className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 p-1">
                                        <button
                                            onClick={() => updateCartQty(idx, item.quantity - 1)}
                                            className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                                        >
                                            <Minus className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                                        <button
                                            onClick={() => updateCartQty(idx, item.quantity + 1)}
                                            className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Subtotal */}
                                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                                        {formatCurrency(item.unit_price * item.quantity)}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Checkout Summary panel */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                    
                    {/* Discount Input */}
                    <div className="flex items-center justify-between gap-4 text-xs font-medium">
                        <span className="text-slate-500 dark:text-slate-400">Flat Discount:</span>
                        <div className="relative w-28">
                            <input
                                type="number"
                                min="0"
                                value={cartDiscount}
                                onChange={(e) => setCartDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-full pl-3 pr-6 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-right font-bold focus:outline-none"
                            />
                            <Percent className="w-3 h-3 text-slate-400 absolute right-2 top-2" />
                        </div>
                    </div>

                    {/* Tax Indicator */}
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span>GST/Sales Tax ({settings.tax_rate || 0}%):</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                            {formatCurrency(getCartTaxAmount(getCartSubtotal(), getCartDiscountAmount()))}
                        </span>
                    </div>

                    <div className="flex items-center justify-between text-base font-extrabold border-t border-slate-200 dark:border-slate-800 pt-2 text-slate-900 dark:text-white">
                        <span>Total Payable:</span>
                        <span>{formatCurrency(getCartPayableAmount())}</span>
                    </div>

                    {/* Payment Method Selector */}
                    <div className="grid grid-cols-4 gap-2 pt-2">
                        {[
                            { id: 'cash', label: 'Cash', icon: DollarSign },
                            { id: 'card', label: 'Card', icon: CreditCard },
                            { id: 'mobile_wallet', label: 'Wallet', icon: Smartphone },
                            { id: 'split', label: 'Split', icon: Percent },
                        ].map((method) => {
                            const Icon = method.icon;
                            const isSel = paymentMethod === method.id;
                            return (
                                <button
                                    key={method.id}
                                    onClick={() => setPaymentMethod(method.id)}
                                    className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all duration-100 ${
                                        isSel
                                            ? 'bg-indigo-600 border-indigo-600 text-white font-semibold'
                                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-55'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="text-[9px] uppercase tracking-wider font-bold">{method.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Checkout Button */}
                    <button
                        onClick={handleCheckout}
                        disabled={cart.length === 0 || submittingCheckout}
                        className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 disabled:from-slate-350 disabled:to-slate-400 dark:disabled:from-slate-800 text-white rounded-2xl text-sm font-semibold hover:shadow-lg hover:shadow-indigo-550/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <span>{submittingCheckout ? 'Processing...' : 'Complete Checkout'}</span>
                        <FileCheck className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Modal: Add Customer */}
            <Modal isOpen={addCustomerOpen} onClose={() => setAddCustomerOpen(false)} title="Register Customer">
                <form onSubmit={handleAddCustomer} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Full Name</label>
                        <input
                            type="text"
                            required
                            value={newCustomerName}
                            onChange={(e) => setNewCustomerName(e.target.value)}
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                            placeholder="John Doe"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Phone Number</label>
                            <input
                                type="text"
                                value={newCustomerPhone}
                                onChange={(e) => setNewCustomerPhone(e.target.value)}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                                placeholder="555-0100"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Email</label>
                            <input
                                type="email"
                                value={newCustomerEmail}
                                onChange={(e) => setNewCustomerEmail(e.target.value)}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                                placeholder="john@example.com"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Home Address</label>
                        <textarea
                            value={newCustomerAddress}
                            onChange={(e) => setNewCustomerAddress(e.target.value)}
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                            placeholder="Street details..."
                            rows="2"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold"
                    >
                        Save Customer
                    </button>
                </form>
            </Modal>

            {/* Modal: Checkout Success Invoice/Receipt */}
            <Modal
                isOpen={checkoutSuccessOpen}
                onClose={() => setCheckoutSuccessOpen(false)}
                title="Checkout Completed Successfully!"
                size="lg"
            >
                <div className="space-y-6">
                    {/* Visual Success */}
                    <div className="flex flex-col items-center text-center space-y-1">
                        <CheckCircle className="w-12 h-12 text-emerald-500" />
                        <h4 className="text-base font-bold text-slate-800 dark:text-white">Transaction Success</h4>
                        <p className="text-xs text-slate-500">Invoice Number: {completedInvoice?.invoice_number}</p>
                    </div>

                    {/* Format Toggle */}
                    <div className="flex justify-center border-b border-slate-100 dark:border-slate-800 pb-3">
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

                    {/* Printable Receipt Box */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl flex justify-center overflow-auto max-h-96">
                        {completedInvoice && (
                            printType === 'thermal' ? (
                                /* Thermal Receipt Layout (80mm width standard) */
                                <div id="printable-area" className="w-[300px] bg-white text-black p-4 text-xs font-mono border border-dashed border-slate-300">
                                    <div className="text-center space-y-1 border-b border-dashed border-black pb-2">
                                        <h3 className="text-base font-bold uppercase">{settings.shop_name}</h3>
                                        <p className="text-[10px]">{settings.shop_address}</p>
                                        <p className="text-[10px]">Ph: {settings.shop_phone}</p>
                                    </div>
                                    <div className="py-2 space-y-0.5 border-b border-dashed border-black text-[10px]">
                                        <p><strong>INVOICE:</strong> {completedInvoice.invoice_number}</p>
                                        <p><strong>DATE:</strong> {new Date(completedInvoice.sale_date).toLocaleString()}</p>
                                        <p><strong>CASHIER:</strong> {completedInvoice.user?.name || user?.name}</p>
                                        <p><strong>CUSTOMER:</strong> {completedInvoice.customer?.name || 'Walk-In Customer'}</p>
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
                                            {completedInvoice.items?.map((item) => (
                                                <tr key={item.id}>
                                                    <td className="py-1">
                                                        {item.product?.name}
                                                        <span className="block text-[8px] text-slate-500">
                                                            {item.size || '-'}/{item.color || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="py-1 text-center">{item.quantity}</td>
                                                    <td className="py-1 text-right">{formatCurrency(item.subtotal)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="border-t border-dashed border-black pt-2 space-y-1 text-right text-[10px]">
                                        <p>Subtotal: {formatCurrency(parseFloat(completedInvoice.payable_amount) - parseFloat(completedInvoice.tax_amount) + parseFloat(completedInvoice.discount_amount))}</p>
                                        <p>Discount: -{formatCurrency(completedInvoice.discount_amount)}</p>
                                        <p>Tax: {formatCurrency(completedInvoice.tax_amount)}</p>
                                        <p className="text-xs font-bold">Total: {formatCurrency(completedInvoice.payable_amount)}</p>
                                    </div>
                                    <div className="text-center pt-4 border-t border-dashed border-black text-[9px] mt-3">
                                        <p>{settings.receipt_footer || 'Thank you for shopping!'}</p>
                                    </div>
                                </div>
                            ) : (
                                /* A4 Invoice Layout */
                                <div id="printable-area" className="w-[595px] bg-white text-black p-6 text-xs border border-slate-300 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start border-b pb-4 mb-4">
                                            <div>
                                                <h2 className="text-lg font-bold uppercase tracking-wider">{settings.shop_name}</h2>
                                                <p className="text-slate-500 mt-1">{settings.shop_address}</p>
                                                <p className="text-slate-500">Phone: {settings.shop_phone} | Email: {settings.shop_email}</p>
                                            </div>
                                            <div className="text-right">
                                                <h3 className="text-xl font-extrabold text-slate-400">INVOICE</h3>
                                                <p className="font-semibold mt-1">Ref: {completedInvoice.invoice_number}</p>
                                                <p className="text-slate-500">Date: {new Date(completedInvoice.sale_date).toLocaleDateString()}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6 mb-6">
                                            <div>
                                                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Billed To:</h4>
                                                <p className="font-bold">{completedInvoice.customer?.name || 'Walk-In Customer'}</p>
                                                {completedInvoice.customer && (
                                                    <div className="text-slate-500 space-y-0.5 mt-1">
                                                        <p>Ph: {completedInvoice.customer.phone || 'N/A'}</p>
                                                        <p>Email: {completedInvoice.customer.email || 'N/A'}</p>
                                                        <p>Addr: {completedInvoice.customer.address || 'N/A'}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Payment Method:</h4>
                                                <p className="font-bold capitalize">{completedInvoice.payment_method?.replace('_', ' ')}</p>
                                                <p className="text-slate-500 mt-1">Status: Paid In Full</p>
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
                                                {completedInvoice.items?.map((item) => (
                                                    <tr key={item.id}>
                                                        <td className="p-2">
                                                            <span className="font-bold">{item.product?.name}</span>
                                                            <span className="block text-[10px] text-slate-500 mt-0.5">Size: {item.size || 'N/A'} | Color: {item.color || 'N/A'}</span>
                                                        </td>
                                                        <td className="p-2 text-center text-slate-500">{item.product?.sku}</td>
                                                        <td className="p-2 text-center">{item.quantity}</td>
                                                        <td className="p-2 text-right">{formatCurrency(item.unit_price)}</td>
                                                        <td className="p-2 text-right">{formatCurrency(item.subtotal)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <div className="w-1/2">
                                            <p className="text-[10px] italic text-slate-400">Notes: {completedInvoice.notes || 'No special notes.'}</p>
                                        </div>
                                        <div className="w-1/3 space-y-1.5 text-right font-medium">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Subtotal:</span>
                                                <span>{formatCurrency(parseFloat(completedInvoice.payable_amount) - parseFloat(completedInvoice.tax_amount) + parseFloat(completedInvoice.discount_amount))}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Discount:</span>
                                                <span className="text-red-500">-{formatCurrency(completedInvoice.discount_amount)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">GST/Tax:</span>
                                                <span>{formatCurrency(completedInvoice.tax_amount)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm font-bold border-t pt-1.5">
                                                <span>Total:</span>
                                                <span>{formatCurrency(completedInvoice.payable_amount)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        )}
                    </div>

                    {/* Print / Action Row */}
                    <div className="flex justify-end gap-3 pt-3 border-t dark:border-slate-800">
                        <button
                            onClick={() => {
                                // Simple Web Share Link
                                const text = `Vogue Garments Receipt ${completedInvoice?.invoice_number}: Total ${formatCurrency(completedInvoice?.payable_amount)}`;
                                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                            }}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all"
                        >
                            Share on WhatsApp
                        </button>
                        <button
                            onClick={triggerBrowserPrint}
                            className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/10 flex items-center gap-2 transition-all"
                        >
                            <Printer className="w-4 h-4" />
                            <span>Print Invoice</span>
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Print stylesheet style block injected locally */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #printable-area, #printable-area * {
                        visibility: visible !important;
                    }
                    #printable-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .fixed, .fixed * {
                        display: none !important;
                    }
                }
            `}</style>

        </div>
    );
};

export default POS;
