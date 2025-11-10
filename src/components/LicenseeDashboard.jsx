import React, { useState, useEffect } from 'react'
import { FileText, AlertCircle, CheckCircle, Clock, Plus } from 'lucide-react'

const API_BASE_URL = '/api'

function LicenseeDashboard({ user, onLogout, onApplyForLicense }) {
  const [licenses, setLicenses] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserData()
  }, [user])

  const fetchUserData = async () => {
    try {
      // Fetch user's licenses
      const licensesRes = await fetch(`${API_BASE_URL}/users/${user.id}/licenses`)
      if (licensesRes.ok) {
        const licensesData = await licensesRes.json()
        setLicenses(licensesData.licenses || [])
      }

      // Fetch user's applications
      const appsRes = await fetch(`${API_BASE_URL}/users/${user.id}/applications`)
      if (appsRes.ok) {
        const appsData = await appsRes.json()
        setApplications(appsData.applications || [])
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'text-green-600 bg-green-50'
      case 'expired': return 'text-red-600 bg-red-50'
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'suspended': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const isExpiringSoon = (expirationDate) => {
    if (!expirationDate) return false
    const expDate = new Date(expirationDate)
    const today = new Date()
    const daysUntilExpiration = Math.floor((expDate - today) / (1000 * 60 * 60 * 24))
    return daysUntilExpiration > 0 && daysUntilExpiration <= 90
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading your dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Welcome, {user.firstName} {user.lastName}
              </h1>
              <p className="text-sm text-gray-500 mt-1">{user.email}</p>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <button
            onClick={onApplyForLicense}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            Apply for New License
          </button>
        </div>

        {/* Licenses Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Licenses</h2>
          
          {licenses.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">You don't have any active licenses yet.</p>
              <p className="text-sm text-gray-400 mt-1">Apply for your first license to get started.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {licenses.map((license) => (
                <div
                  key={license.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{license.license_type}</h3>
                      <p className="text-sm text-gray-500 mt-1">License #{license.license_number}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(license.status)}`}>
                      {license.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    {license.state && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">State:</span>
                        <span className="text-gray-900">{license.state}</span>
                      </div>
                    )}
                    {license.issue_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Issued:</span>
                        <span className="text-gray-900">{new Date(license.issue_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {license.expiration_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Expires:</span>
                        <span className="text-gray-900">{new Date(license.expiration_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {isExpiringSoon(license.expiration_date) && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center text-amber-600 text-sm">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        <span>Renewal due soon</span>
                      </div>
                      <button className="mt-2 w-full px-4 py-2 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 transition-colors text-sm font-medium">
                        Renew License
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Applications Section */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Applications</h2>
          
          {applications.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No applications submitted yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Application Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {app.application_type?.name || 'License Application'}
                        </div>
                        {app.is_renewal && (
                          <div className="text-xs text-gray-500">Renewal</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(app.submitted_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                          {app.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default LicenseeDashboard

