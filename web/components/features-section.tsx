"use client"

import Image from "next/image"
import { Check } from "lucide-react"
import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const features = [
  {
    label: "Daily Operations",
    title: "Keep the operating rhythm visible",
    desc: "Munshi coordinates the daily work that usually disappears into calls, chats, and supervisor memory.",
    checks: ["Attendance tracking", "Workforce coordination", "Escalation management", "Supervisor follow-ups"],
    visual: "cards",
    cardItems: ["Attendance", "Shift report", "Supervisor follow-up", "Escalation"],
    cardBg: "bg-[#F0FDF4]",
  },
  {
    label: "Task Execution",
    title: "Turn assignments into accountable completion",
    desc: "Tasks are delegated, followed up, completed with proof, and summarized so managers know what moved and what did not.",
    checks: ["Task assignment", "Completion tracking", "Proof collection", "Accountability workflows"],
    visual: "image",
    image: "/images/booking-woman.jpg",
  },
  {
    label: "Inventory & Procurement",
    title: "Surface stock and purchase issues earlier",
    desc: "Munshi turns stock checks, replenishment requests, approvals, and vendor coordination into guided operational flows.",
    checks: ["Stock alerts", "Replenishment workflows", "Purchase approvals", "Vendor coordination"],
    visual: "cards",
    cardItems: ["Stock alert", "Reorder request", "Purchase approval", "Vendor follow-up"],
    cardBg: "bg-amber-50",
  },
  {
    label: "Vendor Management",
    title: "Coordinate external partners without manual chasing",
    desc: "Vendors can receive reminders, confirm dispatches, respond to delivery coordination, and stay accountable through the same familiar channels.",
    checks: ["Vendor follow-ups", "Dispatch confirmations", "Payment reminders", "Delivery coordination"],
    visual: "image",
    image: "/images/team-support.jpg",
  },
  {
    label: "Finance Operations",
    title: "Move finance follow-ups into the workflow",
    desc: "Munshi helps teams coordinate bookkeeping inputs, payment follow-ups, collections reminders, and finance-related approvals.",
    checks: ["Bookkeeping coordination", "Payment follow-ups", "Collections reminders", "Approval nudges"],
    visual: "cards",
    cardItems: ["Bookkeeping", "Payment follow-up", "Collections", "Approval"],
    cardBg: "bg-blue-50",
  },
  {
    label: "Communication Layer",
    title: "Use the interfaces your teams already understand",
    desc: "Munshi works through WhatsApp-native, multilingual, voice-enabled workflows so frontline adoption does not depend on a new app.",
    checks: ["WhatsApp native", "Multilingual communication", "Voice interactions", "Zero learning curve"],
    visual: "image",
    image: "/images/woman-phone.jpg",
  },
]

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".features-header", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: ".features-header", start: "top 80%" } })

      const featureBlocks = gsap.utils.toArray<HTMLElement>(".feature-block")
      featureBlocks.forEach((block, index) => {
        gsap.fromTo(block.querySelector(".feature-content"), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.85, ease: "power3.out", scrollTrigger: { trigger: block, start: "top 76%" } })
        const visual = block.querySelector(".feature-visual")
        if (visual) gsap.fromTo(visual, { opacity: 0, y: 40, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.85, ease: "power3.out", delay: 0.12, scrollTrigger: { trigger: block, start: "top 76%" } })
        gsap.fromTo(block.querySelectorAll(".feature-check"), { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.09, ease: "power2.out", scrollTrigger: { trigger: block, start: "top 72%" } })
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="py-16 sm:py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="features-header text-center mb-12 sm:mb-20">
          <p className="text-xs font-bold text-[#25D366] uppercase tracking-widest mb-3">CAPABILITIES</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Business workflows, not disconnected features</h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-sm sm:text-base">
            Munshi organizes operational work into the flows teams already run every day: people, tasks, inventory, vendors, finance, and communication.
          </p>
        </div>

        <div className="space-y-16 sm:space-y-24">
          {features.map((feature, index) => {
            const isEven = index % 2 === 0
            return (
              <div key={index} className={`feature-block grid lg:grid-cols-2 gap-8 sm:gap-12 items-center`}>
                {/* Visual - always first on mobile, alternates on desktop */}
                <div className={`feature-visual order-1 ${isEven ? "lg:order-2" : "lg:order-1"}`}>
                  {feature.visual === "cards" ? (
                    <div className={`${feature.cardBg} rounded-2xl sm:rounded-3xl p-5 sm:p-8`}>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-2 sm:mb-3">
                        {feature.cardItems?.map((item, i) => (
                          <div key={i} className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default">
                            <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">{item}</p>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#25D366] rounded-full" style={{ width: `${55 + i * 12}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-white">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#25D366] rounded-full flex items-center justify-center flex-shrink-0">
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          </div>
                          <p className="text-xs text-gray-500 font-medium">Munshi collected the update and routed the next step.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl sm:rounded-3xl shadow-lg">
                      <Image src={feature.image!} alt={feature.title} width={500} height={400} className="rounded-2xl sm:rounded-3xl object-cover transition-transform duration-700 hover:scale-105 w-full" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className={`feature-content order-2 ${isEven ? "lg:order-1" : "lg:order-2"}`}>
                  <span className="inline-block text-xs font-bold text-[#25D366] uppercase tracking-widest bg-[#25D366]/10 rounded-full px-3 py-1 mb-4 sm:mb-5">{feature.label}</span>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">{feature.title}</h3>
                  <p className="text-gray-500 mb-5 sm:mb-7 leading-relaxed text-sm sm:text-base">{feature.desc}</p>
                  <div className="space-y-2.5 sm:space-y-3">
                    {feature.checks.map((text, i) => (
                      <div key={i} className="feature-check flex items-center gap-3 group">
                        <div className="w-5 h-5 bg-[#25D366]/10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:bg-[#25D366]">
                          <Check className="w-3 h-3 text-[#25D366] transition-colors duration-300 group-hover:text-white" />
                        </div>
                        <span className="text-gray-600 text-sm">{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}