import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [settings, setSettings] = useState({
        shop_name: 'Garment POS',
        currency_symbol: '$',
        currency_code: 'USD',
        tax_rate: '0',
        shop_email: '',
        shop_phone: '',
        shop_address: '',
        receipt_header: '',
        receipt_footer: '',
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
        return `${settings.currency_symbol || '$'}${num.toFixed(2)}`;
    };

    return (
        <SettingsContext.Provider value={{ settings, settingsLoading, refreshSettings: fetchSettings, updateSettingsState, formatCurrency }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);
