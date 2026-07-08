import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';

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
                                    <ProtectedRoute allowedRoles={['admin', 'cashier']}>
                                        <Dashboard />
                                    </ProtectedRoute>
                                }
                            />
                            
                            <Route
                                path="/pos"
                                element={
                                    <ProtectedRoute allowedRoles={['admin', 'cashier']}>
                                        <POS />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/products"
                                element={
                                    <ProtectedRoute allowedRoles={['admin', 'cashier']}>
                                        <Products />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/inventory"
                                element={
                                    <ProtectedRoute allowedRoles={['admin']}>
                                        <Inventory />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/vendors"
                                element={
                                    <ProtectedRoute allowedRoles={['admin']}>
                                        <Vendors />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/customers"
                                element={
                                    <ProtectedRoute allowedRoles={['admin', 'cashier']}>
                                        <Customers />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/invoices"
                                element={
                                    <ProtectedRoute allowedRoles={['admin', 'cashier']}>
                                        <Invoices />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/expenses"
                                element={
                                    <ProtectedRoute allowedRoles={['admin']}>
                                        <Expenses />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/reports"
                                element={
                                    <ProtectedRoute allowedRoles={['admin']}>
                                        <Reports />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/employees"
                                element={
                                    <ProtectedRoute allowedRoles={['admin']}>
                                        <Employees />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/settings"
                                element={
                                    <ProtectedRoute allowedRoles={['admin']}>
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
