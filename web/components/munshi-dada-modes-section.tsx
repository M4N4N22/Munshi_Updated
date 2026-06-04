"use client"

import Image from "next/image"
import { Check } from "lucide-react"
import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const modes = [
  {
    badge: "Owners",
    title: "Visibility without daily chasing",
    subtitle: "Control and decisions",
    desc: "See what is happening across teams, vendors, and locations before small delays become business problems.",
    checks: ["Verified operating summaries", "Escalations that need attention", "Multi-location visibility", "Decision-ready updates"],
    image: "/images/team-support.jpg",
  },
  {
    badge: "Managers",
    title: "Delegate work and prove execution",
    subtitle: "Execution and accountability",
    desc: "Assign tasks, track completion, collect proof, and know exactly where follow-up or escalation is required.",
    checks: ["Automatic delegation", "Supervisor follow-ups", "Proof collection", "Delay escalation"],
    image: "/images/team-women.jpg",
  },
  {
    badge: "Workers",
    title: "Respond in the way they already work",
    subtitle: "Simplicity and familiarity",
    desc: "Workers do not need a dashboard. They can reply through WhatsApp, voice, image, or simple text.",
    checks: ["No new app", "Voice-friendly updates", "Image proof", "Zero training friction"],
    image: "/images/woman-phone.jpg",
  },
  {
    badge: "Vendors",
    title: "Keep external coordination moving",
    subtitle: "Communication and responsiveness",
    desc: "Vendors receive follow-ups, confirmations, and reminders in a format that keeps procurement and delivery moving.",
    checks: ["Dispatch confirmations", "Delivery coordination", "Payment reminders", "Faster responses"],
    image: "/images/booking-woman.jpg",
  },
]

export function MunshiDadaModesSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".modes-header", { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", scrollTrigger: { trigger: sectionRef.current, start: "top 80%" } })
      gsap.fromTo(".mode-card", { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.15, ease: "power3.out", scrollTrigger: { trigger: ".modes-grid", start: "top 78%" } })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="modes-header text-center mb-16">
          <p className="text-xs font-bold text-[#25D366] uppercase tracking-widest mb-3">ROLE-BASED USE CASES</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 max-w-2xl mx-auto leading-tight mb-4">
            Every operator gets the interface they need
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base">
            Munshi connects leadership, managers, workers, and vendors without forcing everyone into the same software experience.
          </p>
        </div>

        <div className="modes-grid grid md:grid-cols-2 gap-6">
          {modes.map((mode, index) => (
            <div key={index} className="mode-card bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-400 group">
              <div className="relative h-56 overflow-hidden">
                <Image src={mode.image} alt={mode.title} fill className="object-cover transition-transform duration-600 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                <div className="absolute top-4 left-5">
                  <span className="text-xs font-bold text-gray-700 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full">{mode.subtitle}</span>
                </div>
                <div className="absolute bottom-4 left-5">
                  <span className="text-xs font-bold text-white bg-[#25D366] px-3 py-1.5 rounded-full uppercase tracking-wide">{mode.badge}</span>
                </div>
              </div>

              <div className="p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{mode.title}</h3>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">{mode.desc}</p>

                <div className="space-y-2.5 mb-8">
                  {mode.checks.map((text, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-[#25D366]" />
                      </div>
                      <span className="text-gray-600 text-sm">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}