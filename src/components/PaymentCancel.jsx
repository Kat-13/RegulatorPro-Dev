import React from 'react';
import { XCircle, ArrowLeft, Home } from 'lucide-react';

const PaymentCancel = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Cancel Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Cancel Icon */}
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-yellow-100 p-3">
              <XCircle className="w-16 h-16 text-yellow-600" />
            </div>
          </div>

          {/* Cancel Message */}
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Payment Cancelled
          </h1>
          <p className="text-center text-gray-600 mb-6">
            Your payment was cancelled. No charges have been made to your account.
          </p>

          {/* Information Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>What happened?</strong><br />
              You cancelled the payment process before it was completed. Your application has been saved as a draft and is awaiting payment.
            </p>
          </div>

          {/* Next Steps */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Next Steps:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>You can complete the payment anytime from your dashboard</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Your application will not be processed until payment is received</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>If you have questions, please contact support</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => onNavigate && onNavigate('applications')}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Return to Applications</span>
            </button>
            <button
              onClick={() => onNavigate && onNavigate('dashboard')}
              className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
            >
              <Home className="w-5 h-5" />
              <span>Go to Dashboard</span>
            </button>
          </div>
        </div>

        {/* Support Notice */}
        <p className="text-center text-sm text-gray-500 mt-4">
          Need help? Contact support at support@regulatepro.com
        </p>
      </div>
    </div>
  );
};

export default PaymentCancel;

