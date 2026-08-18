import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [settings, setSettings] = useState({
        shop_name: 'Garment POS',
        currency_symbol: 'Rs.',
        currency_code: 'PKR',
        tax_rate: '0',
        shop_email: '',
        shop_phone: '',
        shop_address: '',
        receipt_header: '',
        receipt_footer: '',
        account_title: '',
        account_number: '',
        easypaisa_account_title: '',
        easypaisa_account_number: '',
        jazzcash_account_title: '',
        jazzcash_account_number: '',
        bank_name: '',
        bank_account_title: '',
        bank_account_number: '',
        cashier_can_access_dashboard: '1',
        cashier_can_access_pos: '1',
        cashier_can_access_products: '1',
        cashier_can_access_customers: '1',
        cashier_can_access_invoices: '1',
        manager_can_access_dashboard: '1',
        manager_can_access_pos: '1',
        manager_can_access_products: '1',
        manager_can_access_customers: '1',
        manager_can_access_invoices: '1',
    });
    const [settingsLoading, setSettingsLoading] = useState(false);

    const fetchSettings = async () => {
        if (!isAuthenticated) return;
        setSettingsLoading(true);
        try {
            const response = await axios.get('/settings');
            if (response.data.status === 'success') {
                setSettings(response.data.data);
            }
        } catch (error) {
            console.error('Failed to load shop settings:', error);
        } finally {
            setSettingsLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, [isAuthenticated]);

    const updateSettingsState = (newSettings) => {
        setSettings(newSettings);
    };

    const formatCurrency = (amount) => {
        const num = parseFloat(amount) || 0;
        const symbol = settings.currency_symbol || 'Rs.';
        const space = symbol === '$' ? '' : ' ';
        return `${symbol}${space}${num.toFixed(2)}`;
    };

    return (
        <SettingsContext.Provider value={{ settings, settingsLoading, refreshSettings: fetchSettings, updateSettingsState, formatCurrency }}>
            {children}
        </SettingsContext.Provider>
    );
};

const defaultFormatCurrency = (amount) => `Rs. ${(parseFloat(amount) || 0).toFixed(2)}`;
export const useSettings = () => useContext(SettingsContext) || { settings: {}, settingsLoading: false, refreshSettings: () => {}, updateSettingsState: () => {}, formatCurrency: defaultFormatCurrency };
