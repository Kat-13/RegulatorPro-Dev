import React, { useState, useEffect } from 'react';
import App from './App';
import LicenseePortal from './LicenseePortal';
import LicenseeAuth from './components/LicenseeAuth';
import LicenseeDashboard from './components/LicenseeDashboard';
import PaymentSuccess from './components/PaymentSuccess';
import PaymentCancel from './components/PaymentCancel';

const AppRouter = () => {
  // Check URL to determine which portal to show (support both query params and path)
  const getInitialPortal = () => {
    const path = window.location.pathname;
    if (path.includes('/portal/licensee')) return 'licensee';
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('portal') || 'admin';
  };

  const [currentPortal, setCurrentPortal] = useState(getInitialPortal());
  const [licenseeUser, setLicenseeUser] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  // Check for stored user session
  useEffect(() => {
    const storedUser = localStorage.getItem('licenseeUser');
    if (storedUser) {
      try {
        setLicenseeUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('licenseeUser');
      }
    }
  }, []);

  // Simple portal switcher for development
  const PortalSwitcher = () => (
    <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg p-3 border border-gray-200">
      <div className="text-xs text-gray-600 mb-2">Portal Mode:</div>
      <div className="flex gap-2">
        <button
          onClick={() => {
            setCurrentPortal('admin');
            window.history.pushState({}, '', '?portal=admin');
          }}
          className={`px-3 py-1 rounded text-sm font-medium ${
            currentPortal === 'admin'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Admin
        </button>
        <button
          onClick={() => {
            setCurrentPortal('licensee');
            window.history.pushState({}, '', '?portal=licensee');
          }}
          className={`px-3 py-1 rounded text-sm font-medium ${
            currentPortal === 'licensee'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Licensee
        </button>
      </div>
    </div>
  );

  const handleLoginSuccess = (user) => {
    setLicenseeUser(user);
    localStorage.setItem('licenseeUser', JSON.stringify(user));
    setShowApplicationForm(false);
  };

  const handleLogout = () => {
    setLicenseeUser(null);
    localStorage.removeItem('licenseeUser');
    setShowApplicationForm(false);
  };

  const handleApplyForLicense = () => {
    setShowApplicationForm(true);
  };

  const handleBackToDashboard = () => {
    setShowApplicationForm(false);
  };

  // Render logic for licensee portal
  const renderLicenseePortal = () => {
    // Check for payment success/cancel routes
    const path = window.location.pathname;
    if (path.includes('/payment-success')) {
      return <PaymentSuccess onNavigate={(view) => {
        if (view === 'dashboard') {
          window.location.href = '?portal=licensee';
        } else if (view === 'applications') {
          window.location.href = '?portal=licensee';
        }
      }} />;
    }
    if (path.includes('/payment-cancel')) {
      return <PaymentCancel onNavigate={(view) => {
        if (view === 'dashboard') {
          window.location.href = '?portal=licensee';
        } else if (view === 'applications') {
          window.location.href = '?portal=licensee';
        }
      }} />;
    }

    // Not logged in - show auth
    if (!licenseeUser) {
      return <LicenseeAuth onLoginSuccess={handleLoginSuccess} />;
    }

    // Logged in and wants to apply - show application form
    if (showApplicationForm) {
      return (
        <LicenseePortal 
          user={licenseeUser}
          onBack={handleBackToDashboard}
        />
      );
    }

    // Logged in - show dashboard
    return (
      <LicenseeDashboard
        user={licenseeUser}
        onLogout={handleLogout}
        onApplyForLicense={handleApplyForLicense}
      />
    );
  };

  return (
    <>
      <PortalSwitcher />
      {currentPortal === 'licensee' ? renderLicenseePortal() : <App />}
    </>
  );
};

export default AppRouter;

