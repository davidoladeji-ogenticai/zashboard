'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'

const carouselSlides = [
  {
    text: "Zing is a multi-modal AI business browser that can interact with users in all the ways a human assistant would. It's like giving your browser human-like senses and abilities:"
  },
  {
    text: "Experience seamless integration with your favorite tools and workflows. Zing adapts to your work style and learns from your preferences."
  },
  {
    text: "Boost productivity with AI-powered insights that turn your daily tasks into actionable intelligence."
  }
]

export default function LandingPage() {
  const [currentSlide, setCurrentSlide] = useState(0)

  // Auto-play carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length)
    }, 5000) // Change slide every 5 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="font-sans bg-[#0f0f0f] relative min-h-screen w-full overflow-x-hidden">
      {/* Logo and Navigation */}
      <div className="absolute flex gap-1 items-center left-8 top-8">
        <div className="relative shrink-0 w-10 h-10">
          <Image
            alt="Zashboard Logo"
            className="object-cover"
            src="/e654095c7dad785b3b2e942849e6f312ea372bb3.png"
            fill
          />
        </div>
        <div className="flex flex-col font-bold justify-center leading-[0] not-italic relative shrink-0 text-[#832ad6] text-[32px] text-center whitespace-nowrap tracking-[-2px]">
          <p className="leading-normal">Zashboard</p>
        </div>
      </div>

      {/* Sign in / Sign up buttons */}
      <div className="absolute flex gap-4 items-center right-8 top-8">
        <Link href="/sign-in">
          <div className="bg-[#202123] flex gap-2 h-10 items-center justify-center px-[34px] py-2 rounded-lg cursor-pointer hover:bg-white transition-all duration-200 group">
            <div className="flex flex-col font-medium justify-center leading-[0] not-italic text-xs whitespace-nowrap text-white group-hover:text-black">
              <p className="leading-normal">Sign in</p>
            </div>
          </div>
        </Link>
        <Link href="/sign-up">
          <div className="bg-[rgba(32,33,35,0.3)] border-[0.5px] border-[rgba(43,48,59,0.5)] h-10 rounded-lg w-[154px] cursor-pointer hover:bg-gradient-to-r hover:from-[#832ad6] hover:to-[#9333ea] hover:border-transparent transition-all duration-200">
            <div className="h-10 overflow-clip relative rounded-[inherit] w-[154px] flex items-center justify-center">
              <div className="flex flex-col font-medium justify-center leading-[0] not-italic text-xs whitespace-nowrap text-white">
                <p className="leading-normal">Sign up</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Main Content - Centered */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[786px] flex flex-col gap-8 items-center">

        {/* Header Section */}
        <div className="flex flex-col gap-4 items-center relative shrink-0 w-[455px]">
          {/* Badge */}
          <div className="border border-[#e5aa57] border-solid h-8 relative rounded-[20px] shrink-0 w-[323px]">
            <div className="h-8 overflow-clip relative rounded-[inherit] w-[323px]">
              <div className="absolute flex flex-col font-medium justify-center leading-[0] left-1/2 not-italic text-sm text-center whitespace-nowrap text-white top-1/2 -translate-x-1/2 -translate-y-1/2">
                <p className="leading-normal">Welcome to the future of browsing</p>
              </div>
            </div>
          </div>

          {/* Main Headline */}
          <div className="flex flex-col gap-2 items-center leading-[0] not-italic relative shrink-0 text-center w-full">
            <div className="flex flex-col font-bold justify-center relative shrink-0 text-[32px] text-white tracking-[-2px] w-full">
              <p className="leading-normal">
                <span>Don&apos;t just browse. </span>
                <span className="bg-clip-text bg-gradient-to-r from-[#e5aa57] from-[46.154%] to-[#da5965]" style={{ WebkitTextFillColor: 'transparent' }}>
                  Experience.
                </span>
              </p>
            </div>
            <div className="flex flex-col font-medium justify-center leading-normal relative shrink-0 text-[#8e8e8e] text-base w-full">
              <p className="mb-0">Your Zashboard becomes smarter with every tool you connect. </p>
              <p>Start with any card below and watch the magic unfold.</p>
            </div>
          </div>
        </div>

        {/* Feature Cards Section */}
        <div className="flex flex-col gap-6 items-start relative shrink-0 w-full">

          {/* Zing Hero Card */}
          <div className="bg-[rgba(32,33,35,0.3)] border-[0.5px] border-[rgba(43,48,59,0.5)] border-solid h-[136px] relative rounded-xl shrink-0 w-full">
            <div className="h-[136px] overflow-clip relative rounded-[inherit] w-full">
              {/* Left Text - Dynamic Carousel Content */}
              <div className="absolute flex flex-col font-medium justify-center leading-[0] left-[32px] not-italic text-sm text-white top-1/2 -translate-y-1/2 w-[385px]">
                <p className="leading-normal transition-opacity duration-300">
                  {carouselSlides[currentSlide].text}
                </p>
              </div>

              {/* Right Zing Logo */}
              <div className="absolute h-[94px] right-[32px] top-1/2 -translate-y-1/2 w-[287px]">
                {/* Rectangle border frame */}
                <div className="absolute inset-0">
                  <Image
                    alt="Zing frame"
                    src="/rect-1.png"
                    fill
                    className="object-contain"
                  />
                </div>
                {/* Zing logo centered */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[100px] h-[50px]">
                  <Image
                    alt="Zing logo"
                    src="/zing.png"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>

              {/* Carousel Dots - Interactive */}
              <div className="absolute flex gap-2 left-1/2 top-[118px] -translate-x-1/2">
                {carouselSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentSlide
                        ? 'bg-[#e5aa57] w-3'
                        : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Feature Cards Grid */}
          <div className="flex flex-wrap gap-6 items-start relative shrink-0 w-full">

            {/* Learn Zing Card */}
            <div className="bg-[rgba(32,33,35,0.3)] border-[0.5px] border-[rgba(43,48,59,0.5)] border-solid h-[195px] relative rounded-xl shrink-0 w-[246px] hover:border-[rgba(43,48,59,0.8)] transition-colors">
              <div className="h-[195px] overflow-clip relative rounded-[inherit] w-[246px]">
                <div className="absolute flex flex-col font-bold justify-center leading-[0] left-6 not-italic text-sm whitespace-nowrap text-white top-[52px]">
                  <p className="leading-normal">Learn Zing</p>
                </div>
                <div className="absolute bg-[rgba(15,15,15,0.2)] left-6 rounded-[80px] w-8 h-8 top-[16px]">
                  <div className="absolute left-1/2 w-5 h-5 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Image alt="" src="/e654095c7dad785b3b2e942849e6f312ea372bb3.png" fill className="object-cover" />
                  </div>
                </div>
                <div className="absolute flex flex-col font-normal justify-center leading-[0] left-6 not-italic text-xs text-[rgba(255,255,255,0.5)] top-[83px] w-[198px]">
                  <p className="leading-normal">Discover what&apos;s possible with an AI-native browser.</p>
                </div>
                <div className="absolute bg-[rgba(32,33,35,0.3)] border-[0.5px] border-[rgba(43,48,59,0.5)] border-solid h-8 left-6 rounded-xl top-[147px] w-[198px] cursor-pointer hover:bg-[rgba(32,33,35,0.5)] transition-colors">
                  <div className="h-8 overflow-clip relative rounded-[inherit] w-[198px] flex items-center justify-center">
                    <div className="flex flex-col font-bold justify-center leading-[0] not-italic text-xs text-[rgba(255,255,255,0.5)] text-center whitespace-nowrap">
                      <p className="leading-normal">Start Zinging</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Boost Productivity Card */}
            <div className="bg-[rgba(32,33,35,0.3)] border-[0.5px] border-[rgba(43,48,59,0.5)] border-solid h-[195px] relative rounded-xl shrink-0 w-[246px] hover:border-[rgba(43,48,59,0.8)] transition-colors">
              <div className="h-[195px] overflow-clip relative rounded-[inherit] w-[246px]">
                <div className="absolute bg-[rgba(15,15,15,0.2)] left-6 rounded-[80px] w-8 h-8 top-[16px]">
                  <div className="absolute left-1/2 w-5 h-5 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Image alt="" src="/ad87474e243bedc81361e9ccae7dfe0793c4dbd4.svg" fill />
                  </div>
                </div>
                <div className="absolute flex flex-col font-bold justify-center leading-[0] left-6 not-italic text-sm whitespace-nowrap text-white top-[54px]">
                  <p className="leading-normal">Boost Productivity</p>
                </div>
                <div className="absolute flex flex-col font-normal justify-center leading-[0] left-6 not-italic text-xs text-[rgba(255,255,255,0.5)] top-[85px] w-[198px]">
                  <p className="leading-normal">Preview your daily briefing and see how Zing turns insights into action.</p>
                </div>
                <div className="absolute bg-[rgba(32,33,35,0.3)] border-[0.5px] border-[rgba(43,48,59,0.5)] border-solid h-8 left-6 rounded-xl top-[147px] w-[198px] cursor-pointer hover:bg-[rgba(32,33,35,0.5)] transition-colors">
                  <div className="h-8 overflow-clip relative rounded-[inherit] w-[198px] flex items-center justify-center">
                    <div className="flex flex-col font-bold justify-center leading-[0] not-italic text-xs text-[rgba(255,255,255,0.5)] text-center whitespace-nowrap">
                      <p className="leading-normal">Try the demo</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Try Voice Command Card */}
            <div className="bg-[rgba(32,33,35,0.3)] border-[0.5px] border-[rgba(43,48,59,0.5)] border-solid h-[195px] relative rounded-xl shrink-0 w-[246px] hover:border-[rgba(43,48,59,0.8)] transition-colors">
              <div className="h-[195px] overflow-clip relative rounded-[inherit] w-[246px]">
                <div className="absolute bg-[rgba(15,15,15,0.2)] left-6 rounded-[80px] w-8 h-8 top-[16px]">
                  <div className="absolute left-1/2 w-5 h-5 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Image alt="" src="/724b53dd35db6ad751884f575c4d728afcaba016.svg" fill />
                  </div>
                </div>
                <div className="absolute flex flex-col font-bold justify-center leading-[0] left-6 not-italic text-sm whitespace-nowrap text-white top-[54px]">
                  <p className="leading-normal">Try voice command</p>
                </div>
                <div className="absolute flex flex-col font-normal justify-center leading-[0] left-6 not-italic text-xs text-[rgba(255,255,255,0.5)] top-[85px] w-[198px]">
                  <p className="leading-normal">Speak to Zing instead of typing. Test how voice controls your workflow.</p>
                </div>
                <div className="absolute bg-[rgba(32,33,35,0.3)] border-[0.5px] border-[rgba(43,48,59,0.5)] border-solid h-8 left-6 rounded-xl top-[147px] w-[198px] cursor-pointer hover:bg-[rgba(32,33,35,0.5)] transition-colors">
                  <div className="h-8 overflow-clip relative rounded-[inherit] w-[198px] flex items-center justify-center">
                    <div className="flex flex-col font-bold justify-center leading-[0] not-italic text-xs text-[rgba(255,255,255,0.5)] text-center whitespace-nowrap">
                      <p className="leading-normal">Enable voice</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Connect Your Tools Card */}
            <div className="bg-[rgba(32,33,35,0.3)] border-[0.5px] border-[rgba(43,48,59,0.5)] border-solid h-[195px] relative rounded-xl shrink-0 w-[246px] hover:border-[rgba(43,48,59,0.8)] transition-colors">
              <div className="h-[195px] overflow-clip relative rounded-[inherit] w-[246px]">
                <div className="absolute bg-[rgba(15,15,15,0.2)] left-6 rounded-[80px] w-8 h-8 top-[16px]">
                  <div className="absolute left-1/2 w-4 h-4 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Image alt="" src="/424706748edce30dcc774aaf04a077fa21ed60a8.svg" fill />
                  </div>
                </div>
                <div className="absolute flex flex-col font-bold justify-center leading-[0] left-6 not-italic text-sm whitespace-nowrap text-white top-[54px]">
                  <p className="leading-normal">Connect your tools</p>
                </div>
                <div className="absolute flex flex-col font-normal justify-center leading-[0] left-6 not-italic text-xs text-[rgba(255,255,255,0.5)] top-[85px] w-[198px]">
                  <p className="leading-normal">Bring your apps into Zing for smarter, more personalized insights.</p>
                </div>
                <div className="absolute bg-[rgba(32,33,35,0.3)] border-[0.5px] border-[rgba(43,48,59,0.5)] border-solid h-8 left-6 rounded-xl top-[147px] w-[198px] cursor-pointer hover:bg-[rgba(32,33,35,0.5)] transition-colors">
                  <div className="h-8 overflow-clip relative rounded-[inherit] w-[198px] flex items-center justify-center">
                    <div className="flex flex-col font-bold justify-center leading-[0] not-italic text-xs text-[rgba(255,255,255,0.5)] text-center whitespace-nowrap">
                      <p className="leading-normal">Connect tools</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips & Tricks Card */}
            <div className="bg-[rgba(32,33,35,0.3)] border-[0.5px] border-[rgba(43,48,59,0.5)] border-solid h-[195px] relative rounded-xl shrink-0 w-[246px] hover:border-[rgba(43,48,59,0.8)] transition-colors">
              <div className="h-[195px] overflow-clip relative rounded-[inherit] w-[246px]">
                <div className="absolute bg-[rgba(15,15,15,0.2)] left-6 rounded-[80px] w-8 h-8 top-[16px]">
                  <div className="absolute h-5 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4">
                    <Image alt="" src="/e7fc0621118ebb6885b9c446539d6adbf8ec06be.svg" fill />
                  </div>
                </div>
                <div className="absolute flex flex-col font-bold justify-center leading-[0] left-6 not-italic text-sm whitespace-nowrap text-white top-[54px]">
                  <p className="leading-normal">Tips &amp; Tricks</p>
                </div>
                <div className="absolute flex flex-col font-medium justify-center leading-[0] left-6 not-italic text-xs text-[rgba(255,255,255,0.5)] top-[85px] w-[198px]">
                  <p className="leading-normal">Shortcuts and hidden features that make Zing faster &amp; more fun to use.</p>
                </div>
                <div className="absolute bg-[rgba(32,33,35,0.3)] border-[0.5px] border-[rgba(43,48,59,0.5)] border-solid h-8 left-6 rounded-xl top-[147px] w-[198px] cursor-pointer hover:bg-[rgba(32,33,35,0.5)] transition-colors">
                  <div className="h-8 overflow-clip relative rounded-[inherit] w-[198px] flex items-center justify-center">
                    <div className="flex flex-col font-bold justify-center leading-[0] not-italic text-xs text-[rgba(255,255,255,0.5)] text-center whitespace-nowrap">
                      <p className="leading-normal">Explore tips</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Coming Soon Card */}
            <div className="bg-[rgba(32,33,35,0.3)] border-[0.5px] border-[rgba(43,48,59,0.5)] border-solid h-[195px] relative rounded-xl shrink-0 w-[246px] hover:border-[rgba(43,48,59,0.8)] transition-colors">
              <div className="h-[195px] overflow-clip relative rounded-[inherit] w-[246px]">
                <div className="absolute bg-[rgba(15,15,15,0.2)] left-6 rounded-[80px] w-8 h-8 top-[16px]">
                  <div className="absolute left-1/2 w-4 h-4 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Image alt="" src="/67b80d60e981bceb660f43b472ce843a3ae702c9.png" fill className="object-cover" />
                  </div>
                </div>
                <div className="absolute flex flex-col font-bold justify-center leading-[0] left-6 not-italic text-sm whitespace-nowrap text-white top-[54px]">
                  <p className="leading-normal">Coming soon</p>
                </div>
                <div className="absolute flex flex-col font-normal justify-center leading-[0] left-6 not-italic text-xs text-[rgba(255,255,255,0.5)] top-[85px] w-[198px]">
                  <p className="leading-normal">Get a sneak peek of features we&apos;re building next for Zing and Zashboard.</p>
                </div>
                <div className="absolute bg-[rgba(32,33,35,0.3)] border-[0.5px] border-[rgba(43,48,59,0.5)] border-solid h-8 left-6 rounded-xl top-[147px] w-[198px] cursor-pointer hover:bg-[rgba(32,33,35,0.5)] transition-colors">
                  <div className="h-8 overflow-clip relative rounded-[inherit] w-[198px] flex items-center justify-center">
                    <div className="flex flex-col font-bold justify-center leading-[0] not-italic text-xs text-[rgba(255,255,255,0.5)] text-center whitespace-nowrap">
                      <p className="leading-normal">See what&apos;s next</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
