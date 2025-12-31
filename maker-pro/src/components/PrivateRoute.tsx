import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface Props {
    requiredRole?: string;
    children?: React.ReactNode;
}

export function PrivateRoute({ requiredRole, children }: Props) {
    const { user, loading, isAuthorized, authError, signOut, userRole } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (user && !isAuthorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
                    <p className="text-slate-600 mb-6">
                        {authError || 'This portal is reserved for participants of the MakerPro (Adults) program.'}
                    </p>
                    <button
                        onClick={() => signOut()}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                    >
                        Sign Out
                    </button>
                    <div className="mt-4 text-xs text-slate-400">
                        If you believe this is an error, please contact your administrator.
                    </div>
                </div>
            </div>
        );
    }

    if (requiredRole && userRole !== requiredRole) {
        return <Navigate to="/" replace />;
    }

    return user ? (children ? <>{children}</> : <Outlet />) : <Navigate to="/login" replace />;
}
