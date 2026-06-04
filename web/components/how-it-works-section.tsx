"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const steps = [
  {
    number: "1",
    title: "Task created naturally",
    description: "Assign an inventory audit, follow up with a vendor, check attendance, or collect a shift report in plain language.",
  },
  {
    number: "2",
    title: "Munshi delegates automatically",
    description: "Munshi routes the work to the right worker, manager, department, or vendor with the context they need.",
  },
  {
    number: "3",
    title: "Teams respond naturally",
    description: "People reply through WhatsApp, voice, images, or text. No separate workforce app or dashboard training required.",
  },
  {
    number: "4",
    title: "Munshi verifies execution",
    description: "Visual proof, proof validation, and accountability checks turn updates into reliable operational records.",
  },
  {
    number: "5",
    title: "Leadership gets the summary",
    description: "Owners and managers receive a verified view of what happened, what is delayed, and what needs a decision.",
  },
]

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".how-header", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: sectionRef.current, start: "top 80%" } })
      gsap.fromTo(".how-step", { opacity: 0, y: 50, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.65, stagger: 0.16, ease: "back.out(1.4)", scrollTrigger: { trigger: ".how-steps-grid", start: "top 80%" } })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="how-header text-center mb-16">
          <p className="text-xs font-bold text-[#25D366] uppercase tracking-widest mb-3">HOW MUNSHI WORKS</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">From instruction to verified summary</h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-base leading-relaxed">
            Munshi behaves like an operational coordinator that never forgets who needs to do what, when to follow up, and when to escalate.
          </p>
        </div>

        <div className="how-steps-grid grid sm:grid-cols-2 lg:grid-cols-5 gap-5 max-w-7xl mx-auto relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-8 left-[calc(10%+28px)] right-[calc(10%+28px)] h-0.5 bg-gradient-to-r from-[#25D366]/30 via-[#25D366] to-[#25D366]/30 rounded-full" />

          {steps.map((step, index) => (
            <div key={index} className="how-step group bg-white rounded-2xl p-7 border border-gray-100 shadow-sm text-center relative z-10 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:border-[#25D366]/20">
              <div className="w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#25D366]/25 transition-all duration-300 group-hover:scale-110 group-hover:shadow-[#25D366]/40">
                <span className="text-white font-bold text-lg">{step.number}</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-3 text-sm leading-snug">{step.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}