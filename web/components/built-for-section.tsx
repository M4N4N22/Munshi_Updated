"use client"

import { BriefcaseBusiness, Database, Users } from "lucide-react"
import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const problems = [
  {
    icon: Users,
    title: "People",
    desc: "Operational work runs through calls, chats, memory, and verbal coordination. Tasks move only when someone remembers to chase them.",
  },
  {
    icon: Database,
    title: "Systems",
    desc: "Your business systems only reflect what gets entered. Updates arrive late, incomplete, or after the issue has already become expensive.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Leadership",
    desc: "Owners and managers become the coordination bottleneck, spending their day asking for updates instead of making decisions.",
  },
]

export function BuiltForSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".built-header", { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", scrollTrigger: { trigger: sectionRef.current, start: "top 82%" } })
      gsap.fromTo(".built-card", { opacity: 0, y: 36, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.1, ease: "back.out(1.3)", scrollTrigger: { trigger: ".built-grid", start: "top 80%" } })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="py-20 bg-gray-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="built-header text-center mb-14">
          <p className="text-xs font-bold text-[#25D366] uppercase tracking-widest mb-3">THE OPERATIONS GAP</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Your business is working. It is not working together.</h2>
          <p className="text-gray-500 text-base max-w-2xl mx-auto">
            The problem is not effort. It is the silence between people, systems, vendors, and leadership.
          </p>
        </div>

        <div className="built-grid grid grid-cols-1 md:grid-cols-3 gap-5">
          {problems.map((item, index) => (
            <div key={index} className="built-card group bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-[#25D366]/20 transition-all duration-300 cursor-default text-center">
              <div className="w-12 h-12 bg-[#f0fdf4] rounded-xl flex items-center justify-center mb-5 mx-auto transition-all duration-300 group-hover:bg-[#25D366] group-hover:scale-110">
                <item.icon className="w-5 h-5 text-[#25D366] transition-colors duration-300 group-hover:text-white" />
              </div>
              <p className="font-bold text-gray-800 mb-2 text-sm leading-snug">{item.title}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>


      </div>
    </section>
  )
}