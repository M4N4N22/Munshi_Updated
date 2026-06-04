"use client"

import { Building2, DatabaseZap, Network, UsersRound } from "lucide-react"
import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const expansionSteps = [
  {
    number: "01",
    icon: UsersRound,
    title: "Connect People",
    focus: "Human operations",
    description: "Coordinate people, execution, and communication from one operational layer.",
    items: ["Workforce coordination", "Attendance visibility", "Task delegation", "Escalation management", "Vendor follow-ups"],
  },
  {
    number: "02",
    icon: DatabaseZap,
    title: "Connect Systems",
    focus: "Business software",
    description: "Unify operational execution with the systems your business already depends on.",
    items: ["ERP-linked workflows", "CRM-connected operations", "Reporting synchronization", "Operational data movement"],
  },
  {
    number: "03",
    icon: Network,
    title: "Connect Everything",
    focus: "Business-wide orchestration",
    description: "One operational command layer across your entire business.",
    items: ["Cross-functional workflows", "Multi-location operations", "People + vendors + processes + systems"],
  },
]

export function BusinessEvolutionSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".evolution-header", { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.75, ease: "power3.out", scrollTrigger: { trigger: sectionRef.current, start: "top 80%" } })
      gsap.fromTo(".evolution-card", { opacity: 0, y: 44, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.65, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: ".evolution-grid", start: "top 78%" } })
      gsap.fromTo(".evolution-connector", { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: ".evolution-grid", start: "top 78%" } })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="py-20 sm:py-24 bg-gray-50 border-y border-gray-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="evolution-header text-center mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-2 bg-[#25D366]/10 rounded-full px-4 py-1.5 mb-4">
            <Building2 className="w-4 h-4 text-[#25D366]" />
            <span className="text-xs font-bold text-[#25D366] uppercase tracking-widest">Platform Expansion</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Munshi scales across your operational stack</h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-base leading-relaxed">
            Start with the work people do every day, then connect that execution to systems, locations, vendors, and business-wide workflows.
          </p>
        </div>

        <div className="evolution-grid relative">
          <div className="hidden lg:block evolution-connector absolute top-16 left-[18%] right-[18%] h-0.5 bg-gradient-to-r from-[#25D366]/20 via-[#25D366] to-[#25D366]/20 origin-left rounded-full" />
          <div className="lg:hidden absolute left-8 top-12 bottom-12 w-0.5 bg-gradient-to-b from-[#25D366]/20 via-[#25D366] to-[#25D366]/20 rounded-full" />

          <div className="grid lg:grid-cols-3 gap-5 lg:gap-6">
            {expansionSteps.map((step) => (
              <div key={step.title} className="evolution-card relative bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-[#25D366]/20 transition-all duration-300">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="relative z-10 w-14 h-14 bg-[#25D366] rounded-2xl flex items-center justify-center shadow-lg shadow-[#25D366]/25">
                    <step.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-4xl font-bold text-gray-100 leading-none">{step.number}</span>
                </div>

                <span className="inline-block text-[11px] font-bold text-[#25D366] uppercase tracking-widest bg-[#25D366]/10 rounded-full px-3 py-1 mb-4">
                  {step.focus}
                </span>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">{step.description}</p>

                <div className="space-y-2.5">
                  {step.items.map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] flex-shrink-0" />
                      <span className="text-sm text-gray-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
