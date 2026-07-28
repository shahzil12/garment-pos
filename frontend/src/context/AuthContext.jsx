import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Set base API URL and default headers
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Initialize token synchronously at top level
const initialToken = localStorage.getItem('token') || '';
if (initialToken) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(initialToken);
    const [loading, setLoading] = useState(true);

    // Validate token on load (runs once on mount)
    useEffect(() => {
        const checkAuth = async () => {
            if (initialToken) {
                try {
                    const response = await axios.get('/me');
                    setUser(response.data.data.user);
                } catch (error) {
                    console.error('Auth check failed:', error);
                    logoutLocal();
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    // Handle global 401 interceptor
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && error.response.status === 401) {
                    logoutLocal();
                }
                return Promise.reject(error);
            }
        );
        return () => {
            axios.interceptors.response.eject(interceptor);
        };
    }, []);

    const login = async (email, password) => {
        try {
            const response = await axios.post('/login', { email, password });
            const { token: receivedToken, user: receivedUser } = response.data.data;
            
            // Set header and storage synchronously before updating state
            axios.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`;
            localStorage.setItem('token', receivedToken);
            
            setToken(receivedToken);
            setUser(receivedUser);
            return { success: true };
        } catch (error) {
            const message = error.response 
                ? (error.response.data?.message || 'Login failed. Please check your credentials.')
                : 'Unable to connect to the backend server. Please ensure the backend server is running.';
            return {
                success: false,
                message
            };
        }
    };

    const logout = async () => {
        try {
            await axios.post('/logout');
        } catch (error) {
            console.error('Logout error on server:', error);
        } finally {
            logoutLocal();
        }
    };

    const logoutLocal = () => {
        delete axios.defaults.headers.common['Authorization'];
        localStorage.removeItem('token');
        setToken('');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, role: user?.role, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
