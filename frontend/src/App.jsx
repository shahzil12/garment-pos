import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';

// Layout
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Vendors from './pages/Vendors';
import Customers from './pages/Customers';
import Invoices from './pages/Invoices';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Employees from './pages/Employees';
import Settings from './pages/Settings';

// Protected Route Guard Component
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, loading, role } = useAuth();
    const { settings = {} } = useSettings() || {};
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
        return <Navigate to="/" replace />;
    }

    // Role-based cashier settings restriction
    if (role === 'cashier') {
        const path = location.pathname;
        if (path === '/' && settings.cashier_can_access_dashboard === '0') {
            if (settings.cashier_can_access_pos !== '0') return <Navigate to="/pos" replace />;
            if (settings.cashier_can_access_products !== '0') return <Navigate to="/products" replace />;
            if (settings.cashier_can_access_customers !== '0') return <Navigate to="/customers" replace />;
            if (settings.cashier_can_access_invoices !== '0') return <Navigate to="/invoices" replace />;
            return <Navigate to="/login" replace />;
        }
        if (path === '/pos' && settings.cashier_can_access_pos === '0') {
            return <Navigate to="/" replace />;
        }
        if (path === '/products' && settings.cashier_can_access_products === '0') {
            return <Navigate to="/" replace />;
        }
        if (path === '/customers' && settings.cashier_can_access_customers === '0') {
            return <Navigate to="/" replace />;
        }
        if (path === '/invoices' && settings.cashier_can_access_invoices === '0') {
            return <Navigate to="/" replace />;
        }
    }

    // Role-based manager settings restriction
    if (role === 'manager') {
        const path = location.pathname;
        if (path === '/' && settings.manager_can_access_dashboard === '0') {
            if (settings.manager_can_access_pos !== '0') return <Navigate to="/pos" replace />;
            if (settings.manager_can_access_products !== '0') return <Navigate to="/products" replace />;
            if (settings.manager_can_access_customers !== '0') return <Navigate to="/customers" replace />;
            if (settings.manager_can_access_invoices !== '0') return <Navigate to="/invoices" replace />;
            return <Navigate to="/login" replace />;
        }
        if (path === '/pos' && settings.manager_can_access_pos === '0') {
            return <Navigate to="/" replace />;
        }
        if (path === '/products' && settings.manager_can_access_products === '0') {
            return <Navigate to="/" replace />;
        }
        if (path === '/customers' && settings.manager_can_access_customers === '0') {
            return <Navigate to="/" replace />;
        }
        if (path === '/invoices' && settings.manager_can_access_invoices === '0') {
            return <Navigate to="/" replace />;
        }
    }

    return <Layout>{children}</Layout>;
};

function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <SettingsProvider>
                    <Router>
                        <Routes>
                            {/* Public Login Route */}
                            <Route path="/login" element={<Login />} />

                            {/* Guarded Core App Routes */}
                            <Route
                                path="/"
                                element={
                                    <ProtectedRoute allowedRoles={['admin', 'manager', 'cashier']}>
                                        <Dashboard />
                                    </ProtectedRoute>
                                }
                            />
                            
                            <Route
                                path="/pos"
                                element={
                                    <ProtectedRoute allowedRoles={['admin', 'manager', 'cashier']}>
                                        <POS />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/products"
                                element={
                                    <ProtectedRoute allowedRoles={['admin', 'manager', 'cashier']}>
                                        <Products />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/inventory"
                                element={
                                    <ProtectedRoute allowedRoles={['admin', 'manager']}>
                                        <Inventory />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/vendors"
                                element={
                                    <ProtectedRoute allowedRoles={['admin', 'manager']}>
                                        <Vendors />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/customers"
                                element={
                                    <ProtectedRoute allowedRoles={['admin', 'manager', 'cashier']}>
                                        <Customers />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/invoices"
                                element={
                                    <ProtectedRoute allowedRoles={['admin', 'manager', 'cashier']}>
                                        <Invoices />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/expenses"
                                element={
                                    <ProtectedRoute allowedRoles={['admin', 'manager']}>
                                        <Expenses />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/reports"
                                element={
                                    <ProtectedRoute allowedRoles={['admin', 'manager']}>
                                        <Reports />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/employees"
                                element={
                                    <ProtectedRoute allowedRoles={['admin', 'manager']}>
                                        <Employees />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/settings"
                                element={
                                    <ProtectedRoute allowedRoles={['admin', 'manager']}>
                                        <Settings />
                                    </ProtectedRoute>
                                }
                            />

                            {/* Catch-all Redirect */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </Router>
                </SettingsProvider>
            </ThemeProvider>
        </AuthProvider>
    );
}

export default App;
