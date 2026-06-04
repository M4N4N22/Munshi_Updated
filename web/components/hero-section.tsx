"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle, MessageCircle, Mic } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { GetAccessModal } from "@/components/get-access-modal"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const agentBadges = [
  { label: "Businesses validated", color: "bg-green-100 text-green-700 border-green-200" },
  { label: "Businesses in active onboarding", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { label: "Willing-to-pay validation", color: "bg-amber-100 text-amber-700 border-amber-200" },
]

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const phoneRef = useRef<HTMLDivElement>(null)
  const [accessModalOpen, setAccessModalOpen] = useState(false)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".hero-badge", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", delay: 0.3 })
      gsap.fromTo(".hero-title", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.85, ease: "power3.out", delay: 0.45 })
      gsap.fromTo(".hero-sub", { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.75, ease: "power3.out", delay: 0.6 })
      gsap.fromTo(".hero-cta", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.65, ease: "power3.out", delay: 0.75 })
      gsap.fromTo(".hero-badges-row", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", delay: 0.9 })

      if (phoneRef.current) {
        gsap.fromTo(phoneRef.current, { opacity: 0, y: 60, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 1.1, ease: "power3.out", delay: 0.5 })
        gsap.to(phoneRef.current, { yPercent: -8, ease: "none", scrollTrigger: { trigger: sectionRef.current, start: "top top", end: "bottom top", scrub: 1.5 } })
      }
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <>
      <section ref={sectionRef} className="relative pt-16 overflow-hidden bg-[#0f1a14] min-h-screen flex items-center">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f1a14] via-[#0d1f11] to-[#071209]" />
        <div className="absolute top-0 right-0 w-[400px] sm:w-[700px] h-[400px] sm:h-[700px] bg-[#25D366]/6 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-[#25D366]/4 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-14 sm:py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Left */}
            <div>
              <div className="hero-badge inline-flex items-center gap-2 border border-[#25D366]/30 bg-[#25D366]/10 rounded-full px-4 py-1.5 mb-6">
                <span className="w-1.5 h-1.5 bg-[#25D366] rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-[#25D366] uppercase tracking-wider">AI operations orchestration</span>
              </div>

              <h1 className="hero-title text-[2.2rem] sm:text-5xl lg:text-[3.5rem] font-bold text-white leading-[1.08] tracking-tight mb-5">
                Orchestrate Your Operations<br />
                Through{" "}
                <span className="text-[#25D366]">WhatsApp & Voice</span>
              </h1>

              <p className="hero-sub text-base sm:text-lg text-white/60 leading-relaxed max-w-[460px] mb-7">
                Munshi helps owners and managers assign work, collect updates, verify execution, escalate delays, and coordinate vendors without manually chasing every call, chat, and shift.
              </p>

              <div className="hero-cta flex flex-wrap gap-3 mb-8">
                <Button
                  onClick={() => setAccessModalOpen(true)}
                  className="bg-[#25D366] hover:bg-[#1fba5a] text-white rounded-full px-6 sm:px-7 py-5 sm:py-6 text-sm sm:text-[15px] font-bold shadow-lg shadow-[#25D366]/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#25D366]/35"
                >
                  Book a Demo
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full px-6 sm:px-7 py-5 sm:py-6 text-sm sm:text-[15px] font-semibold border-white/20 text-white bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all duration-300"
                >
                  <Link href="/onboarding">Get started on WhatsApp</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full px-6 sm:px-7 py-5 sm:py-6 text-sm sm:text-[15px] font-semibold border-white/20 text-white bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all duration-300 group flex items-center gap-2"
                >
                  <a href="#demo">
                    See Munshi in Action
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </a>
                </Button>
              </div>

              <div className="hero-badges-row flex flex-wrap gap-2">
                {agentBadges.map((badge, i) => (
                  <span key={i} className={`inline-flex items-center gap-1.5 border rounded-full px-3 py-1 text-xs font-semibold ${badge.color}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Right - phone visual */}
            <div ref={phoneRef} className="relative flex items-center justify-center mt-4 lg:mt-0">
              <div className="absolute inset-0 bg-[#25D366]/8 rounded-[40px] blur-3xl" />
              <div className="relative w-full max-w-[340px] sm:max-w-[420px] lg:max-w-[480px] mx-auto">
                <Image
                  src="/images/hero-phone.jpg"
                  alt="Munshi on WhatsApp"
                  width={480}
                  height={560}
                  className="mx-auto rounded-[24px] sm:rounded-[28px] shadow-2xl shadow-black/50 ring-1 ring-white/10 w-full"
                />
                {/* Floating bubble 1 */}
                <div className="absolute top-6 -left-4 sm:top-10 sm:-left-10 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 sm:p-3.5 max-w-[160px] sm:max-w-[190px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-[#25D366] rounded-full flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Attendance</span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-700 font-medium">OK Ramesh - Present, Shift 1</p>
                </div>
                {/* Floating bubble 2 */}
                <div className="absolute bottom-10 -right-4 sm:bottom-16 sm:-right-10 bg-[#f0fdf4] rounded-2xl shadow-2xl border border-green-100 p-3 sm:p-3.5 max-w-[160px] sm:max-w-[190px]">
                  <p className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Verified Summary</p>
                  <p className="text-[10px] sm:text-xs text-gray-700 font-semibold">42 present | 6 done | 3 escalated</p>
                </div>
                <div className="absolute -bottom-5 left-8 sm:left-12 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 sm:p-3.5 max-w-[190px] hidden sm:block">
                  <div className="flex items-center gap-2 mb-1.5">
                    <MessageCircle className="w-4 h-4 text-[#25D366]" />
                    <Mic className="w-4 h-4 text-[#25D366]" />
                    <CheckCircle className="w-4 h-4 text-[#25D366]" />
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-700 font-semibold">WhatsApp, voice, proof, follow-up.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <GetAccessModal open={accessModalOpen} onClose={() => setAccessModalOpen(false)} />
    </>
  )
}