import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Trophy, Target, TrendingUp, Shield, Clock, AlertTriangle,
  Check, ChevronRight, Zap, Award, DollarSign, ArrowLeft, FileText, X
} from 'lucide-react'
import { API_URL } from '../config/api'

export default function BuyChallengePage() {
  const navigate = useNavigate()
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [settings, setSettings] = useState({})
  const [buying, setBuying] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  
  // Selection state
  const [selectedType, setSelectedType] = useState(null) // 0, 1, 2 steps
  const [selectedSize, setSelectedSize] = useState(null)
  const [selectedChallenge, setSelectedChallenge] = useState(null)
  
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    fetchChallenges()
    fetchSettings()
  }, [])

  const fetchChallenges = async () => {
    try {
      const res = await fetch(`${API_URL}/prop/challenges`)
      const data = await res.json()
      if (data.success) {
        setChallenges(data.challenges || [])
        setEnabled(data.enabled)
      }
    } catch (error) {
      console.error('Error fetching challenges:', error)
    }
    setLoading(false)
  }

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/prop/status`)
      const data = await res.json()
      if (data.success) {
        setSettings(data)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  // Group challenges by type
  const challengeTypes = [...new Set(challenges.map(c => c.stepsCount))].sort()
  const accountSizes = selectedType !== null 
    ? [...new Set(challenges.filter(c => c.stepsCount === selectedType).map(c => c.fundSize))].sort((a, b) => a - b)
    : []

  // Find matching challenge
  useEffect(() => {
    if (selectedType !== null && selectedSize !== null) {
      const match = challenges.find(c => c.stepsCount === selectedType && c.fundSize === selectedSize)
      setSelectedChallenge(match || null)
    } else {
      setSelectedChallenge(null)
    }
  }, [selectedType, selectedSize, challenges])

  const handleBuyChallenge = async () => {
    if (!user._id) {
      alert('Please login to buy a challenge')
      return
    }
    if (!selectedChallenge) {
      alert('Please select a challenge')
      return
    }
    if (!agreedToTerms) {
      alert('Please agree to the terms and conditions')
      return
    }

    setBuying(true)
    try {
      const res = await fetch(`${API_URL}/prop/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          challengeId: selectedChallenge._id,
          paymentId: `PAY${Date.now()}`,
          couponCode: couponCode || undefined
        })
      })
      const data = await res.json()
      if (data.success) {
        alert('Challenge purchased successfully!')
        navigate('/account')
      } else {
        alert(data.message || 'Failed to purchase challenge')
      }
    } catch (error) {
      console.error('Error buying challenge:', error)
      alert('Error purchasing challenge')
    }
    setBuying(false)
  }

  const getStepLabel = (steps) => {
    if (steps === 0) return 'Instant Fund'
    if (steps === 1) return 'One Step'
    return 'Two Step'
  }

  const getStepColor = (steps) => {
    if (steps === 0) return 'bg-green-500'
    if (steps === 1) return 'bg-blue-500'
    return 'bg-purple-500'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-green"></div>
      </div>
    )
  }

  if (!enabled) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Trophy size={64} className="text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Challenges Coming Soon</h2>
          <p className="text-gray-400 mb-6">Prop trading challenges are not available at the moment.</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-accent-green text-black font-medium rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <div className="bg-dark-800 border-b border-gray-800 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <Trophy size={28} className="text-accent-green" />
            <div>
              <h1 className="text-xl font-bold text-white">New Challenge</h1>
              <p className="text-gray-500 text-sm">Choose the type of challenge you want to take</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 lg:p-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Challenge Type */}
            <div className="bg-dark-800 rounded-xl p-6 border border-gray-800">
              <h2 className="text-white font-semibold mb-2">Challenge Type</h2>
              <p className="text-gray-500 text-sm mb-4">Choose the type of challenge you want to take</p>
              <div className="grid grid-cols-3 gap-3">
                {challengeTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedType(type)
                      setSelectedSize(null)
                    }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedType === type
                        ? 'border-accent-green bg-accent-green/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${selectedType === type ? 'bg-accent-green' : 'bg-gray-600'}`} />
                      <span className="text-white font-medium">{getStepLabel(type)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Account Size */}
            {selectedType !== null && (
              <div className="bg-dark-800 rounded-xl p-6 border border-gray-800">
                <h2 className="text-white font-semibold mb-2">Account Size</h2>
                <p className="text-gray-500 text-sm mb-4">Choose your preferred account size</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {accountSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedSize === size
                          ? 'border-accent-green bg-accent-green/10'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${selectedSize === size ? 'bg-accent-green' : 'bg-gray-600'}`} />
                        <span className="text-white font-medium">${size.toLocaleString()}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trading Rules */}
            {selectedChallenge && (
              <div className="bg-dark-800 rounded-xl p-6 border border-gray-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-accent-green/20 rounded-lg flex items-center justify-center">
                    <FileText size={20} className="text-accent-green" />
                  </div>
                  <div>
                    <h2 className="text-white font-semibold">Trading Rules</h2>
                    <p className="text-gray-500 text-sm">Challenge parameters you must follow</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-dark-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Daily Drawdown</p>
                    <p className="text-red-500 font-bold text-lg">{selectedChallenge.rules?.maxDailyDrawdownPercent || 5}%</p>
                  </div>
                  <div className="bg-dark-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Max Drawdown</p>
                    <p className="text-red-500 font-bold text-lg">{selectedChallenge.rules?.maxOverallDrawdownPercent || 10}%</p>
                  </div>
                  {selectedChallenge.stepsCount > 0 && (
                    <div className="bg-dark-700 rounded-lg p-4">
                      <p className="text-gray-400 text-sm">Profit Target</p>
                      <p className="text-green-500 font-bold text-lg">{selectedChallenge.rules?.profitTargetPhase1Percent || 8}%</p>
                    </div>
                  )}
                  <div className="bg-dark-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Time Limit</p>
                    <p className="text-white font-bold text-lg">{selectedChallenge.rules?.challengeExpiryDays || 30} days</p>
                  </div>
                  <div className="bg-dark-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Min Lot Size</p>
                    <p className="text-white font-bold text-lg">{selectedChallenge.rules?.minLotSize || 0.01}</p>
                  </div>
                  <div className="bg-dark-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Max Lot Size</p>
                    <p className="text-white font-bold text-lg">{selectedChallenge.rules?.maxLotSize || 100}</p>
                  </div>
                  <div className="bg-dark-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Max Leverage</p>
                    <p className="text-white font-bold text-lg">1:{selectedChallenge.rules?.maxLeverage || 100}</p>
                  </div>
                  <div className="bg-dark-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Profit Split</p>
                    <p className="text-accent-green font-bold text-lg">{selectedChallenge.fundedSettings?.profitSplitPercent || 80}%</p>
                  </div>
                </div>

                {/* Rule Toggles */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${selectedChallenge.rules?.stopLossMandatory ? 'bg-yellow-500/10 text-yellow-500' : 'bg-dark-700 text-gray-400'}`}>
                    {selectedChallenge.rules?.stopLossMandatory ? <Check size={16} /> : <X size={16} />}
                    <span className="text-sm">Stop Loss Required</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${selectedChallenge.rules?.allowWeekendHolding ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {selectedChallenge.rules?.allowWeekendHolding ? <Check size={16} /> : <X size={16} />}
                    <span className="text-sm">Weekend Holding</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${selectedChallenge.rules?.allowNewsTrading ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {selectedChallenge.rules?.allowNewsTrading ? <Check size={16} /> : <X size={16} />}
                    <span className="text-sm">News Trading</span>
                  </div>
                  {selectedChallenge.rules?.minTradeHoldTimeSeconds > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 text-yellow-500">
                      <Clock size={16} />
                      <span className="text-sm">Min Hold: {selectedChallenge.rules.minTradeHoldTimeSeconds}s</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-dark-800 rounded-xl border border-gray-800 sticky top-4">
              {/* Coupon Code */}
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-white font-semibold mb-2">Coupon Code</h3>
                <p className="text-gray-500 text-sm mb-3">Enter a coupon code to get a discount</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Enter coupon code"
                    className="flex-1 bg-dark-700 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500"
                  />
                  <button className="px-4 py-2 bg-dark-700 text-gray-400 rounded-lg hover:text-white">
                    Apply
                  </button>
                </div>
              </div>

              {/* Order Summary */}
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-white font-semibold mb-4">Order Summary</h3>
                {selectedChallenge ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-white font-medium">${selectedChallenge.fundSize.toLocaleString()} — {getStepLabel(selectedChallenge.stepsCount)}</p>
                        <p className="text-gray-500 text-sm">{selectedChallenge.name}</p>
                      </div>
                      <p className="text-white font-bold">${selectedChallenge.challengeFee.toLocaleString()}</p>
                    </div>
                    <div className="pt-3 border-t border-gray-700 flex justify-between">
                      <span className="text-white font-semibold">Total</span>
                      <span className="text-2xl font-bold text-white">${selectedChallenge.challengeFee.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Select a challenge type and account size</p>
                )}
              </div>

              {/* Terms */}
              <div className="p-6">
                <label className="flex items-start gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded bg-dark-700 border-gray-600 text-accent-green"
                  />
                  <span className="text-gray-400 text-sm">
                    I agree with all the following terms:
                    <ul className="mt-2 space-y-1 text-gray-500">
                      <li>• I have read and agreed to the <button onClick={() => setShowTermsModal(true)} className="text-accent-green hover:underline">Terms of Use</button></li>
                      <li>• All information provided is correct</li>
                      <li>• I have read and agree with the <button onClick={() => setShowTermsModal(true)} className="text-accent-green hover:underline">Terms & Conditions</button></li>
                      <li>• I understand the trading rules and risks</li>
                    </ul>
                  </span>
                </label>

                <button
                  onClick={handleBuyChallenge}
                  disabled={!selectedChallenge || !agreedToTerms || buying}
                  className="w-full py-4 bg-accent-green text-black font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {buying ? 'Processing...' : 'Continue to Payment'}
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-8 bg-dark-800 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-white mb-6 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: 1, title: 'Buy Challenge', desc: 'Choose your account size and pay the one-time fee.' },
              { step: 2, title: 'Pass Evaluation', desc: 'Trade within the rules and hit your profit target.' },
              { step: 3, title: 'Get Funded', desc: 'Receive your funded account and start earning.' }
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-accent-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-accent-green font-bold text-lg">{item.step}</span>
                </div>
                <h3 className="text-white font-bold mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rules Warning */}
        <div className="mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-500 font-medium">Important Rules</p>
            <p className="text-gray-400 text-sm mt-1">
              Breaking any rule will result in immediate account failure. All trades must follow the challenge rules. 
              Make sure to review all trading parameters before starting.
            </p>
          </div>
        </div>
      </div>

      {/* Terms Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-dark-800">
              <h2 className="text-xl font-bold text-white">Terms & Conditions</h2>
              <button onClick={() => setShowTermsModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 text-gray-400 space-y-4">
              <h3 className="text-white font-semibold">Challenge Rules</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>You must not exceed the maximum daily drawdown limit</li>
                <li>You must not exceed the maximum overall drawdown limit</li>
                <li>All trades must have a stop loss if required by the challenge</li>
                <li>You must reach the profit target within the time limit</li>
                <li>Lot sizes must be within the specified range</li>
                <li>Weekend holding rules must be followed</li>
                <li>News trading restrictions apply if specified</li>
              </ul>
              <h3 className="text-white font-semibold mt-6">Account Termination</h3>
              <p>Your challenge account will be terminated if you break any of the above rules. No refunds will be provided for terminated accounts.</p>
              <h3 className="text-white font-semibold mt-6">Funded Account</h3>
              <p>Upon successfully completing the challenge, you will receive a funded account with the specified profit split. Withdrawals are subject to the withdrawal frequency rules.</p>
            </div>
            <div className="p-6 border-t border-gray-800">
              <button
                onClick={() => {
                  setAgreedToTerms(true)
                  setShowTermsModal(false)
                }}
                className="w-full py-3 bg-accent-green text-black font-medium rounded-lg"
              >
                I Agree to Terms
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
