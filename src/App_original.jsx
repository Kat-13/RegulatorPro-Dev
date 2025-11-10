import { useState, useMemo } from 'react'
import './App.css'
import RuleBuilder from './components/RuleBuilder'
import ApplicationDetail from './components/ApplicationDetail'
import EditApplication from './components/EditApplication'
import MessageApplication from './components/MessageApplication'
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
  GitBranch
} from 'lucide-react'

// Mock data for the demo
const mockApplications = [
  {
    id: 'APP-2024-001',
    name: 'Sarah Johnson',
    applicant: 'Sarah Johnson',
    organization: 'Johnson Consulting LLC',
    email: 'sarah.johnson@email.com',
    phone: '(555) 123-4567',
    type: 'Business License',
    status: 'Under Review',
    progress: 65,
    dueDate: '2024-10-20',
    priority: 'High',
    submittedDate: '2024-10-01',
    documents: '6/8',
    documentsComplete: 6,
    feesPaid: 'Paid',
    avatar: 'SJ'
  },
  {
    id: 'APP-2024-002',
    name: 'Robert Chen',
    applicant: 'Robert Chen',
    organization: 'Chen Construction Inc.',
    email: 'robert.chen@email.com',
    phone: '(555) 234-5678',
    type: 'Construction Permit',
    status: 'Approved',
    progress: 100,
    dueDate: '2024-10-15',
    priority: 'Medium',
    submittedDate: '2024-09-25',
    documents: '12/12',
    documentsComplete: 12,
    feesPaid: 'Paid',
    avatar: 'RC'
  },
  {
    id: 'APP-2024-003',
    name: 'Maria Garcia',
    applicant: 'Maria Garcia',
    organization: 'Garcia Restaurant',
    email: 'maria.garcia@email.com',
    phone: '(555) 345-6789',
    type: 'Food Service License',
    status: 'Pending Documents',
    progress: 30,
    dueDate: '2024-10-25',
    priority: 'Low',
    submittedDate: '2024-10-05',
    documents: '2/6',
    documentsComplete: 2,
    feesPaid: 'Pending',
    avatar: 'MG'
  },
  {
    id: 'APP-2024-004',
    name: 'David Wilson',
    applicant: 'David Wilson',
    organization: 'Wilson Medical Practice',
    email: 'david.wilson@email.com',
    phone: '(555) 456-7890',
    type: 'Medical License',
    status: 'Under Review',
    progress: 80,
    dueDate: '2024-10-18',
    priority: 'High',
    submittedDate: '2024-09-28',
    documents: '12/15',
    documentsComplete: 12,
    feesPaid: 'Paid',
    avatar: 'DW'
  }
]

const mockUsers = [
  {
    id: 1,
    name: 'John Smith',
    email: 'john.smith@state.gov',
    role: 'Administrator',
    department: 'Regulatory Affairs',
    status: 'Active',
    lastLogin: '2024-10-13',
    avatar: 'JS'
  },
  {
    id: 2,
    name: 'Emily Davis',
    email: 'emily.davis@state.gov',
    role: 'Reviewer',
    department: 'Business Licensing',
    status: 'Active',
    lastLogin: '2024-10-12',
    avatar: 'ED'
  },
  {
    id: 3,
    name: 'Michael Brown',
    email: 'michael.brown@state.gov',
    role: 'Inspector',
    department: 'Construction',
    status: 'Active',
    lastLogin: '2024-10-13',
    avatar: 'MB'
  }
]

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentView, setCurrentView] = useState('dashboard')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [viewingApplication, setViewingApplication] = useState(null)
  const [editingApplication, setEditingApplication] = useState(null)
  const [messagingApplication, setMessagingApplication] = useState(null)
  const [applications, setApplications] = useState(mockApplications)
  
  // Filter and search states
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('cards') // 'cards' or 'table'

  const handleLogin = (e) => {
    e.preventDefault()
    if (email && password) {
      setIsLoggedIn(true)
    }
  }

  const handleViewApplication = (application) => {
    setViewingApplication(application)
  }

  const handleEditApplication = (application) => {
    setEditingApplication(application)
  }

  const handleMessageApplication = (application) => {
    setMessagingApplication(application)
  }

  const handleCloseApplicationDetail = () => {
    setViewingApplication(null)
  }

  const handleCloseEditApplication = () => {
    setEditingApplication(null)
  }

  const handleCloseMessageApplication = () => {
    setMessagingApplication(null)
  }

  const handleSaveApplication = (updatedApplication) => {
    setApplications(prev => 
      prev.map(app => 
        app.id === updatedApplication.id ? updatedApplication : app
      )
    )
    alert('Application updated successfully!')
  }

  const handleSendMessage = (messageData) => {
    console.log('Message sent:', messageData)
    alert('Message sent successfully!')
  }

  const handleClearFilters = () => {
    setStatusFilter('All Status')
    setTypeFilter('All Types')
    setSearchQuery('')
  }

  // Filter and search applications
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const statusMatch = statusFilter === 'All Status' || app.status === statusFilter
      const typeMatch = typeFilter === 'All Types' || app.type === typeFilter
      const searchMatch = searchQuery === '' || 
        app.applicant.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.type.toLowerCase().includes(searchQuery.toLowerCase())
      
      return statusMatch && typeMatch && searchMatch
    })
  }, [applications, statusFilter, typeFilter, searchQuery])

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">RegulatePro</h1>
            <p className="text-gray-600 mt-2">Regulatory Management Platform</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-200 font-medium"
            >
              Sign In
            </button>
          </form>
          
          <div className="text-center mt-6">
            <a href="#" className="text-blue-600 hover:text-blue-700 text-sm">
              Forgot your password?
            </a>
          </div>
          
          <div className="text-center mt-8 text-xs text-gray-500">
            © 2024 RegulatePro. All rights reserved.
          </div>
        </div>
      </div>
    )
  }

  // Sidebar Component
  const Sidebar = () => (
    <div className="w-64 bg-gray-900 text-white h-screen flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <Shield className="w-8 h-8 text-blue-400" />
          <span className="text-xl font-bold">RegulatePro</span>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>Dashboard</span>
            <span className="ml-auto bg-green-500 text-white text-xs px-2 py-1 rounded-full">1</span>
          </button>
          
          <button
            onClick={() => setCurrentView('applications')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'applications' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>Applications</span>
            <span className="ml-auto bg-blue-500 text-white text-xs px-2 py-1 rounded-full">{applications.length}</span>
          </button>
          
          <button
            onClick={() => setCurrentView('rules')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'rules' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <GitBranch className="w-5 h-5" />
            <span>Rules Engine</span>
            <span className="ml-auto bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">1</span>
          </button>
          
          <button
            onClick={() => setCurrentView('users')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'users' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <UsersIcon className="w-5 h-5" />
            <span>Users</span>
            <span className="ml-auto bg-purple-500 text-white text-xs px-2 py-1 rounded-full">{mockUsers.length}</span>
          </button>
          
          <button
            onClick={() => setCurrentView('organizations')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'organizations' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <Building className="w-5 h-5" />
            <span>Organizations</span>
            <span className="ml-auto bg-indigo-500 text-white text-xs px-2 py-1 rounded-full">5</span>
          </button>
          
          <button
            onClick={() => setCurrentView('payments')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'payments' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span>Payments</span>
            <span className="ml-auto bg-pink-500 text-white text-xs px-2 py-1 rounded-full">1</span>
          </button>
          
          <button
            onClick={() => setCurrentView('reports')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'reports' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>Reports</span>
            <span className="ml-auto bg-teal-500 text-white text-xs px-2 py-1 rounded-full">7</span>
          </button>
          
          <button
            onClick={() => setCurrentView('settings')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'settings' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <SettingsIcon className="w-5 h-5" />
            <span>Settings</span>
            <span className="ml-auto bg-orange-500 text-white text-xs px-2 py-1 rounded-full">8</span>
          </button>
        </div>
      </nav>
    </div>
  )

  // Header Component
  const Header = ({ title }) => (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
          </div>
          <button className="relative p-2 text-gray-600 hover:text-gray-900">
            <Bell className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              3
            </span>
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
              JS
            </div>
            <span className="text-gray-700 font-medium">John Smith</span>
          </div>
        </div>
      </div>
    </div>
  )

  // Dashboard Component
  const Dashboard = () => (
    <div className="p-6">
      <div className="mb-6">
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>New Application</span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Applications</p>
              <p className="text-3xl font-bold text-gray-900">{applications.length}</p>
              <p className="text-sm text-green-600">+12% from last month</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Licenses</p>
              <p className="text-3xl font-bold text-gray-900">{applications.filter(app => app.status === 'Approved').length}</p>
              <p className="text-sm text-green-600">+8% from last month</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
              <p className="text-3xl font-bold text-gray-900">{applications.filter(app => app.status === 'Under Review').length}</p>
              <p className="text-sm text-yellow-600">+3 from yesterday</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue</p>
              <p className="text-3xl font-bold text-gray-900">$45,231</p>
              <p className="text-sm text-green-600">+15% from last month</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Applications</h3>
        <div className="space-y-4">
          {applications.slice(0, 3).map((app) => (
            <div key={app.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                  {app.avatar}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{app.applicant}</p>
                  <p className="text-sm text-gray-600">{app.type}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  app.status === 'Under Review' ? 'bg-yellow-100 text-yellow-800' :
                  app.status === 'Approved' ? 'bg-green-100 text-green-800' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  {app.status}
                </span>
                <button 
                  onClick={() => handleViewApplication(app)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // Applications Component
  const Applications = () => (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setViewMode('cards')}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              viewMode === 'cards' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Cards
          </button>
          <button 
            onClick={() => setViewMode('table')}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              viewMode === 'table' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Table
          </button>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors">
          <Plus className="w-4 h-4" />
          <span>New Application</span>
        </button>
      </div>
      
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700">Filters:</span>
        </div>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="All Status">All Status</option>
          <option value="Under Review">Under Review</option>
          <option value="Approved">Approved</option>
          <option value="Pending Documents">Pending Documents</option>
        </select>
        <select 
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="All Types">All Types</option>
          <option value="Business License">Business License</option>
          <option value="Construction Permit">Construction Permit</option>
          <option value="Food Service License">Food Service License</option>
          <option value="Medical License">Medical License</option>
        </select>
        <button 
          onClick={handleClearFilters}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
        >
          Clear Filters
        </button>
      </div>

      {/* Results count */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Showing {filteredApplications.length} of {applications.length} applications
          {(statusFilter !== 'All Status' || typeFilter !== 'All Types' || searchQuery) && (
            <span className="ml-2 text-blue-600">
              (filtered{statusFilter !== 'All Status' ? ` by ${statusFilter}` : ''}
              {typeFilter !== 'All Types' ? ` and ${typeFilter}` : ''}
              {searchQuery ? ` and search "${searchQuery}"` : ''})
            </span>
          )}
        </p>
      </div>
      
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredApplications.length > 0 ? (
            filteredApplications.map((app) => (
              <div key={app.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                      {app.avatar}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{app.applicant}</h3>
                      <p className="text-sm text-gray-600">{app.organization}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    app.status === 'Under Review' ? 'bg-yellow-100 text-yellow-800' :
                    app.status === 'Approved' ? 'bg-green-100 text-green-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {app.status}
                  </span>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Application ID:</span>
                    <span className="font-medium">{app.id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">{app.type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress:</span>
                    <span className="font-medium">{app.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${app.progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Due Date:</span>
                    <span className="font-medium">{app.dueDate}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Documents:</span>
                    <span className="font-medium">{app.documents}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Fees Paid:</span>
                    <span className={`font-medium ${app.feesPaid === 'Paid' ? 'text-green-600' : 'text-red-600'}`}>
                      {app.feesPaid === 'Paid' ? '✓ Paid' : '✗ Pending'}
                    </span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleViewApplication(app)}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </button>
                  <button 
                    onClick={() => handleEditApplication(app)}
                    className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button 
                    onClick={() => handleMessageApplication(app)}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Message</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
              <p className="text-gray-600 mb-4">
                No applications match your current filter criteria.
              </p>
              <button 
                onClick={handleClearFilters}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear filters to see all applications
              </button>
            </div>
          )}
        </div>
      ) : (
        // Table view
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Applicant</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Type</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Progress</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Due Date</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                          {app.avatar}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{app.applicant}</p>
                          <p className="text-sm text-gray-600">{app.organization}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-900">{app.type}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        app.status === 'Under Review' ? 'bg-yellow-100 text-yellow-800' :
                        app.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${app.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{app.progress}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-900">{app.dueDate}</td>
                    <td className="py-4 px-6">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleViewApplication(app)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          View
                        </button>
                        <button 
                          onClick={() => handleEditApplication(app)}
                          className="text-purple-600 hover:text-purple-700 text-sm"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleMessageApplication(app)}
                          className="text-green-600 hover:text-green-700 text-sm"
                        >
                          Message
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  // Rules Engine Component
  const Rules = () => <RuleBuilder />

  // Users Component
  const Users = () => (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add User</span>
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-6 font-medium text-gray-900">User</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Role</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Department</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Status</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Last Login</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                        {user.avatar}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-gray-900">{user.role}</td>
                  <td className="py-4 px-6 text-gray-900">{user.department}</td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      {user.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-gray-900">{user.lastLogin}</td>
                  <td className="py-4 px-6">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-700 text-sm">Edit</button>
                      <button className="text-red-600 hover:text-red-700 text-sm">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  // Organizations Component
  const Organizations = () => (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Organizations</h2>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-600">Organizations management interface coming soon...</p>
      </div>
    </div>
  )

  // Payments Component
  const Payments = () => (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Payments</h2>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-600">Payment processing interface coming soon...</p>
      </div>
    </div>
  )

  // Reports Component
  const Reports = () => (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Reports</h2>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-600">Reporting and analytics interface coming soon...</p>
      </div>
    </div>
  )

  // Settings Component
  const Settings = () => (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Settings</h2>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-600">System settings interface coming soon...</p>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />
      case 'applications':
        return <Applications />
      case 'rules':
        return <Rules />
      case 'users':
        return <Users />
      case 'organizations':
        return <Organizations />
      case 'payments':
        return <Payments />
      case 'reports':
        return <Reports />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard />
    }
  }

  const getPageTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Dashboard'
      case 'applications':
        return 'Applications'
      case 'rules':
        return 'Rules Engine'
      case 'users':
        return 'Users'
      case 'organizations':
        return 'Organizations'
      case 'payments':
        return 'Payments'
      case 'reports':
        return 'Reports'
      case 'settings':
        return 'Settings'
      default:
        return 'Dashboard'
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={getPageTitle()} />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
      
      {viewingApplication && (
        <ApplicationDetail 
          application={viewingApplication} 
          onClose={handleCloseApplicationDetail} 
        />
      )}
      
      {editingApplication && (
        <EditApplication 
          application={editingApplication} 
          onClose={handleCloseEditApplication}
          onSave={handleSaveApplication}
        />
      )}
      
      {messagingApplication && (
        <MessageApplication 
          application={messagingApplication} 
          onClose={handleCloseMessageApplication}
          onSend={handleSendMessage}
        />
      )}
    </div>
  )
}

export default App
