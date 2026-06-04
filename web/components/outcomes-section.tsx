"use client"

import { CalendarCheck, CheckCircle2, PackageCheck, Repeat2, Truck, Users } from "lucide-react"
import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const outcomes = [
  {
    icon: CalendarCheck,
    title: "Know attendance before the day starts",
    desc: "Leadership begins the day with a clear view of workforce availability and exceptions.",
  },
  {
    icon: CheckCircle2,
    title: "Work gets completed without chasing",
    desc: "Munshi follows up, collects proof, and escalates when work is stuck.",
  },
  {
    icon: Truck,
    title: "Vendors respond faster",
    desc: "Follow-ups, dispatch confirmations, and payment reminders stay visible and consistent.",
  },
  {
    icon: PackageCheck,
    title: "Inventory issues surface sooner",
    desc: "Stock alerts and replenishment workflows reach the right person before the shortage spreads.",
  },
  {
    icon: Users,
    title: "Managers focus on execution",
    desc: "Managers spend less time asking for status and more time removing blockers.",
  },
  {
    icon: Repeat2,
    title: "Operations become repeatable",
    desc: "Daily routines, approvals, and summaries stop depending on memory and manual coordination.",
  },
]

export function OutcomesSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".outcomes-header", { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.75, ease: "power3.out", scrollTrigger: { trigger: sectionRef.current, start: "top 80%" } })
      gsap.fromTo(".outcome-card", { opacity: 0, y: 36, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: ".outcomes-grid", start: "top 80%" } })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="py-20 sm:py-24 bg-gray-50 border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="outcomes-header text-center mb-14">
          <p className="text-xs font-bold text-[#25D366] uppercase tracking-widest mb-3">WHAT CHANGES OPERATIONALLY</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Less chasing. More verified movement.</h2>
          <p className="text-gray-500 text-base max-w-2xl mx-auto">
            Munshi changes the operating rhythm of the business, not just the reporting layer.
          </p>
        </div>

        <div className="outcomes-grid grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {outcomes.map((outcome) => (
            <div key={outcome.title} className="outcome-card group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-[#25D366]/20 transition-all duration-300">
              <div className="w-11 h-11 bg-[#25D366]/10 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:bg-[#25D366] group-hover:scale-110">
                <outcome.icon className="w-5 h-5 text-[#25D366] transition-colors duration-300 group-hover:text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2 text-base leading-snug">{outcome.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{outcome.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
