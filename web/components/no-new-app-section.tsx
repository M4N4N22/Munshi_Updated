"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check, MessageCircle, Shield, Smartphone, Users } from "lucide-react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { GetAccessModal } from "@/components/get-access-modal"
import { useState } from "react"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const benefits = [
  { icon: Smartphone, title: "WhatsApp-native workflows", desc: "Teams work from the channel they already use every day." },
  { icon: Shield, title: "Proof-based updates", desc: "Execution is backed by verification, not only verbal confirmation." },
  { icon: Users, title: "Vendor coordination", desc: "External follow-ups become part of the same operating rhythm." },
]

export function NoNewAppSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [accessModalOpen, setAccessModalOpen] = useState(false)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".no-app-title span", { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.6, stagger: 0.18, ease: "power3.out", scrollTrigger: { trigger: sectionRef.current, start: "top 72%" } })
      gsap.fromTo(".no-app-sub", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.65, ease: "power3.out", delay: 0.4, scrollTrigger: { trigger: sectionRef.current, start: "top 72%" } })
      gsap.fromTo(".no-app-cta", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: "back.out(1.5)", delay: 0.55, scrollTrigger: { trigger: sectionRef.current, start: "top 72%" } })
      gsap.fromTo(".benefit-card", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.12, ease: "power2.out", scrollTrigger: { trigger: ".benefits-grid", start: "top 80%" } })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <>
    <section ref={sectionRef} className="py-16 sm:py-24 bg-[#0b1a14] text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #25D366 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <div className="absolute top-0 right-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-[#25D366]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[200px] sm:w-[350px] h-[200px] sm:h-[350px] bg-emerald-900/25 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 sm:gap-16 items-center mb-12 sm:mb-20">
          <div>
            <h2 className="no-app-title text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.1] tracking-tight mb-6 sm:mb-8">
              <span className="block text-white/35">Why Not Another System?</span>
              <span className="block text-white/70">Because Execution Happens</span>
              <span className="block text-[#25D366]">Outside The Dashboard.</span>
            </h2>
            <p className="no-app-sub text-gray-400 text-base sm:text-lg leading-relaxed max-w-md mb-7 sm:mb-9">
              Traditional systems store data. Workforce apps create adoption friction. Fragmented chats create confusion. Munshi sits in the middle as the command layer that drives work to completion.
            </p>
            <div className="no-app-cta flex flex-wrap gap-3">
              <Button
                onClick={() => setAccessModalOpen(true)}
                className="bg-[#25D366] hover:bg-[#1fba5a] text-white rounded-full px-6 sm:px-7 py-5 sm:py-6 text-sm sm:text-[15px] font-bold shadow-lg shadow-[#25D366]/20 transition-all duration-300 hover:scale-105"
              >
                Book a Demo
              </Button>
              <Button asChild variant="outline" className="rounded-full px-6 sm:px-7 py-5 sm:py-6 text-sm sm:text-[15px] font-semibold border-white/40 text-white bg-white/10 hover:bg-white/20 hover:border-white/60 transition-all duration-300 group">
                <a href="#demo">
                  See Munshi in Action
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-8 w-full">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-5 sm:mb-6 text-center">Comparison</p>
              <div className="grid gap-3">
                {[
                  ["Traditional systems", "Records what someone enters later."],
                  ["Workforce apps", "Ask frontline teams to learn another tool."],
                  ["Fragmented communication", "Leaves ownership, proof, and follow-up unclear."],
                  ["Munshi", "Runs the workflow inside WhatsApp and voice, then verifies the outcome."],
                ].map(([title, desc], i) => (
                  <div key={title} className={`rounded-2xl border px-4 py-3.5 ${i === 3 ? "bg-[#25D366]/15 border-[#25D366]/30" : "bg-white/6 border-white/10"}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${i === 3 ? "bg-[#25D366]" : "bg-white/10"}`}>
                        {i === 3 ? <Check className="w-4 h-4 text-white" /> : <MessageCircle className="w-4 h-4 text-white/50" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{title}</p>
                        <p className="text-xs text-gray-500 leading-relaxed mt-1">{desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Benefits row */}
        <div className="benefits-grid grid sm:grid-cols-3 gap-4 sm:gap-5">
          {benefits.map((b, i) => (
            <div key={i} className="benefit-card bg-white/4 border border-white/8 rounded-2xl p-5 sm:p-6 hover:bg-white/7 transition-colors duration-200">
              <div className="w-10 h-10 bg-[#25D366]/15 rounded-xl flex items-center justify-center mb-4">
                <b.icon className="w-5 h-5 text-[#25D366]" />
              </div>
              <h3 className="font-bold text-white text-sm mb-2">{b.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
    <GetAccessModal open={accessModalOpen} onClose={() => setAccessModalOpen(false)} />
    </>
  )
}