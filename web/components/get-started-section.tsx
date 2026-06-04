"use client"

import { Button } from "@/components/ui/button"
import { Check, ArrowRight, MessageCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { GetAccessModal } from "@/components/get-access-modal"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const checkItems = [
  "Map your daily operations",
  "See WhatsApp and voice workflows",
  "Walk through task, vendor, and escalation flows",
]

const features = [
  "Automatic follow-ups",
  "Proof-based execution",
  "Vendor coordination",
  "Verified leadership summaries",
]

export function GetStartedSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [accessModalOpen, setAccessModalOpen] = useState(false)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".gs-title", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: sectionRef.current, start: "top 80%" } })
      gsap.fromTo(".gs-sub", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", delay: 0.15, scrollTrigger: { trigger: sectionRef.current, start: "top 80%" } })
      gsap.fromTo(".gs-check", { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.1, ease: "power2.out", scrollTrigger: { trigger: ".gs-checks", start: "top 80%" } })
      gsap.fromTo(".gs-cta", { opacity: 0, y: 24, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.5)", scrollTrigger: { trigger: ".gs-cta", start: "top 90%" } })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <>
      <section ref={sectionRef} className="py-16 sm:py-24 bg-[#0b1a14] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] bg-[#25D366]/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[200px] sm:w-[280px] h-[200px] sm:h-[280px] bg-emerald-900/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 sm:gap-12 items-center">
            {/* Left */}
            <div>
              <div className="flex items-center gap-2 mb-4 sm:mb-5">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-bold text-white/80 uppercase tracking-widest">Book a Demo</span>
              </div>
              <h2 className="gs-title text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-5 leading-tight">
                Stop chasing operations. Start receiving verified movement.
              </h2>
              <p className="gs-sub text-white/75 mb-6 sm:mb-8 text-sm sm:text-base leading-relaxed">
                See how Munshi can coordinate workers, managers, vendors, and daily workflows through the channels your business already uses.
              </p>
              <div className="gs-checks flex flex-col gap-2.5 sm:gap-3 mb-6 sm:mb-8">
                {checkItems.map((text, i) => (
                  <div key={i} className="gs-check flex items-center gap-3">
                    <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-white font-medium text-sm">{text}</span>
                  </div>
                ))}
              </div>
              <div className="gs-cta flex flex-wrap gap-3">
                <Button
                  onClick={() => setAccessModalOpen(true)}
                  className="bg-[#25D366] hover:bg-[#1fba5a] text-white rounded-full px-6 sm:px-7 py-5 sm:py-6 text-sm sm:text-[15px] font-bold transition-all duration-300 hover:scale-105 hover:shadow-xl shadow-lg shadow-[#25D366]/20"
                >
                  Book a Demo
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full px-6 sm:px-7 py-5 sm:py-6 text-sm sm:text-[15px] font-semibold border-white/30 text-white hover:bg-white/10 hover:border-white/50 transition-all duration-300 group bg-transparent flex items-center gap-2"
                >
                  <a href="#demo">
                    See Munshi in Action
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Right - Features grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((text, i) => (
                <div key={i} className="gs-check flex items-center gap-3 bg-white/12 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3.5 sm:py-4">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <span className="text-white text-sm font-semibold">{text}</span>
                </div>
              ))}
              <div className="sm:col-span-2 bg-white/10 border border-white/15 rounded-xl px-5 py-4 mt-1">
                <p className="text-white/70 text-xs text-center">Turn scattered follow-ups into one operating layer your team can actually use.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <GetAccessModal open={accessModalOpen} onClose={() => setAccessModalOpen(false)} />
    </>
  )
}