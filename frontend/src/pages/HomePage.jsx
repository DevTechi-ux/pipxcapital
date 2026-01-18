import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Globe } from 'lucide-react'

// Navigation Component
const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[100] transition-colors duration-300 h-[64px] flex items-center ${
        isScrolled ? 'bg-[#110E08] border-b border-[#2A2620]' : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-[24px] lg:px-[60px] flex items-center justify-between w-full">
        <div className="flex items-center gap-[34px]">
          <a href="/" className="flex items-center">
            <img
              src="/bull4x-logo.png"
              alt="Bull4x Logo"
              className="h-[140px] w-auto object-contain"
            />
          </a>
          <div className="hidden md:flex items-center gap-[24px]">
            <button className="flex items-center gap-[4px] text-white hover:text-[#CFF12F] transition-colors text-[16px] font-medium py-2">
              What We Offer <ChevronDown size={16} />
            </button>
            <a href="#" className="text-white hover:text-[#CFF12F] transition-colors text-[16px] font-medium py-2">
              Support
            </a>
          </div>
        </div>
        <div className="flex items-center gap-[12px] md:gap-[24px]">
          <button className="flex items-center gap-[6px] text-white hover:text-[#CFF12F] transition-colors text-[14px] font-medium">
            <Globe size={18} />
            <span className="hidden sm:inline">EN</span>
            <ChevronDown size={14} className="hidden sm:inline" />
          </button>
          <button
            onClick={() => navigate('/user/login')}
            className="text-white hover:text-[#CFF12F] transition-colors text-[16px] font-medium hidden sm:block"
          >
            Log in
          </button>
          <button
            onClick={() => navigate('/user/signup')}
            className="bg-[#CFF12F] text-black px-[20px] py-[10px] rounded-[24px] text-[16px] font-bold hover:brightness-110 transition-all whitespace-nowrap"
          >
            Sign up
          </button>
        </div>
      </div>
    </nav>
  )
}

// Hero Section
const HeroSection = () => {
  const navigate = useNavigate()
  
  return (
    <section className="relative w-full h-screen overflow-hidden bg-[#110E08]">
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
          poster="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/a30101db-b978-4ecc-8998-3de500870677-robinhood-com/assets/images/EU_Web_Landing_Hero_Desktop_Short-1.jpg"
        >
          <source 
            src="https://videos.ctfassets.net/ilblxxee70tt/2s4toSMKFMvqnwyBZyS6LD/16627808bbf120f5a1264d23b1007278/EU_Web_Landing_Hero_Desktop_Short.webm" 
            type="video/webm" 
          />
        </video>
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ background: 'radial-gradient(circle at center, rgba(17, 14, 8, 0) 0%, rgba(17, 14, 8, 0.4) 100%)' }} 
        />
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-6 text-center">
        <div className="max-w-[1000px] flex flex-col items-center">
          <h1 
            className="text-white mb-6"
            style={{ fontSize: 'clamp(3.5rem, 8vw, 5.25rem)', lineHeight: '1.1', fontWeight: 300, letterSpacing: '-0.02em' }}
          >
            One place for all your investments
          </h1>
          <p className="text-white text-lg md:text-xl font-normal max-w-[640px] mb-10 opacity-90" style={{ lineHeight: '1.6' }}>
            Everything you need to start investing is here. From Stock Tokens to crypto—buy, sell, and manage it all in one place.
          </p>
          <button
            onClick={() => navigate('/user/signup')}
            className="inline-flex items-center justify-center bg-[#CFF12F] hover:bg-[#CFF12F]/90 active:scale-[0.98] transition-all duration-200 text-black px-8 py-3 rounded-full text-base font-medium min-w-[140px]"
          >
            Get started
          </button>
        </div>
      </div>
    </section>
  )
}

