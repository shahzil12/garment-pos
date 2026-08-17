import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Barcode from '../components/Barcode';
import { useSettings } from '../context/SettingsContext';
import { Plus, Edit, Trash2, Tag, Layers, Shirt, Image, Barcode as BarcodeIcon } from 'lucide-react';

const Products = () => {
    const { formatCurrency } = useSettings();
    const [activeTab, setActiveTab] = useState('products');
    
    // Core data lists
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    
    // UI statuses
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [brandFilter, setBrandFilter] = useState('');
    const [stockFilter, setStockFilter] = useState('');
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

    // Modals open states
    const [productModalOpen, setProductModalOpen] = useState(false);
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [brandModalOpen, setBrandModalOpen] = useState(false);

    // Edit states
    const [editingProduct, setEditingProduct] = useState(null);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editingBrand, setEditingBrand] = useState(null);

    // Barcode states
    const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
    const [selectedProductForBarcode, setSelectedProductForBarcode] = useState(null);

    const generateEan13 = () => {
        let code = '';
        do {
            const randomDigits = Math.floor(100000000 + Math.random() * 900000000).toString();
            const barcodeWithoutCheck = '880' + randomDigits;
            let sum = 0;
            for (let i = 0; i < 12; i++) {
                const digit = parseInt(barcodeWithoutCheck[i]);
                sum += (i % 2 === 0) ? digit : digit * 3;
            }
            const checkDigit = (10 - (sum % 10)) % 10;
            code = barcodeWithoutCheck + checkDigit;
        } while (products.some(p => p.barcode === code));
        return code;
    };

    // Form fields
    const [prodForm, setProdForm] = useState({
        name: '', sku: '', barcode: '', category_id: '', brand_id: '',
        purchase_price: '', selling_price: '', sale_price: '', quantity: '', low_stock_warning: '',
        sizes: '', colors: '', size_stock: {}, color_stock: {}, variation_stock: {}, image: null
    });
    const [catForm, setCatForm] = useState({ name: '', description: '' });
    const [brandForm, setBrandForm] = useState({ name: '', description: '' });

    // Fetch products
    const fetchProducts = async (page = 1) => {
        setLoading(true);
        try {
            let url = `/products?page=${page}&search=${search}&per_page=10`;
            if (categoryFilter) url += `&category_id=${categoryFilter}`;
            if (brandFilter) url += `&brand_id=${brandFilter}`;
            if (stockFilter) url += `&stock_status=${stockFilter}`;
            
            const response = await axios.get(url);
            if (response.data.status === 'success') {
                setProducts(response.data.data.data);
                setPagination({
                    current_page: response.data.data.current_page,
                    last_page: response.data.data.last_page,
                    total: response.data.data.total
                });
            }
        } catch (err) {
            console.error('Failed to load products:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch categories
    const fetchCategories = async () => {
        try {
            const response = await axios.get('/categories');
            setCategories(response.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    // Fetch brands
    const fetchBrands = async () => {
        try {
            const response = await axios.get('/brands');
            setBrands(response.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (activeTab === 'products') {
            fetchProducts();
        } else if (activeTab === 'categories') {
            fetchCategories();
        } else if (activeTab === 'brands') {
            fetchBrands();
        }
    }, [activeTab, search, categoryFilter, brandFilter, stockFilter]);

    useEffect(() => {
        // Load initial filter datasets
        fetchCategories();
        fetchBrands();
    }, []);

    // Product submit helper
    const handleProductSubmit = async (e) => {
        e.preventDefault();
        
        // Since we have image upload, we use FormData
        const formData = new FormData();
        formData.append('name', prodForm.name);
        formData.append('sku', prodForm.sku);
        if (prodForm.barcode) formData.append('barcode', prodForm.barcode);
        if (prodForm.category_id) formData.append('category_id', prodForm.category_id);
        if (prodForm.brand_id) formData.append('brand_id', prodForm.brand_id);
        formData.append('purchase_price', prodForm.purchase_price);
        formData.append('selling_price', prodForm.selling_price);
        formData.append('sale_price', prodForm.sale_price !== null && prodForm.sale_price !== undefined ? prodForm.sale_price : '');
        const sizeArr = prodForm.sizes ? prodForm.sizes.split(',').map(s => s.trim()).filter(Boolean) : [];
        const colorArr = prodForm.colors ? prodForm.colors.split(',').map(c => c.trim()).filter(Boolean) : [];

        let variationKeys = [];
        if (sizeArr.length > 0 && colorArr.length > 0) {
            colorArr.forEach(c => sizeArr.forEach(s => variationKeys.push(`${c} - ${s}`)));
        } else if (sizeArr.length > 0) {
            variationKeys = sizeArr;
        } else if (colorArr.length > 0) {
            variationKeys = colorArr;
        }

        const derivedSizeStock = {};
        const derivedColorStock = {};
        const filteredVarStock = {};
        let calculatedQuantity = 0;

        if (variationKeys.length > 0) {
            variationKeys.forEach(k => {
                const qty = parseInt(prodForm.variation_stock?.[k]) || 0;
                filteredVarStock[k] = qty;
                calculatedQuantity += qty;

                if (sizeArr.length > 0 && colorArr.length > 0) {
                    const parts = k.split(' - ');
                    const c = parts[0]?.trim();
                    const s = parts[1]?.trim();
                    if (c && s) {
                        derivedColorStock[c] = (derivedColorStock[c] || 0) + qty;
                        derivedSizeStock[s] = (derivedSizeStock[s] || 0) + qty;
                    }
                } else if (sizeArr.length > 0) {
                    derivedSizeStock[k] = qty;
                } else if (colorArr.length > 0) {
                    derivedColorStock[k] = qty;
                }
            });
        } else {
            calculatedQuantity = parseInt(prodForm.quantity) || 0;
        }

        formData.append('quantity', calculatedQuantity);
        formData.append('low_stock_warning', prodForm.low_stock_warning);
        
        sizeArr.forEach((s, i) => formData.append(`sizes[${i}]`, s));
        colorArr.forEach((c, i) => formData.append(`colors[${i}]`, c));

        if (Object.keys(derivedSizeStock).length > 0) {
            formData.append('size_stock', JSON.stringify(derivedSizeStock));
        }
        if (Object.keys(derivedColorStock).length > 0) {
            formData.append('color_stock', JSON.stringify(derivedColorStock));
        }
        if (Object.keys(filteredVarStock).length > 0) {
            formData.append('variation_stock', JSON.stringify(filteredVarStock));
        }

        if (prodForm.image) {
            formData.append('image', prodForm.image);
        }

        try {
            let res;
            if (editingProduct) {
                // Laravel PUT doesn't support multipart files well, so we use POST with editing endpoint
                res = await axios.post(`/products/${editingProduct.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                res = await axios.post('/products', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            if (res.data.status === 'success') {
                fetchProducts(pagination.current_page);
                setProductModalOpen(false);
                setEditingProduct(null);
                setProdForm({
                    name: '', sku: '', barcode: '', category_id: '', brand_id: '',
                    purchase_price: '', selling_price: '', sale_price: '', quantity: '', low_stock_warning: '',
                    sizes: '', colors: '', size_stock: {}, color_stock: {}, image: null
                });
            }
        } catch (err) {
            const errorMsg = err.response?.data?.errors 
                ? Object.values(err.response.data.errors).flat().join('\n')
                : (err.response?.data?.message || err.response?.data?.error || 'Failed to save product. Ensure SKU and Barcode are unique.');
            alert(errorMsg);
        }
    };

    const startProductEdit = (prod) => {
        setEditingProduct(prod);

        const parseObj = (val) => {
            if (!val) return {};
            if (typeof val === 'object' && val !== null) return val;
            if (typeof val === 'string') {
                try { return JSON.parse(val); } catch (e) { return {}; }
            }
            return {};
        };

        const parseArrStr = (val) => {
            if (!val) return '';
            if (Array.isArray(val)) return val.join(', ');
            if (typeof val === 'string') {
                if (val.trim().startsWith('[')) {
                    try {
                        const parsed = JSON.parse(val);
                        if (Array.isArray(parsed)) return parsed.join(', ');
                    } catch (e) {}
                }
                return val;
            }
            return '';
        };

        const sizeStock = parseObj(prod.size_stock);
        const colorStock = parseObj(prod.color_stock);
        const varStock = parseObj(prod.variation_stock);

        let sizesStr = parseArrStr(prod.sizes);
        let colorsStr = parseArrStr(prod.colors);

        if (!sizesStr && Object.keys(sizeStock).length > 0) {
            sizesStr = Object.keys(sizeStock).join(', ');
        }
        if (!colorsStr && Object.keys(colorStock).length > 0) {
            colorsStr = Object.keys(colorStock).join(', ');
        }
        if (Object.keys(varStock).length > 0) {
            const extColors = new Set();
            const extSizes = new Set();
            Object.keys(varStock).forEach(k => {
                const parts = k.split(' - ');
                if (parts.length === 2) {
                    if (parts[0]) extColors.add(parts[0].trim());
                    if (parts[1]) extSizes.add(parts[1].trim());
                }
            });
            if (!colorsStr && extColors.size > 0) colorsStr = Array.from(extColors).join(', ');
            if (!sizesStr && extSizes.size > 0) sizesStr = Array.from(extSizes).join(', ');
        }

        setProdForm({
            name: prod.name || '',
            sku: prod.sku || '',
            barcode: prod.barcode || '',
            category_id: prod.category_id || '',
            brand_id: prod.brand_id || '',
            purchase_price: prod.purchase_price || '',
            selling_price: prod.selling_price || '',
            sale_price: prod.sale_price || '',
            quantity: prod.quantity || 0,
            low_stock_warning: prod.low_stock_warning || 0,
            sizes: sizesStr,
            colors: colorsStr,
            size_stock: sizeStock,
            color_stock: colorStock,
            variation_stock: varStock,
            image: null
        });
        setProductModalOpen(true);
    };

    const deleteProduct = async (id) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            await axios.delete(`/products/${id}`);
            fetchProducts(pagination.current_page);
        } catch (err) {
            alert('Failed to delete product.');
        }
    };

    // Category CRUD
    const handleCategorySubmit = async (e) => {
        e.preventDefault();
        try {
            let res;
            if (editingCategory) {
                res = await axios.put(`/categories/${editingCategory.id}`, catForm);
            } else {
                res = await axios.post('/categories', catForm);
            }
            if (res.data.status === 'success') {
                fetchCategories();
                setCategoryModalOpen(false);
                setEditingCategory(null);
                setCatForm({ name: '', description: '' });
            }
        } catch (err) {
            alert('Error saving category.');
        }
    };

    const startCategoryEdit = (cat) => {
        setEditingCategory(cat);
        setCatForm({ name: cat.name, description: cat.description || '' });
        setCategoryModalOpen(true);
    };

    const deleteCategory = async (id) => {
        if (!confirm('Are you sure you want to delete this category?')) return;
        try {
            await axios.delete(`/categories/${id}`);
            fetchCategories();
        } catch (err) {
            alert('Failed to delete category.');
        }
    };

    // Brand CRUD
    const handleBrandSubmit = async (e) => {
        e.preventDefault();
        try {
            let res;
            if (editingBrand) {
                res = await axios.put(`/brands/${editingBrand.id}`, brandForm);
            } else {
                res = await axios.post('/brands', brandForm);
            }
            if (res.data.status === 'success') {
                fetchBrands();
                setBrandModalOpen(false);
                setEditingBrand(null);
                setBrandForm({ name: '', description: '' });
            }
        } catch (err) {
            alert('Error saving brand.');
        }
    };

    const startBrandEdit = (brand) => {
        setEditingBrand(brand);
        setBrandForm({ name: brand.name, description: brand.description || '' });
        setBrandModalOpen(true);
    };

    const deleteBrand = async (id) => {
        if (!confirm('Are you sure you want to delete this brand?')) return;
        try {
            await axios.delete(`/brands/${id}`);
            fetchBrands();
        } catch (err) {
            alert('Failed to delete brand.');
        }
    };

    // Product Column Definitions
    const productCols = [
        {
            header: 'Product Details',
            accessor: 'name',
            render: (val, row) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border dark:border-slate-800 overflow-hidden flex items-center justify-center text-slate-400">
                        {row.image_path ? (
                            <img src={row.image_path.startsWith('http') ? row.image_path : `${(axios.defaults.baseURL || 'http://127.0.0.1:8000/api').replace(/\/api$/, '')}${row.image_path}`} alt={val} className="w-full h-full object-cover" />
                        ) : (
                            <Shirt className="w-5 h-5" />
                        )}
                    </div>
                    <div>
                        <p className="font-bold text-slate-800 dark:text-white leading-snug">{val}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">SKU: {row.sku} | Barcode: {row.barcode || '-'}</p>
                    </div>
                </div>
            )
        },
        { header: 'Category', accessor: 'category', render: (val) => val?.name || '-' },
        { header: 'Brand', accessor: 'brand', render: (val) => val?.name || '-' },
        { header: 'Purchase Cost', accessor: 'purchase_price', render: (val) => formatCurrency(val) },
        {
            header: 'Retail Price',
            accessor: 'selling_price',
            render: (val, row) => {
                const hasSale = row.sale_price && parseFloat(row.sale_price) > 0;
                if (hasSale) {
                    return (
                        <div>
                            <span className="line-through text-xs text-slate-400 mr-2">{formatCurrency(val)}</span>
                            <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(row.sale_price)}</span>
                        </div>
                    );
                }
                return <span className="font-bold">{formatCurrency(val)}</span>;
            }
        },
        {
            header: 'Qty in Stock',
            accessor: 'quantity',
            render: (val, row) => {
                const isLow = val <= row.low_stock_warning;
                const hasSizeStock = row.size_stock && Object.keys(row.size_stock).length > 0;
                const hasColorStock = row.color_stock && Object.keys(row.color_stock).length > 0;
                const hasVarStock = row.variation_stock && Object.keys(row.variation_stock).length > 0;

                return (
                    <div className="space-y-1.5 py-1 min-w-[200px]">
                        <div className="flex items-center gap-2">
                            <span className={`font-extrabold text-sm ${isLow ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>
                                {val} Units
                            </span>
                            {isLow && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 uppercase">
                                    Low Stock
                                </span>
                            )}
                        </div>

                        {/* Remaining Sizes Badges */}
                        {hasSizeStock && (
                            <div className="flex flex-wrap items-center gap-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-[42px]">Sizes:</span>
                                {Object.entries(row.size_stock).map(([size, qty]) => (
                                    <span 
                                        key={size} 
                                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${
                                            qty > 0 
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' 
                                                : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700 opacity-60 line-through'
                                        }`}
                                    >
                                        {size}: <span className="font-extrabold">{qty}</span>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Remaining Colors Badges */}
                        {hasColorStock && (
                            <div className="flex flex-wrap items-center gap-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-[42px]">Colors:</span>
                                {Object.entries(row.color_stock).map(([color, qty]) => (
                                    <span 
                                        key={color} 
                                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${
                                            qty > 0 
                                                ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800' 
                                                : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700 opacity-60 line-through'
                                        }`}
                                    >
                                        {color}: <span className="font-extrabold">{qty}</span>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Remaining Variations Badges (e.g. Red - S: 5) */}
                        {hasVarStock && (
                            <div className="flex flex-wrap items-center gap-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-[42px]">Variants:</span>
                                {Object.entries(row.variation_stock).map(([varKey, qty]) => (
                                    <span 
                                        key={varKey} 
                                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${
                                            qty > 0 
                                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800' 
                                                : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700 opacity-60 line-through'
                                        }`}
                                    >
                                        {varKey}: <span className="font-extrabold">{qty}</span>
                                    </span>
                                ))}
                            </div>
                        )}

                        {!hasSizeStock && !hasColorStock && !hasVarStock && row.sizes && row.sizes.length > 0 && (
                            <div className="text-[10px] text-slate-500">
                                Available Sizes: {row.sizes.join(', ')}
                            </div>
                        )}
                        {!hasSizeStock && !hasColorStock && !hasVarStock && row.colors && row.colors.length > 0 && (
                            <div className="text-[10px] text-slate-500">
                                Available Colors: {row.colors.join(', ')}
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            header: 'Actions',
            accessor: 'id',
            render: (val, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => startProductEdit(row)}
                        className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-550 hover:text-indigo-600 transition"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => { setSelectedProductForBarcode(row); setBarcodeModalOpen(true); }}
                        className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-500 hover:text-emerald-600 transition"
                        title="Print Barcode Label"
                    >
                        <BarcodeIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => deleteProduct(val)}
                        className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-500 hover:text-red-600 transition"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ];

    // Category Column Definitions
    const categoryCols = [
        { header: 'Category Name', accessor: 'name', render: (val) => <span className="font-bold">{val}</span> },
        { header: 'Description', accessor: 'description' },
        { header: 'Total Products Linked', accessor: 'products_count' },
        {
            header: 'Actions',
            accessor: 'id',
            render: (val, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => startCategoryEdit(row)}
                        className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-550 hover:text-indigo-600"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => deleteCategory(val)}
                        className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-550 hover:text-red-500"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ];

    // Brand Column Definitions
    const brandCols = [
        { header: 'Brand Name', accessor: 'name', render: (val) => <span className="font-bold">{val}</span> },
        { header: 'Description', accessor: 'description' },
        { header: 'Total Products Linked', accessor: 'products_count' },
        {
            header: 'Actions',
            accessor: 'id',
            render: (val, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => startBrandEdit(row)}
                        className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-550 hover:text-indigo-600"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => deleteBrand(val)}
                        className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-550 hover:text-red-500"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            
            {/* Headers row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Garment Catalog</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Manage products, categories, size variants and brands.
                    </p>
                </div>
                
                {/* Action button based on tab */}
                <div>
                    {activeTab === 'products' && (
                        <button
                            onClick={() => {
                                setEditingProduct(null);
                                setProdForm({
                                    name: '', sku: '', barcode: '', category_id: '', brand_id: '',
                                    purchase_price: '', selling_price: '', sale_price: '', quantity: '', low_stock_warning: '',
                                    sizes: '', colors: '', size_stock: {}, color_stock: {}, image: null
                                });
                                setProductModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition"
                        >
                            <Plus className="w-4.5 h-4.5" />
                            <span>Add Product</span>
                        </button>
                    )}
                    {activeTab === 'categories' && (
                        <button
                            onClick={() => { setEditingCategory(null); setCategoryModalOpen(true); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition"
                        >
                            <Plus className="w-4.5 h-4.5" />
                            <span>Add Category</span>
                        </button>
                    )}
                    {activeTab === 'brands' && (
                        <button
                            onClick={() => { setEditingBrand(null); setBrandModalOpen(true); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition"
                        >
                            <Plus className="w-4.5 h-4.5" />
                            <span>Add Brand</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
                {[
                    { id: 'products', label: 'Products List', icon: Shirt },
                    { id: 'categories', label: 'Categories', icon: Layers },
                    { id: 'brands', label: 'Brands', icon: Tag },
                ].map((tab) => {
                    const Icon = tab.icon;
                    const isAct = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setSearch(''); }}
                            className={`flex items-center gap-2 pb-3 text-sm font-semibold transition border-b-2 ${
                                isAct
                                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                                    : 'border-transparent text-slate-550 hover:text-slate-800 dark:hover:text-white'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Tab content display */}
            {activeTab === 'products' && (
                <DataTable
                    columns={productCols}
                    data={products}
                    loading={loading}
                    search={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search product by name, SKU or Barcode..."
                    pagination={{
                        current_page: pagination.current_page,
                        last_page: pagination.last_page,
                        total: pagination.total,
                        onPageChange: (p) => fetchProducts(p)
                    }}
                    csvData={products.map(p => [p.id, p.name, p.sku, p.barcode, p.category?.name, p.brand?.name, p.purchase_price, p.selling_price, p.quantity])}
                    csvHeaders={['ID', 'Name', 'SKU', 'Barcode', 'Category', 'Brand', 'Purchase Cost', 'Retail Price', 'Stock Qty']}
                    csvFileName="garments_list.csv"
                    filterComponent={
                        <div className="flex gap-2 flex-wrap items-center">
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs focus:outline-none"
                            >
                                <option value="">All Categories</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select
                                value={brandFilter}
                                onChange={(e) => setBrandFilter(e.target.value)}
                                className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-xl text-xs focus:outline-none"
                            >
                                <option value="">All Brands</option>
                                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            <select
                                value={stockFilter}
                                onChange={(e) => setStockFilter(e.target.value)}
                                className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-xl text-xs focus:outline-none"
                            >
                                <option value="">All Stock Levels</option>
                                <option value="low">Low Stock Warn</option>
                                <option value="out">Out of Stock</option>
                            </select>
                        </div>
                    }
                />
            )}

            {activeTab === 'categories' && (
                <DataTable
                    columns={categoryCols}
                    data={categories}
                    search={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search categories..."
                />
            )}

            {activeTab === 'brands' && (
                <DataTable
                    columns={brandCols}
                    data={brands}
                    search={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search brands..."
                />
            )}

            {/* Modal: Product Add/Edit */}
            <Modal
                isOpen={productModalOpen}
                onClose={() => setProductModalOpen(false)}
                title={editingProduct ? 'Edit Product' : 'Add New Product'}
                size="lg"
            >
                <form onSubmit={handleProductSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Product Name *</label>
                            <input
                                type="text"
                                required
                                value={prodForm.name}
                                onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none"
                                placeholder="E.g. Slim Crewneck Sweatshirt"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">SKU Code *</label>
                            <input
                                type="text"
                                required
                                value={prodForm.sku}
                                onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none"
                                placeholder="E.g. TS-SLM-UNI-009"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Barcode</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={prodForm.barcode}
                                    onChange={(e) => setProdForm({ ...prodForm, barcode: e.target.value })}
                                    className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none"
                                    placeholder="Scan/Type Barcode"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const code = generateEan13();
                                        setProdForm({ ...prodForm, barcode: code });
                                    }}
                                    className="px-3 py-2 bg-indigo-550/10 hover:bg-indigo-550/20 text-indigo-600 dark:text-indigo-400 border border-indigo-600/20 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer shrink-0"
                                    title="Auto-generate unique EAN-13 barcode"
                                >
                                    Generate
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Category *</label>
                            <select
                                required
                                value={prodForm.category_id}
                                onChange={(e) => setProdForm({ ...prodForm, category_id: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none"
                            >
                                <option value="">Select Category</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Brand *</label>
                            <select
                                required
                                value={prodForm.brand_id}
                                onChange={(e) => setProdForm({ ...prodForm, brand_id: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none"
                            >
                                <option value="">Select Brand</option>
                                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-5 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Cost Price *</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={prodForm.purchase_price}
                                onChange={(e) => setProdForm({ ...prodForm, purchase_price: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Selling Price *</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={prodForm.selling_price}
                                onChange={(e) => setProdForm({ ...prodForm, selling_price: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-550 mb-1">Sale Price</label>
                            <input
                                type="number"
                                step="0.01"
                                value={prodForm.sale_price}
                                onChange={(e) => setProdForm({ ...prodForm, sale_price: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Stock Quantity *</label>
                            <input
                                type="number"
                                required
                                disabled={
                                    (prodForm.sizes && prodForm.sizes.split(',').map(s => s.trim()).filter(Boolean).length > 0) ||
                                    (prodForm.colors && prodForm.colors.split(',').map(c => c.trim()).filter(Boolean).length > 0)
                                }
                                value={prodForm.quantity}
                                onChange={(e) => setProdForm({ ...prodForm, quantity: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none disabled:bg-slate-100 dark:disabled:bg-slate-900"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Alert Qty *</label>
                            <input
                                type="number"
                                required
                                value={prodForm.low_stock_warning}
                                onChange={(e) => setProdForm({ ...prodForm, low_stock_warning: e.target.value })}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none"
                                placeholder="10"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Sizes (Comma separated)</label>
                            <input
                                type="text"
                                value={prodForm.sizes}
                                onChange={(e) => {
                                    const newSizes = e.target.value;
                                    const sizeArr = newSizes ? newSizes.split(',').map(s => s.trim()).filter(Boolean) : [];
                                    const colorArr = prodForm.colors ? prodForm.colors.split(',').map(c => c.trim()).filter(Boolean) : [];
                                    
                                    let keys = [];
                                    if (sizeArr.length > 0 && colorArr.length > 0) {
                                        colorArr.forEach(c => sizeArr.forEach(s => keys.push(`${c} - ${s}`)));
                                    } else if (sizeArr.length > 0) {
                                        keys = sizeArr;
                                    } else if (colorArr.length > 0) {
                                        keys = colorArr;
                                    }

                                    let totalQty = 0;
                                    if (keys.length > 0) {
                                        totalQty = keys.reduce((sum, k) => sum + (parseInt(prodForm.variation_stock?.[k]) || 0), 0);
                                    } else {
                                        totalQty = prodForm.quantity;
                                    }

                                    setProdForm({ ...prodForm, sizes: newSizes, quantity: totalQty });
                                }}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none"
                                placeholder="E.g. S, M, L, XL"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Colors (Comma separated)</label>
                            <input
                                type="text"
                                value={prodForm.colors}
                                onChange={(e) => {
                                    const newColors = e.target.value;
                                    const sizeArr = prodForm.sizes ? prodForm.sizes.split(',').map(s => s.trim()).filter(Boolean) : [];
                                    const colorArr = newColors ? newColors.split(',').map(c => c.trim()).filter(Boolean) : [];
                                    
                                    let keys = [];
                                    if (sizeArr.length > 0 && colorArr.length > 0) {
                                        colorArr.forEach(c => sizeArr.forEach(s => keys.push(`${c} - ${s}`)));
                                    } else if (sizeArr.length > 0) {
                                        keys = sizeArr;
                                    } else if (colorArr.length > 0) {
                                        keys = colorArr;
                                    }

                                    let totalQty = 0;
                                    if (keys.length > 0) {
                                        totalQty = keys.reduce((sum, k) => sum + (parseInt(prodForm.variation_stock?.[k]) || 0), 0);
                                    } else {
                                        totalQty = prodForm.quantity;
                                    }

                                    setProdForm({ ...prodForm, colors: newColors, quantity: totalQty });
                                }}
                                className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-955 rounded-xl text-sm focus:outline-none"
                                placeholder="E.g. Red, Black, Royal Blue"
                            />
                        </div>
                    </div>

                    {/* Color + Size Variation Matrix */}
                    {(() => {
                        const sizeArr = prodForm.sizes ? prodForm.sizes.split(',').map(s => s.trim()).filter(Boolean) : [];
                        const colorArr = prodForm.colors ? prodForm.colors.split(',').map(c => c.trim()).filter(Boolean) : [];

                        let variationKeys = [];
                        let title = "Color + Size Combination Variation Matrix";
                        let description = "Specify stock quantity independently for each Color & Size combination (e.g. Black - Small = 1 unit).";

                        if (sizeArr.length > 0 && colorArr.length > 0) {
                            colorArr.forEach(c => {
                                sizeArr.forEach(s => {
                                    variationKeys.push(`${c} - ${s}`);
                                });
                            });
                        } else if (sizeArr.length > 0) {
                            variationKeys = sizeArr;
                            title = "Size Variation Matrix";
                            description = "Specify stock quantity independently for each Size.";
                        } else if (colorArr.length > 0) {
                            variationKeys = colorArr;
                            title = "Color Variation Matrix";
                            description = "Specify stock quantity independently for each Color.";
                        }

                        if (variationKeys.length > 0) {
                            return (
                                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-200 dark:border-indigo-900/50 space-y-2">
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                                        {title}
                                    </h4>
                                    <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
                                        {description}
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                                        {variationKeys.map(key => (
                                            <div key={key} className="p-2 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-lg">
                                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">{key}</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={prodForm.variation_stock?.[key] ?? ''}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        const newVarStock = { ...prodForm.variation_stock, [key]: val };
                                                        const totalQty = Object.values(newVarStock).reduce((sum, v) => sum + v, 0);
                                                        setProdForm({
                                                            ...prodForm,
                                                            variation_stock: newVarStock,
                                                            quantity: totalQty
                                                        });
                                                    }}
                                                    className="w-full px-2.5 py-1 border dark:border-slate-800 dark:bg-slate-955 rounded-lg text-xs font-bold focus:outline-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Product Image</label>
                        <div className="flex items-center gap-3">
                            <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border dark:border-slate-700 rounded-xl cursor-pointer text-xs font-semibold flex items-center gap-2">
                                <Image className="w-4 h-4" />
                                <span>Browse...</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setProdForm({ ...prodForm, image: e.target.files[0] })}
                                    className="hidden"
                                />
                            </label>
                            {prodForm.image && <span className="text-xs font-semibold truncate max-w-xs">{prodForm.image.name}</span>}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all mt-4"
                    >
                        Save Product
                    </button>
                </form>
            </Modal>

            {/* Modal: Category Add/Edit */}
            <Modal
                isOpen={categoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                title={editingCategory ? 'Edit Category' : 'Add Category'}
            >
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Category Name *</label>
                        <input
                            type="text"
                            required
                            value={catForm.name}
                            onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                            placeholder="E.g. Casual Trousers"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Description</label>
                        <textarea
                            value={catForm.description}
                            onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                            placeholder="Details about category..."
                            rows="3"
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

            {/* Modal: Brand Add/Edit */}
            <Modal
                isOpen={brandModalOpen}
                onClose={() => setBrandModalOpen(false)}
                title={editingBrand ? 'Edit Brand' : 'Add Brand'}
            >
                <form onSubmit={handleBrandSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Brand Name *</label>
                        <input
                            type="text"
                            required
                            value={brandForm.name}
                            onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                            placeholder="E.g. Levi's"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Description</label>
                        <textarea
                            value={brandForm.description}
                            onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                            className="w-full px-4 py-2 border dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm focus:outline-none"
                            placeholder="Details about brand..."
                            rows="3"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition"
                    >
                        Save Brand
                    </button>
                </form>
            </Modal>

            {/* Modal: Barcode Viewer & Print */}
            <Modal
                isOpen={barcodeModalOpen}
                onClose={() => setBarcodeModalOpen(false)}
                title="Barcode Label Viewer"
                size="md"
            >
                {selectedProductForBarcode && (
                    <div className="space-y-6">
                        <div id="printable-barcode-card" className="p-6 bg-white border border-slate-200 rounded-2xl text-center max-w-sm mx-auto shadow-sm">
                            <h4 className="font-extrabold text-slate-800 text-sm tracking-tight">{selectedProductForBarcode.name}</h4>
                            <p className="text-xs text-slate-500 font-semibold mt-1">
                                {selectedProductForBarcode.category?.name || 'Garment'} | {selectedProductForBarcode.brand?.name || 'Vogue'}
                            </p>
                            
                            <div className="my-5 flex justify-center bg-white p-2 rounded-xl">
                                <Barcode value={selectedProductForBarcode.barcode} format="CODE128" />
                            </div>

                            <p className="font-black text-lg text-indigo-600 tracking-tight">
                                {formatCurrency(selectedProductForBarcode.selling_price)}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1">
                                SKU: {selectedProductForBarcode.sku}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    const style = document.createElement('style');
                                    style.innerHTML = `
                                        @media print {
                                            body * {
                                                visibility: hidden;
                                            }
                                            #printable-barcode-card, #printable-barcode-card * {
                                                visibility: visible;
                                            }
                                            #printable-barcode-card {
                                                position: absolute;
                                                left: 50%;
                                                top: 50%;
                                                transform: translate(-50%, -50%) scale(1.5);
                                                border: none !important;
                                                box-shadow: none !important;
                                                background: white !important;
                                                color: black !important;
                                            }
                                        }
                                    `;
                                    document.head.appendChild(style);
                                    window.print();
                                    document.head.removeChild(style);
                                }}
                                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4.5 h-4.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.821V21h10.56v-7.179m-10.56 0a3.75 3.75 0 1 1 7.5 0M10.56 13.821h3.375m0 0V21m-3.375-7.179V21M3 16.5v-3.75A3.75 3.75 0 0 1 6.75 9h10.5A3.75 3.75 0 0 1 21 12.75v3.75m-3 0h3m-3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m0 0a1.5 1.5 0 0 1-3 0M3 16.5h3m-3 0a1.5 1.5 0 0 0 3 0m9.75 0h3.75m-3.75 0a1.5 1.5 0 0 1-3 0H7.5" />
                                </svg>
                                <span>Print Barcode Label</span>
                            </button>
                            <button
                                onClick={() => setBarcodeModalOpen(false)}
                                className="w-1/3 py-3 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-sm font-semibold transition cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

        </div>
    );
};

export default Products;
