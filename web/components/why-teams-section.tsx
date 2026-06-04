"use client"

import { Factory, HardHat, Pill, Store, Truck, Utensils } from "lucide-react"
import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const features = [
  {
    icon: Factory,
    title: "Manufacturing",
    description: "Coordinate shift attendance, production tasks, machine issue escalation, inventory checks, and supervisor reports from the floor.",
    accent: "#3B82F6",
    bg: "bg-blue-50",
  },
  {
    icon: Pill,
    title: "Pharma",
    description: "Track batch-adjacent operational tasks, vendor follow-ups, dispatch confirmations, audit proof, and daily compliance coordination.",
    accent: "#8B5CF6",
    bg: "bg-violet-50",
  },
  {
    icon: HardHat,
    title: "Construction",
    description: "Collect site check-ins, assign work packages, verify photo proof, escalate material delays, and coordinate contractors.",
    accent: "#F59E0B",
    bg: "bg-amber-50",
  },
  {
    icon: Utensils,
    title: "Restaurants",
    description: "Manage staff attendance, prep checklists, stock shortages, purchase approvals, and vendor delivery follow-ups across outlets.",
    accent: "#25D366",
    bg: "bg-green-50",
  },
  {
    icon: Store,
    title: "Retail",
    description: "Coordinate store opening tasks, stock replenishment, cashier updates, merchandising checks, and multi-outlet summaries.",
    accent: "#EF4444",
    bg: "bg-red-50",
  },
  {
    icon: Truck,
    title: "Distribution",
    description: "Follow up on dispatches, collect delivery confirmations, manage payment reminders, and surface bottlenecks across routes.",
    accent: "#0EA5E9",
    bg: "bg-sky-50",
  },
]

export function WhyTeamsSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".why-header", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: sectionRef.current, start: "top 80%" } })
      gsap.fromTo(".why-card", { opacity: 0, y: 50, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.65, stagger: 0.13, ease: "power3.out", scrollTrigger: { trigger: ".why-grid", start: "top 80%" } })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="why-header text-center mb-16">
          <p className="text-xs font-bold text-[#25D366] uppercase tracking-widest mb-3">INDUSTRY USE CASES</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Built for operationally intense businesses
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-base leading-relaxed">
            Munshi fits teams where work moves across people, locations, vendors, and time-sensitive follow-ups.
          </p>
        </div>

        <div className="why-grid grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, index) => (
            <div key={index} className="why-card group bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 hover:border-transparent transition-all duration-300 cursor-default">
              <div className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110`} style={{ backgroundColor: `${feature.accent}15` }}>
                <feature.icon className="w-6 h-6 transition-colors duration-300" style={{ color: feature.accent }} />
              </div>
              <h3 className="font-bold text-gray-900 mb-3 text-sm leading-snug">{feature.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}