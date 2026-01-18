import { useState, useEffect } from 'react'
import AdminLayout from '../components/AdminLayout'
import { 
  Mail,
  Edit,
  Eye,
  X,
  Check,
  RefreshCw,
  Settings,
  Send,
  Ban,
  CheckCircle,
  Clock,
  Wallet,
  UserPlus,
  Shield,
  Search,
  Trash2,
  RotateCcw
} from 'lucide-react'
import { API_URL } from '../config/api'

const AdminEmailTemplates = () => {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [editForm, setEditForm] = useState({ subject: '', htmlContent: '' })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [smtpSettings, setSmtpSettings] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    smtpSecure: false,
    fromEmail: '',
    fromName: 'Trading Platform',
    otpVerificationEnabled: true,
    otpExpiryMinutes: 10
  })
  const [smtpConnected, setSmtpConnected] = useState(false)
  const [smtpEnabled, setSmtpEnabled] = useState(false)
  const [togglingSmtp, setTogglingSmtp] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTestEmail, setSendingTestEmail] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [testingTemplate, setTestingTemplate] = useState(null)
  const [templateTestEmail, setTemplateTestEmail] = useState('')
  const [sendingTemplateTest, setSendingTemplateTest] = useState(false)

  useEffect(() => {
    fetchTemplates()
    fetchSettings()
  }, [])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/email-templates`)
      const data = await res.json()
      if (data.success) {
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
    setLoading(false)
  }

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/email-templates/settings/smtp`)
      const data = await res.json()
      if (data.success && data.settings) {
        setSmtpSettings(data.settings)
        setSmtpConnected(!!data.settings.smtpHost && !!data.settings.smtpUser)
        setSmtpEnabled(data.settings.smtpEnabled || false)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const toggleSmtp = async () => {
    setTogglingSmtp(true)
    try {
      const res = await fetch(`${API_URL}/email-templates/settings/toggle-smtp`, { method: 'PUT' })
      const data = await res.json()
      if (data.success) {
        setSmtpEnabled(data.smtpEnabled)
        setSuccess(data.message)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Error toggling SMTP')
      }
    } catch (error) {
      setError('Error toggling SMTP')
    }
    setTogglingSmtp(false)
  }

  const seedTemplates = async () => {
    try {
      const res = await fetch(`${API_URL}/email-templates/seed`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setSuccess('Default templates seeded successfully!')
        fetchTemplates()
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (error) {
      setError('Error seeding templates')
    }
  }

  const resetTemplates = async () => {
    if (!confirm('Are you sure you want to reset ALL templates to defaults? This will delete any customizations.')) return
    try {
      const res = await fetch(`${API_URL}/email-templates/reset`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setSuccess('All templates reset to defaults!')
        fetchTemplates()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Error resetting templates')
      }
    } catch (error) {
      setError('Error resetting templates')
    }
  }

  const deleteTemplate = async (template) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return
    try {
      const res = await fetch(`${API_URL}/email-templates/${template._id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setSuccess('Template deleted!')
        fetchTemplates()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Error deleting template')
      }
    } catch (error) {
      setError('Error deleting template')
    }
  }

  const openTestModal = (template) => {
    setTestingTemplate(template)
    setTemplateTestEmail('')
    setShowTestModal(true)
  }

  const sendTemplateTest = async () => {
    if (!templateTestEmail || !testingTemplate) return
    setSendingTemplateTest(true)
    try {
      const res = await fetch(`${API_URL}/email-templates/${testingTemplate._id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail: templateTestEmail })
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(data.message)
        setShowTestModal(false)
      } else {
        setError(data.message || 'Failed to send test email')
      }
      setTimeout(() => { setSuccess(''); setError('') }, 3000)
    } catch (error) {
      setError('Error sending test email')
    }
    setSendingTemplateTest(false)
  }

  const handleToggle = async (template) => {
    try {
      const res = await fetch(`${API_URL}/email-templates/${template._id}/toggle`, { method: 'PUT' })
      const data = await res.json()
      if (data.success) {
        fetchTemplates()
      }
    } catch (error) {
      setError('Error toggling template')
    }
  }

  const openEditModal = (template) => {
    setSelectedTemplate(template)
    setEditForm({
      subject: template.subject,
      htmlContent: template.htmlContent
    })
    setShowEditModal(true)
  }

  const openPreviewModal = (template) => {
    setSelectedTemplate(template)
    setShowPreviewModal(true)
  }

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/email-templates/${selectedTemplate._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      const data = await res.json()
      if (data.success) {
        setSuccess('Template saved successfully!')
        setShowEditModal(false)
        fetchTemplates()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message)
      }
    } catch (error) {
      setError('Error saving template')
    }
    setSaving(false)
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/email-templates/settings/smtp`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpSettings)
      })
      const data = await res.json()
      if (data.success) {
        setSuccess('Settings saved successfully!')
        setShowSettingsModal(false)
        fetchSettings()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message)
      }
    } catch (error) {
      setError('Error saving settings')
    }
    setSaving(false)
  }

  const testConnection = async () => {
    setTestingConnection(true)
    try {
      const res = await fetch(`${API_URL}/email-templates/settings/test`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setSuccess('SMTP connection successful!')
        setSmtpConnected(true)
      } else {
        setError(data.message || 'Connection failed')
        setSmtpConnected(false)
      }
      setTimeout(() => { setSuccess(''); setError('') }, 3000)
    } catch (error) {
      setError('Connection test failed')
      setSmtpConnected(false)
    }
    setTestingConnection(false)
  }

  const sendTestEmail = async () => {
    if (!testEmail) {
      setError('Please enter an email address')
      return
    }
    setSendingTestEmail(true)
    try {
      const res = await fetch(`${API_URL}/email-templates/settings/send-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail: testEmail })
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(data.message)
        setTestEmail('')
      } else {
        setError(data.message || 'Failed to send test email')
      }
      setTimeout(() => { setSuccess(''); setError('') }, 3000)
    } catch (error) {
      setError('Error sending test email')
    }
    setSendingTestEmail(false)
  }

  const getTemplateIcon = (slug) => {
    const icons = {
      'email_verification': <Mail size={20} className="text-blue-500" />,
      'welcome': <UserPlus size={20} className="text-green-500" />,
      'deposit_pending': <Clock size={20} className="text-yellow-500" />,
      'deposit_success': <Wallet size={20} className="text-green-500" />,
      'withdrawal_pending': <Clock size={20} className="text-orange-500" />,
      'withdrawal_success': <CheckCircle size={20} className="text-green-500" />,
      'account_banned': <Ban size={20} className="text-red-500" />,
      'account_unbanned': <CheckCircle size={20} className="text-green-500" />
    }
    return icons[slug] || <Mail size={20} className="text-gray-500" />
  }

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.slug.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AdminLayout title="Email Templates" subtitle="Manage email templates for verification, deposits, withdrawals, and account notifications">
      {/* SMTP Master Toggle */}
      <div className="flex items-center justify-between mb-6 bg-dark-800 rounded-xl p-4 border border-gray-800">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${smtpEnabled ? 'bg-green-500/20' : 'bg-gray-700'}`}>
            <Mail size={20} className={smtpEnabled ? 'text-green-500' : 'text-gray-500'} />
          </div>
          <div>
            <h3 className="text-white font-medium">Email System (SMTP)</h3>
            <p className="text-gray-500 text-xs">
              {smtpEnabled ? 'Enabled - OTP verification active during signup' : 'Disabled - No email verification required'}
            </p>
          </div>
        </div>
        <button
          onClick={toggleSmtp}
          disabled={togglingSmtp}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            smtpEnabled 
              ? 'bg-green-500 text-white hover:bg-green-600' 
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          {togglingSmtp ? <RefreshCw size={14} className="animate-spin" /> : null}
          {smtpEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Content - Faded when SMTP is OFF */}
      <div className={`${!smtpEnabled ? 'opacity-40 pointer-events-none' : ''} transition-opacity`}>
      
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-dark-700 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 w-64"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowSettingsModal(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm ${
              smtpConnected 
                ? 'bg-green-500/20 border-green-500/50 text-green-500' 
                : 'bg-dark-700 border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            {smtpConnected ? <Check size={14} /> : <Settings size={14} />}
            {smtpConnected ? 'SMTP Connected' : 'SMTP Settings'}
          </button>
          <button
            onClick={seedTemplates}
            className="flex items-center gap-2 bg-dark-700 text-white px-3 py-2 rounded-lg hover:bg-dark-600 transition-colors border border-gray-700 text-sm"
          >
            <RefreshCw size={14} /> Seed Templates
          </button>
          <button
            onClick={resetTemplates}
            className="flex items-center gap-2 bg-red-500/20 text-red-400 px-3 py-2 rounded-lg hover:bg-red-500/30 transition-colors border border-red-500/50 text-sm"
          >
            <RotateCcw size={14} /> Reset DB
          </button>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-500 flex items-center gap-2">
          <Check size={18} /> {success}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-500 flex items-center gap-2">
          <X size={18} /> {error}
        </div>
      )}

      {/* Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={24} className="text-gray-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <div key={template._id} className="bg-dark-800 rounded-xl p-5 border border-gray-800 hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
                    {getTemplateIcon(template.slug)}
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{template.name}</h3>
                    <p className="text-gray-500 text-xs">{template.slug}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${template.isEnabled ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-400'}`}>
                  {template.isEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              
              <p className="text-gray-400 text-sm mb-3 line-clamp-2">{template.description}</p>
              
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                <span>◇</span>
                <span>{template.variables?.length || 0} variables</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openPreviewModal(template)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-dark-700 text-gray-300 rounded-lg hover:bg-dark-600 transition-colors text-sm"
                >
                  <Eye size={14} /> Preview
                </button>
                <button
                  onClick={() => openEditModal(template)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                >
                  <Edit size={14} /> Edit
                </button>
                <button
                  onClick={() => openTestModal(template)}
                  className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                  title="Send test email"
                >
                  <Send size={14} />
                </button>
                <button
                  onClick={() => deleteTemplate(template)}
                  className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                  title="Delete template"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
                <span className="text-gray-500 text-sm">Enabled</span>
                <button
                  onClick={() => handleToggle(template)}
                  className={`w-12 h-6 rounded-full transition-colors ${template.isEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${template.isEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          ))}

          {filteredTemplates.length === 0 && (
            <div className="col-span-3 bg-dark-800 rounded-xl p-12 border border-gray-800 text-center">
              <Mail size={48} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No email templates found</p>
              <button
                onClick={seedTemplates}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Seed Default Templates
              </button>
            </div>
          )}
        </div>
      )}

      </div>
      {/* End of SMTP-controlled content */}

      {/* Edit Modal */}
      {showEditModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Edit Template</h2>
                <p className="text-gray-500 text-sm">{selectedTemplate.name}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Subject Line</label>
                <input
                  type="text"
                  value={editForm.subject}
                  onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Available Variables</label>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.variables?.map((v) => (
                    <span key={v} className="px-2 py-1 bg-dark-700 text-blue-400 rounded text-xs font-mono">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">HTML Content</label>
                <textarea
                  value={editForm.htmlContent}
                  onChange={(e) => setEditForm({ ...editForm, htmlContent: e.target.value })}
                  rows={20}
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-dark-700 text-white py-3 rounded-lg hover:bg-dark-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={saving}
                className="flex-1 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Preview: {selectedTemplate.name}</h2>
                <p className="text-gray-500 text-sm">Subject: {selectedTemplate.subject}</p>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-gray-100">
              <iframe
                srcDoc={selectedTemplate.htmlContent}
                className="w-full h-full min-h-[500px]"
                title="Email Preview"
              />
            </div>

            <div className="p-4 border-t border-gray-800">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="w-full bg-dark-700 text-white py-3 rounded-lg hover:bg-dark-600 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMTP Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Email Settings</h2>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Settings size={18} /> SMTP Configuration
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-gray-400 text-sm mb-2">SMTP Host</label>
                  <input
                    type="text"
                    value={smtpSettings.smtpHost}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtpHost: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Port</label>
                  <input
                    type="number"
                    value={smtpSettings.smtpPort}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtpPort: parseInt(e.target.value) })}
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-gray-400 text-sm">Secure (SSL/TLS)</label>
                  <button
                    onClick={() => setSmtpSettings({ ...smtpSettings, smtpSecure: !smtpSettings.smtpSecure })}
                    className={`w-12 h-6 rounded-full transition-colors ${smtpSettings.smtpSecure ? 'bg-green-500' : 'bg-gray-600'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${smtpSettings.smtpSecure ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Username</label>
                  <input
                    type="text"
                    value={smtpSettings.smtpUser}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtpUser: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Password</label>
                  <input
                    type="password"
                    value={smtpSettings.smtpPass}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtpPass: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">From Email</label>
                  <input
                    type="email"
                    value={smtpSettings.fromEmail}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, fromEmail: e.target.value })}
                    placeholder="noreply@example.com"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">From Name</label>
                  <input
                    type="text"
                    value={smtpSettings.fromName}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, fromName: e.target.value })}
                    placeholder="Trading Platform"
                    className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={testConnection}
                disabled={testingConnection}
                className="w-full flex items-center justify-center gap-2 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors border border-gray-700"
              >
                {testingConnection ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                Test Connection
              </button>

              {/* Send Test Email */}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter email to send test"
                  className="flex-1 bg-dark-700 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                />
                <button
                  onClick={sendTestEmail}
                  disabled={sendingTestEmail || !testEmail}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 text-sm"
                >
                  {sendingTestEmail ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  Send Test
                </button>
              </div>

              <div className="border-t border-gray-700 pt-4 mt-4">
                <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
                  <Shield size={18} /> OTP Verification Settings
                </h3>

                <div className="bg-dark-700 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Email OTP Verification</p>
                      <p className="text-gray-500 text-xs">Require email verification during signup</p>
                    </div>
                    <button
                      onClick={() => setSmtpSettings({ ...smtpSettings, otpVerificationEnabled: !smtpSettings.otpVerificationEnabled })}
                      className={`w-12 h-6 rounded-full transition-colors ${smtpSettings.otpVerificationEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${smtpSettings.otpVerificationEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">OTP Expiry (minutes)</label>
                    <input
                      type="number"
                      value={smtpSettings.otpExpiryMinutes}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, otpExpiryMinutes: parseInt(e.target.value) })}
                      min={1}
                      max={60}
                      className="w-full bg-dark-600 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 bg-dark-700 text-white py-3 rounded-lg hover:bg-dark-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="flex-1 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Test Modal */}
      {showTestModal && testingTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Send Test Email</h2>
                <p className="text-gray-500 text-sm">{testingTemplate.name}</p>
              </div>
              <button onClick={() => setShowTestModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-gray-400 text-sm">
                Send a test email using this template with sample data.
              </p>
              
              <div>
                <label className="block text-gray-400 text-sm mb-2">Email Address</label>
                <input
                  type="email"
                  value={templateTestEmail}
                  onChange={(e) => setTemplateTestEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full bg-dark-700 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="bg-dark-700 rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-2">Sample variables will be used:</p>
                <div className="flex flex-wrap gap-1">
                  {testingTemplate.variables?.slice(0, 5).map((v) => (
                    <span key={v} className="px-2 py-0.5 bg-dark-600 text-gray-400 rounded text-xs">
                      {v}
                    </span>
                  ))}
                  {testingTemplate.variables?.length > 5 && (
                    <span className="text-gray-500 text-xs">+{testingTemplate.variables.length - 5} more</span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => setShowTestModal(false)}
                className="flex-1 bg-dark-700 text-white py-3 rounded-lg hover:bg-dark-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sendTemplateTest}
                disabled={sendingTemplateTest || !templateTestEmail}
                className="flex-1 bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sendingTemplateTest ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                Send Test
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminEmailTemplates
