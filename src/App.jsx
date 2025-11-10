import React, { useState, useEffect } from 'react'
import './App.css'

import ApplicationDetail from './components/ApplicationDetail'
import EditApplication from './components/EditApplication'
import MessageApplication from './components/MessageApplication'
import FormEditor from './components/FormEditor'
import Users from './components/Users'
import { 
  Shield, 
  FileText, 
  Users as UsersIcon, 
  Building, 
  CreditCard, 
  BarChart3, 
  Settings as SettingsIcon, 
  Search, 
  Bell, 
  Plus,
  Eye,
  Edit,
  MessageSquare,
  Download,
  Filter,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  GitBranch,
  Database,
  Loader,
  Edit3
} from 'lucide-react'

const API_BASE_URL = '/api'

function App() {
  const [currentView, setCurrentView] = useState('dashboard')
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [applications, setApplications] = useState([])
  const [users, setUsers] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Fetch data from backend
  useEffect(() => {
    fetchApplications()
    fetchUsers()
    fetchProfiles()
  }, [])

  const fetchApplications = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/license-applications`)
      const data = await response.json()
      if (data.success && data.applications) {
        setApplications(data.applications)
      } else {
        setApplications([])
      }
    } catch (err) {
      setError('Failed to fetch applications')
      console.error('Error fetching applications:', err)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users`)
      const data = await response.json()
      setUsers(data)
    } catch (err) {
      setError('Failed to fetch users')
      console.error('Error fetching users:', err)
    }
  }

  const fetchProfiles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/profiles`)
      const data = await response.json()
      setProfiles(data)
      setLoading(false)
    } catch (err) {
      setError('Failed to fetch profiles')
      console.error('Error fetching profiles:', err)
      setLoading(false)
    }
  }

  const handleLogin = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsLoggedIn(true)
        return true
      } else {
        console.error('Login failed:', data.message)
        return false
      }
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setCurrentView('dashboard')
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'text-green-600 bg-green-100'
      case 'Under Review': return 'text-yellow-600 bg-yellow-100'
      case 'Pending Documents': return 'text-orange-600 bg-orange-100'
      case 'Rejected': return 'text-red-600 bg-red-100'
      case 'Draft': return 'text-gray-600 bg-gray-100'
      default: return 'text-blue-600 bg-blue-100'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved': return <CheckCircle className="w-4 h-4" />
      case 'Under Review': return <Clock className="w-4 h-4" />
      case 'Pending Documents': return <AlertCircle className="w-4 h-4" />
      case 'Rejected': return <XCircle className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const formatApplicationForDisplay = (app) => {
    const userName = app.user ? `${app.user.first_name} ${app.user.last_name}` : 'Unknown User'
    const initials = app.user ? `${app.user.first_name?.[0] || ''}${app.user.last_name?.[0] || ''}` : 'UN'
    
    // Normalize status to match expected format
    const normalizedStatus = app.status.charAt(0).toUpperCase() + app.status.slice(1)
    
    return {
      id: `APP-${String(app.id).padStart(4, '0')}`,
      dbId: app.id,  // Keep the numeric database ID for API calls
      name: userName,
      applicant: userName,
      email: app.user?.email || 'No email',
      type: app.application_type?.name || 'License Application',
      status: normalizedStatus,
      progress: normalizedStatus === 'Approved' ? 100 : normalizedStatus === 'Under Review' ? 65 : 30,
      submittedDate: app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : 'N/A',
      dueDate: app.submitted_at ? new Date(Date.parse(app.submitted_at) + 30*24*60*60*1000).toLocaleDateString() : 'N/A',
      priority: 'Medium',
      documents: '8/10',
      documentsComplete: 8,
      feesPaid: normalizedStatus === 'Approved' ? 'Paid' : 'Pending',
      avatar: initials,
      rawData: app
    }
  }

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-xl w-96">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">RegulatePro</h1>
            <p className="text-gray-600">Regulatory Management Platform</p>
          </div>
          
          <form onSubmit={async (e) => {
            e.preventDefault()
            const formData = new FormData(e.target)
            const email = formData.get('email')
            const password = formData.get('password')
            const success = await handleLogin(email, password)
            if (!success) {
              alert('Invalid credentials')
            }
          }}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
                defaultValue="admin@regulatepro.com"
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                name="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
                defaultValue="admin123"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Sign In
            </button>
          </form>
          
          <div className="mt-4 text-center">
            <a href="#" className="text-sm text-blue-600 hover:underline">Forgot your password?</a>
          </div>
          
          <div className="mt-6 text-center text-xs text-gray-500">
            © 2024 RegulatePro. All rights reserved.
          </div>
        </div>
      </div>
    )
  }

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading platform data...</p>
        </div>
      </div>
    )
  }

  // Error Screen
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const displayApplications = applications.map(formatApplicationForDisplay)

  // Statistics calculations
  const stats = {
    totalApplications: applications.length,
    activeLicenses: applications.filter(app => app.status === 'Approved').length,
    pendingReviews: applications.filter(app => app.status === 'Under Review' || app.status === 'Pending Documents').length,
    revenue: applications.filter(app => app.status === 'Approved').length * 15000 // Estimated revenue
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your regulatory platform.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Applications</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalApplications}</p>
              <p className="text-xs text-green-600">+12% from last month</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Licenses</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeLicenses}</p>
              <p className="text-xs text-green-600">+8% from last month</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingReviews}</p>
              <p className="text-xs text-orange-600">+3 from yesterday</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${stats.revenue.toLocaleString()}</p>
              <p className="text-xs text-green-600">+15% from last month</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Recent Applications</h2>
          </div>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            {displayApplications.slice(0, 3).map((app) => (
              <div key={app.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">{app.avatar}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{app.name}</p>
                    <p className="text-sm text-gray-600">{app.type}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                    {getStatusIcon(app.status)}
                    <span className="ml-1">{app.status}</span>
                  </span>
                  
                  <button 
                    onClick={() => {
                      setSelectedApplication(app)
                      setCurrentView('application-detail')
                    }}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Backend Connection Status */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-green-600" />
          <span className="text-sm font-medium text-green-800">Backend Connected</span>
          <span className="text-xs text-green-600">
            • {applications.length} applications loaded
            • {users.length} users registered
            • {profiles.length} profiles active
          </span>
        </div>
      </div>
    </div>
  )



  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return renderDashboard()
      case 'form-editor':
        return <FormEditor />
      case 'rules-engine':
        return <div className="p-6"><div className="text-gray-500">Rules Engine has been removed</div></div>
      case 'users':
        return <Users />
      case 'application-detail':
        return selectedApplication ? (
          <ApplicationDetail 
            application={selectedApplication} 
            onClose={() => {
              setSelectedApplication(null)
              setCurrentView('dashboard')
            }}
            onEdit={(app) => {
              setSelectedApplication(app)
              setCurrentView('edit-application')
            }}
            onMessage={(app) => {
              setSelectedApplication(app)
              setCurrentView('message-application')
            }}
            onDelete={async (app) => {
              if (window.confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
                try {
                  const appId = app.dbId || app.rawData?.id;
                  const response = await fetch(`${API_BASE_URL}/license-applications/${appId}`, {
                    method: 'DELETE'
                  });
                  
                  if (response.ok) {
                    // Refresh applications list
                    fetchApplications();
                    setSelectedApplication(null);
                    setCurrentView('dashboard');
                  } else {
                    alert('Failed to delete application');
                  }
                } catch (error) {
                  console.error('Error deleting application:', error);
                  alert('Error deleting application');
                }
              }
            }}
          />
        ) : renderApplications()
      case 'edit-application':
        return selectedApplication ? (
          <EditApplication 
            application={selectedApplication} 
            onClose={() => setCurrentView('application-detail')}
            onSave={async (updatedApp) => {
              try {
                // Use dbId (numeric) not id (formatted string like APP-0002)
                const appId = updatedApp.dbId || updatedApp.rawData?.id || updatedApp.id;
                const response = await fetch(`${API_BASE_URL}/license-applications/${appId}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    status: updatedApp.status,
                    review_notes: updatedApp.notes
                  })
                });
                
                if (response.ok) {
                  const result = await response.json();
                  // Update the selected application with the returned data
                  setSelectedApplication(result.application);
                  // Refresh the applications list
                  fetchApplications();
                }
                
                setCurrentView('application-detail');
              } catch (error) {
                console.error('Error updating application:', error);
                setCurrentView('application-detail');
              }
            }}
          />
        ) : renderApplications()
      case 'message-application':
        return selectedApplication ? (
          <MessageApplication 
            application={selectedApplication} 
            onClose={() => setCurrentView('application-detail')}
            onSend={(message) => {
              // Message sent successfully, could add to conversation history here
              console.log('Message sent:', message);
            }}
          />
        ) : renderApplications()
      default:
        return renderDashboard()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white">
        <div className="flex items-center justify-center h-16 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <Shield className="w-8 h-8 text-blue-400" />
            <span className="text-xl font-bold">RegulatePro</span>
          </div>
        </div>
        
        <nav className="mt-8">
          <div className="px-4 space-y-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3, badge: '1' },
              { id: 'form-editor', label: 'Form Editor', icon: Edit3, badge: '5' },

              { id: 'users', label: 'Users', icon: UsersIcon, badge: '3' },
              { id: 'payments', label: 'Payments', icon: CreditCard, badge: '1' },
              { id: 'reports', label: 'Reports', icon: BarChart3, badge: '7' },
              { id: 'settings', label: 'Settings', icon: SettingsIcon, badge: '8' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left hover:bg-slate-800 transition-colors ${
                  currentView === item.id ? 'bg-slate-800 text-blue-400' : 'text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b">
          <div className="flex justify-between items-center px-6 py-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search applications..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-600 hover:text-gray-900">
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">JS</span>
                </div>
                <span className="text-sm font-medium text-gray-700">John Smith</span>
                <button 
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}

export default App