// Invest Stock Tokens Section
const InvestStockTokens = () => {
  return (
    <section className="bg-[#CFF12F] text-black overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-6 md:px-[60px] py-20 md:py-[140px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-[120px] items-start">
          <div className="relative flex justify-center lg:justify-start">
            <div className="max-w-[540px] w-full">
              <img
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/a30101db-b978-4ecc-8998-3de500870677-robinhood-com/assets/images/home-invest-ui-desktop-2.png"
                alt="Explore Stock Tokens mobile app interface"
                className="w-full h-auto object-contain"
                loading="lazy"
              />
            </div>
          </div>
          <div className="flex flex-col max-w-[480px]">
            <h3 className="text-[18px] font-medium leading-[1.2] mb-6 tracking-tight opacity-80">Invest</h3>
            <h2 className="text-[48px] md:text-[64px] font-light leading-[1.1] mb-8 tracking-[-0.02em]">
              Get started with<br />Stock Tokens
            </h2>
            <div className="text-[18px] leading-[1.6] mb-10 text-black/90">
              Explore 2,000+ Stock Tokens linked to NVIDIA, Microsoft, Apple, Vanguard S&P 500 ETF, and more. Stock Tokens are derivatives that reflect the price of individual stocks and ETPs.
            </div>
            <div className="mb-20">
              <a href="#" className="inline-block bg-black text-white px-8 py-[14px] rounded-[24px] font-medium text-[16px] hover:opacity-90 transition-opacity">
                Learn more
              </a>
            </div>
            <p className="text-[12px] leading-[1.6] text-black/70">
              Stock Tokens are derivative contracts between you and Bull4x. They carry a high level of risk and are not appropriate for all investors.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// Crypto Promo Section
const CryptoPromo = () => {
  return (
    <section className="relative w-full min-h-[720px] lg:h-[840px] flex items-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/a30101db-b978-4ecc-8998-3de500870677-robinhood-com/assets/images/landing-crypto-desktop-3.jpeg"
          alt="Metallic chain detail"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 60%)' }} />
      </div>
      <div className="max-w-[1440px] mx-auto px-6 md:px-[60px] relative z-10">
        <div className="max-w-[480px]">
          <div className="mb-8 flex items-center gap-2">
            <span className="text-white text-[24px] font-medium">Bull4x Crypto</span>
          </div>
          <h1 className="text-white text-[48px] md:text-[64px] mb-6 leading-[1.1] tracking-[-0.02em] font-light">
            Get more crypto for your money
          </h1>
          <p className="text-white text-[18px] leading-[1.6] opacity-90 mb-10 max-w-[420px]">
            Trade popular crypto like BTC, ETH, and SOL at one of the lowest costs on average. Explore 65+ crypto—all at low costs.
          </p>
          <a href="#" className="inline-flex items-center justify-center bg-white text-black px-8 py-[12px] rounded-[24px] font-medium transition-opacity hover:opacity-90">
            Learn more
          </a>
        </div>
      </div>
    </section>
  )
}

// Perpetual Futures Section
const PerpetualFutures = () => {
  return (
    <section className="bg-black text-white py-[80px] md:py-[140px] overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-[24px] md:px-[60px]">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-[64px] lg:gap-[80px]">
          <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[500px]">
              <img
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/a30101db-b978-4ecc-8998-3de500870677-robinhood-com/assets/images/landing-futures-ui-desktop_2x-4.png"
                alt="Perpetual Futures trading interface"
                className="object-contain w-full h-auto"
              />
            </div>
          </div>
          <div className="w-full lg:w-[480px] flex flex-col pt-0 lg:pt-[40px]">
            <h3 className="text-[#999999] text-[14px] md:text-[18px] font-medium mb-[12px]">Perpetual Futures</h3>
            <h2 className="text-[40px] md:text-[48px] leading-[1.1] font-normal text-white mb-[24px]">
              Crypto perpetual<br />futures with leverage
            </h2>
            <p className="text-[16px] md:text-[18px] leading-[1.6] text-white mb-[32px]">
              Advanced traders can trade with leverage, open long or short positions and more—in a few taps.
            </p>
            <div className="mb-[48px]">
              <a href="#" className="inline-block bg-[#CFF12F] text-black text-[16px] font-semibold py-[12px] px-[24px] rounded-[24px] hover:opacity-90 transition-opacity">
                Learn more
              </a>
            </div>
            <p className="text-[12px] md:text-[14px] leading-[1.5] text-[#999999]">
              Perpetual futures are complex derivative products, and trading involves significant risk. Leveraged trading can amplify losses.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// Security Trust Section
const SecurityTrust = () => {
  const navigate = useNavigate()
  
  return (
    <section className="relative w-full min-h-[800px] flex items-center justify-center overflow-hidden bg-[#000000]">
      <div className="absolute inset-0 z-0 w-full h-full">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          poster="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/a30101db-b978-4ecc-8998-3de500870677-robinhood-com/assets/images/Texture_1_Desktop-5.jpg"
        >
          <source src="https://videos.ctfassets.net/ilblxxee70tt/5RCR93puejnArBBUkpGUSb/49b64b6ca96cbb32b97d5a095b95393b/Texture_1_Desktop.webm" type="video/webm" />
        </video>
        <div className="absolute inset-0 z-10" style={{ background: 'radial-gradient(circle at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)' }} />
      </div>
      <div className="relative z-20 max-w-[1440px] mx-auto px-[60px] text-center">
        <div className="flex flex-col items-center justify-center">
          <div className="h-[100px] md:h-[120px]" />
          <h2 className="text-white text-[48px] md:text-[64px] lg:text-[72px] leading-[1.05] tracking-[-0.03em] max-w-[900px] mx-auto mb-[40px]">
            Industry-leading security. Trusted by over 26 million users.
          </h2>
          <button
            onClick={() => navigate('/user/signup')}
            className="inline-flex items-center justify-center bg-[#CFF12F] text-black text-[16px] font-medium px-[28px] py-[14px] rounded-[32px] hover:opacity-90 transition-opacity duration-200"
          >
            Get started
          </button>
          <div className="h-[100px] md:h-[140px]" />
        </div>
      </div>
    </section>
  )
}

// Footer Section
const Footer = () => {
  const socialLinks = [
    { name: 'X', href: '#', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.045 4.126H5.078z' },
    { name: 'Instagram', href: '#', path: 'M10 2.182c2.545 0 2.848.01 3.854.055 1.05.048 1.62.223 2 .37a3.35 3.35 0 0 1 1.242.808c.355.356.591.731.808 1.242.147.38.322.95.37 2 .045 1.006.055 1.309.055 3.854s-.01 2.848-.055 3.854c-.048 1.05-.223 1.62-.37 2a3.35 3.35 0 0 1-.808 1.242c-.356.355-.731.591-1.242.808-.38.147-.95.322-2 .37-1.006.045-1.309.055-3.854.055s-2.848-.01-3.854-.055c-1.05-.048-1.62-.223-2-.37a3.35 3.35 0 0 1-1.242-.808 3.35 3.35 0 0 1-.808-1.242c-.147-.38-.322-.95-.37-2-.045-1.006-.055-1.309-.055-3.854s.01-2.848.055-3.854c.048-1.05.223-1.62.37-2a3.35 3.35 0 0 1 .808-1.242c.356-.355.731-.591 1.242-.808.38-.147.95-.322 2-.37 1.006-.045 1.309-.055 3.854-.055zM10 0C7.412 0 7.087.01 6.07.057c-1.015.046-1.708.208-2.314.444a5.178 5.178 0 0 0-1.87 1.218A5.178 5.178 0 0 0 .673 3.59c-.236.606-.398 1.299-.444 2.314C.01 6.913 0 7.238 0 9.826s.01 2.913.057 3.93c.046 1.015.208 1.708.444 2.314a5.178 5.178 0 0 0 1.218 1.87 5.178 5.178 0 0 0 1.87 1.218c.606.236 1.299.398 2.314.444 1.017.047 1.342.057 3.93.057s2.913-.01 3.93-.057c1.015-.046 1.708-.208 2.314-.444a5.178 5.178 0 0 0 1.87-1.218 5.178 5.178 0 0 0 1.218-1.87c.236-.606.398-1.299.444-2.314.047-1.017.057-1.342.057-3.93s-.01-2.913-.057-3.93c-.046-1.015-.208-1.708-.444-2.314a5.178 5.178 0 0 0-1.218-1.87A5.178 5.178 0 0 0 16.063.5c-.606-.236-1.299-.398-2.314-.444C12.74 0 12.413 0 9.826 0H10zM10 4.773a5.053 5.053 0 1 0 0 10.106 5.053 5.053 0 0 0 0-10.106zm0 8.324a3.27 3.27 0 1 1 0-6.541 3.27 3.27 0 0 1 0 6.541zm5.253-9.043a1.213 1.213 0 1 1-2.426 0 1.213 1.213 0 0 1 2.426 0z' },
    { name: 'Facebook', href: '#', path: 'M20 10c0-5.523-4.477-10-10-10S0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988C16.343 19.128 20 14.991 20 10z' },
  ]

  return (
    <footer className="bg-[#CFF12F] text-[#000000] py-14 px-6 md:px-[60px]">
      <div className="max-w-[1440px] mx-auto">
        <div className="border-b border-black/10 pb-8 mb-12">
          <p className="text-[14px] leading-[1.6] md:text-[18px]">
            Another year of progress, minted. Look back at what we've built in 2025.{' '}
            <a href="#" className="underline font-medium hover:opacity-70 transition-opacity">See highlights</a>.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="flex flex-col">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-8 mb-12">
              <div>
                <h4 className="font-semibold text-[14px] mb-4">Product</h4>
                <ul className="space-y-3">
                  {['Invest', 'Crypto', 'Perpetual Futures', 'Staking'].map((item) => (
                    <li key={item}><a href="#" className="text-[14px] hover:underline">{item}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-[14px] mb-4">Cryptocurrencies</h4>
                <ul className="space-y-3 text-[14px]">
                  {['Bitcoin (BTC)', 'Ethereum (ETH)', 'Solana (SOL)', 'See more'].map((item) => (
                    <li key={item}><a href="#" className="hover:underline">{item}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-[14px] mb-4">Company</h4>
                <ul className="space-y-3 text-[14px]">
                  {['About us', 'Blog', 'Support', 'Terms'].map((item) => (
                    <li key={item}><a href="#" className="hover:underline">{item}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-[14px] mb-4">Legal</h4>
                <ul className="space-y-3 text-[14px]">
                  {['Disclosures', 'Privacy', 'Cookie Policy'].map((item) => (
                    <li key={item}><a href="#" className="hover:underline">{item}</a></li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-auto">
              <span className="text-[14px] font-medium block mb-4">Follow us on</span>
              <ul className="flex items-center gap-6">
                {socialLinks.map((social) => (
                  <li key={social.name}>
                    <a href={social.href} aria-label={social.name} className="hover:opacity-60 transition-opacity">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d={social.path} />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="space-y-6 text-[12px] leading-[1.6]">
            <p>
              Stock Tokens are derivative contracts between you and Bull4x. They carry a high level of risk and are not appropriate for all investors.
            </p>
            <p>
              Perpetual futures are complex derivative products, and trading involves significant risk. Leveraged trading can amplify losses.
            </p>
            <p>© 2025 Bull4x. All rights reserved.</p>
          </div>
        </div>
        <div className="mt-20 flex justify-center select-none pointer-events-none pb-8">
          <h1 className="text-[18vw] lg:text-[20vw] font-bold leading-[1] tracking-tighter">
            Bull4x
          </h1>
        </div>
      </div>
    </footer>
  )
}

// Main HomePage Component
const HomePage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#110E08]">
      <Navigation />
      <main>
        <HeroSection />
        <InvestStockTokens />
        <CryptoPromo />
        <PerpetualFutures />
        <SecurityTrust />
      </main>
      <Footer />
    </div>
  )
}

export default HomePage
