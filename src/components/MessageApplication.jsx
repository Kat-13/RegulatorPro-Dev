import React, { useState } from 'react';
import { X, Send, MessageSquare, User, Clock, Paperclip } from 'lucide-react';

const MessageApplication = ({ application, onClose, onSend }) => {
  const [messageData, setMessageData] = useState({
    subject: '',
    message: '',
    priority: 'Normal',
    sendCopy: true
  });

  // Mock conversation history
  const conversationHistory = [
    {
      id: 1,
      sender: 'John Smith',
      role: 'Administrator',
      timestamp: '2024-10-12 14:30',
      message: 'Thank you for submitting your application. We have received all required documents and will begin the review process.',
      type: 'outgoing'
    },
    {
      id: 2,
      sender: application?.name || 'Applicant',
      role: 'Applicant',
      timestamp: '2024-10-12 16:45',
      message: 'Thank you for the confirmation. I wanted to check if there are any additional documents needed for the expedited review process.',
      type: 'incoming'
    },
    {
      id: 3,
      sender: 'Emily Davis',
      role: 'Reviewer',
      timestamp: '2024-10-13 09:15',
      message: 'Your application is currently under review. We may need additional documentation regarding your business insurance coverage.',
      type: 'outgoing'
    }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMessageData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSend = () => {
    if (!messageData.message.trim()) {
      alert('Please enter a message before sending.');
      return;
    }

    const newMessage = {
      id: Date.now(),
      sender: 'John Smith',
      role: 'Administrator',
      timestamp: new Date().toLocaleString(),
      message: messageData.message,
      subject: messageData.subject,
      priority: messageData.priority,
      type: 'outgoing'
    };

    if (onSend) {
      onSend(newMessage);
    }

    // Reset form
    setMessageData({
      subject: '',
      message: '',
      priority: 'Normal',
      sendCopy: true
    });

    // Show success message
    alert('Message sent successfully!');
    onClose();
  };

  if (!application) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <MessageSquare className="w-6 h-6 text-green-600" />
            <span>Message Applicant</span>
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Applicant Info Header */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
              {application.avatar}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{application.name}</h3>
              <p className="text-sm text-gray-600">{application.organization}</p>
              <p className="text-sm text-gray-600">{application.email}</p>
            </div>
            <div className="ml-auto">
              <span className="text-sm text-gray-500">Application ID: {application.id}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Conversation History */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">
              Conversation History
            </h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {conversationHistory.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`p-4 rounded-lg ${
                    msg.type === 'outgoing' 
                      ? 'bg-blue-50 border-l-4 border-blue-500' 
                      : 'bg-gray-50 border-l-4 border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-sm text-gray-900">{msg.sender}</span>
                      <span className="text-xs text-gray-500">({msg.role})</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{msg.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - New Message */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">
              Send New Message
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  name="subject"
                  value={messageData.subject}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter message subject"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  name="priority"
                  value={messageData.priority}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={messageData.message}
                  onChange={handleInputChange}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Type your message here..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sendCopy"
                  name="sendCopy"
                  checked={messageData.sendCopy}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <label htmlFor="sendCopy" className="text-sm text-gray-700">
                  Send a copy to my email
                </label>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Paperclip className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  Drag and drop files here or click to attach
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button 
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSend}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Send Message</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageApplication;
