import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../ui/Logo';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 mb-4 animate-pulse">
          <img
            src="/fraudscope_emblem.png"
            alt="FRAUDSCOPE AI"
            className="w-full h-full object-contain filter drop-shadow-[0_4px_16px_rgba(212,175,55,0.35)]"
          />
        </div>
        <p className="text-sm font-semibold tracking-wide text-[#202124]">
          Verifying Forensic Session...
        </p>
        <p className="text-xs text-[#697386] mt-1 font-mono">
          FRAUDSCOPE AI • Cryptographic Handshake
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
