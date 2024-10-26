import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading, getAuthStatus } = useAuth();
    const location = useLocation();

    // Additional security check
    useEffect(() => {
        const authStatus = getAuthStatus();
        if (!authStatus.token || !authStatus.userId) {
            // Force logout if missing credentials
            window.location.href = '/login';
        }
    }, [getAuthStatus]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    // Strict authentication check
    if (!isAuthenticated || !localStorage.getItem('token') || !localStorage.getItem('userId')) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

export default ProtectedRoute;
