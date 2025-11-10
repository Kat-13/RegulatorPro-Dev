import React, { useEffect, useState } from 'react';
import { CheckCircle, Home, FileText } from 'lucide-react';

const PaymentSuccess = ({ onNavigate }) => {
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get payment_id or application_id from URL
    const urlParams = new URLSearchParams(window.location.search);
    const paymentId = urlParams.get('payment_id');
    const applicationId = urlParams.get('application_id');

    if (paymentId) {
      fetchPaymentDetails(paymentId);
    } else if (applicationId) {
      fetchApplicationPayment(applicationId);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchPaymentDetails = async (paymentId) => {
    try {
      const response = await fetch(`/api/payments/${paymentId}`);
      const data = await response.json();
      
      if (response.ok && data.payment) {
        setPaymentDetails(data.payment);
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicationPayment = async (applicationId) => {
    try {
      const response = await fetch(`/api/payments/application/${applicationId}`);
      const data = await response.json();
      
      if (response.ok && data.payments && data.payments.length > 0) {
        // Get the most recent payment
        setPaymentDetails(data.payments[data.payments.length - 1]);
      }
    } catch (error) {
      console.error('Error fetching application payment:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Success Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-center text-gray-600 mb-6">
            Your payment has been processed successfully.
          </p>

          {/* Payment Details */}
          {paymentDetails && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Application ID:</span>
                <span className="font-medium text-gray-900">
                  {paymentDetails.application_id || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount Paid:</span>
                <span className="font-medium text-gray-900">
                  ${paymentDetails.total_amount?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payment ID:</span>
                <span className="font-mono text-xs text-gray-700">
                  {paymentDetails.id || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Paid
                </span>
              </div>
            </div>
          )}

          {/* Information Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>What's next?</strong><br />
              Your application is now under review. You'll receive an email notification once the review is complete.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => onNavigate && onNavigate('dashboard')}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Home className="w-5 h-5" />
              <span>Go to Dashboard</span>
            </button>
            <button
              onClick={() => onNavigate && onNavigate('applications')}
              className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
            >
              <FileText className="w-5 h-5" />
              <span>View My Applications</span>
            </button>
          </div>
        </div>

        {/* Receipt Notice */}
        <p className="text-center text-sm text-gray-500 mt-4">
          A receipt has been sent to your email address.
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;

