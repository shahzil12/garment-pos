import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import {
    LayoutDashboard,
    ShoppingCart,
    Shirt,
    Package,
    Truck,
    Users,
    FileText,
    DollarSign,
    BarChart3,
    UserCheck,
    Settings as SettingsIcon,
    LogOut,
    Menu,
    X,
    Sun,
    Moon,
    User as UserIcon
} from 'lucide-react';

const Layout = ({ children }) => {
    const { user, logout, role } = useAuth();
    const { darkMode, toggleTheme } = useTheme();
    const { settings } = useSettings();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const navigationItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'manager', 'cashier'], key: 'cashier_can_access_dashboard', managerKey: 'manager_can_access_dashboard' },
        { name: 'POS Screen', path: '/pos', icon: ShoppingCart, roles: ['admin', 'manager', 'cashier'], key: 'cashier_can_access_pos', managerKey: 'manager_can_access_pos' },
        { name: 'Products Catalog', path: '/products', icon: Shirt, roles: ['admin', 'manager', 'cashier'], key: 'cashier_can_access_products', managerKey: 'manager_can_access_products' },
        { name: 'Inventory Logs', path: '/inventory', icon: Package, roles: ['admin', 'manager'] },
        { name: 'Vendors & POs', path: '/vendors', icon: Truck, roles: ['admin', 'manager'] },
        { name: 'Customers', path: '/customers', icon: Users, roles: ['admin', 'manager', 'cashier'], key: 'cashier_can_access_customers', managerKey: 'manager_can_access_customers' },
        { name: 'Invoices History', path: '/invoices', icon: FileText, roles: ['admin', 'manager', 'cashier'], key: 'cashier_can_access_invoices', managerKey: 'manager_can_access_invoices' },
        { name: 'Expenses', path: '/expenses', icon: DollarSign, roles: ['admin', 'manager'] },
        { name: 'Analytics & Reports', path: '/reports', icon: BarChart3, roles: ['admin', 'manager'] },
        { name: 'Staff Management', path: '/employees', icon: UserCheck, roles: ['admin', 'manager'] },
        { name: 'System Settings', path: '/settings', icon: SettingsIcon, roles: ['admin', 'manager'] },
    ];

    const filteredNavItems = navigationItems.filter(item => {
        if (!item.roles.includes(role)) return false;
        if (role === 'cashier' && item.key && settings[item.key] === '0') {
            return false;
        }
        if (role === 'manager' && item.managerKey && settings[item.managerKey] === '0') {
            return false;
        }
        return true;
    });

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200">
            {/* Sidebar Desktop */}
            <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-colors duration-200">
                <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
                        {settings.shop_name || 'Vogue POS'}
                    </span>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                    {filteredNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                                    isActive
                                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-550/10 dark:hover:bg-red-500/10 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all duration-150"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Log Out</span>
                    </button>
                </div>
            </aside>

            {/* Sidebar Mobile */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-900/40 backdrop-blur-sm">
                    <div className="relative flex flex-col w-64 bg-white dark:bg-slate-900 h-full shadow-2xl p-4 transition-transform duration-300">
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="absolute top-4 right-4 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="mt-8 flex-1 space-y-1.5">
                            {filteredNavItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.path}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                                            isActive
                                                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                        <div className="mt-auto border-t border-slate-200 dark:border-slate-800 pt-4">
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>Log Out</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Area */}
            <div className="flex flex-col flex-1 h-full overflow-hidden">
                {/* Navbar */}
                <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <div className="text-lg font-semibold capitalize hidden md:block">
                        {location.pathname === '/' ? 'Overview Dashboard' : location.pathname.substring(1).replace('-', ' ')}
                    </div>

                    <div className="flex items-center gap-4 ml-auto">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all duration-150"
                            aria-label="Toggle Theme"
                        >
                            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>

                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                className="flex items-center gap-3 pl-3 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all duration-150"
                            >
                                <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold shadow-sm shadow-indigo-500/20">
                                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div className="text-left hidden sm:block">
                                    <p className="text-xs font-semibold leading-tight">{user?.name}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                                        {user?.role}
                                    </p>
                                </div>
                            </button>

                            {profileDropdownOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-30"
                                        onClick={() => setProfileDropdownOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-40 py-2">
                                        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Signed in as</p>
                                            <p className="text-sm font-semibold truncate text-slate-700 dark:text-slate-300">
                                                {user?.email}
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-100"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            <span>Sign Out</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Main Content Pane */}
                <main className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
