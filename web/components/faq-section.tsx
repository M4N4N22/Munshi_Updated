"use client"

import { ChevronDown } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const faqs = [
  {
    question: "Do my workers need a new app?",
    answer: "No. Munshi is designed around the interfaces workers already use, especially WhatsApp and voice. The goal is to remove training friction, not add another workforce tool.",
  },
  {
    question: "Does Munshi work on WhatsApp?",
    answer: "Yes. WhatsApp-native workflows are central to Munshi. Teams can receive tasks, send updates, share proof, and respond to follow-ups without moving into a separate app.",
  },
  {
    question: "Can teams use voice instead of typing?",
    answer: "Yes. Workers and vendors can respond naturally with voice when typing is inconvenient. This is useful for field teams, shop-floor workers, site staff, and multilingual teams.",
  },
  {
    question: "Can Munshi work in local languages?",
    answer: "Yes. Munshi is built for multilingual operating environments where workers may prefer Hindi, English, Hinglish, or local-language communication.",
  },
  {
    question: "How does task verification work?",
    answer: "Munshi can request proof such as photos, text confirmations, voice notes, or structured responses. It then connects those updates to the task so managers receive a verified summary instead of scattered messages.",
  },
  {
    question: "Can vendors interact directly?",
    answer: "Yes. Vendors can receive follow-ups, payment reminders, dispatch confirmations, and delivery coordination messages directly through the same communication layer.",
  },
  {
    question: "Is Munshi suitable for multi-location businesses?",
    answer: "Yes. Munshi is useful when owners and managers need visibility across outlets, sites, shifts, departments, or vendor networks without manually calling each location.",
  },
  {
    question: "How does leadership receive updates?",
    answer: "Leadership receives concise summaries of completed work, pending items, escalations, and decisions required. The focus is on verified operational clarity, not more dashboard noise.",
  },
  {
    question: "How much operational involvement is required from my team?",
    answer: "Your team defines the workflows, roles, and escalation rules. After that, Munshi handles routine delegation, reminders, update collection, and summaries inside the daily operating rhythm.",
  },
  {
    question: "Is Munshi difficult for workers to use?",
    answer: "No. Workers interact through simple prompts, replies, images, and voice notes. The experience is intentionally familiar so adoption does not depend on software training.",
  },
  {
    question: "Can Munshi help with attendance and task tracking together?",
    answer: "Yes. Attendance, task assignment, completion tracking, proof collection, and escalation can work together so managers understand both who is available and what is getting done.",
  },
  {
    question: "Can Munshi coordinate across departments?",
    answer: "Yes. Munshi can route work across operations, procurement, finance, supervisors, workers, and vendors so the right people receive the right follow-up at the right time.",
  },
]

export function FAQSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [showAll, setShowAll] = useState(false)
  const primaryFaqs = faqs.slice(0, 4)
  const hiddenFaqs = faqs.slice(4)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".faq-header", { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.75, ease: "power3.out", scrollTrigger: { trigger: sectionRef.current, start: "top 80%" } })
      gsap.fromTo(".faq-item", { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.06, ease: "power2.out", scrollTrigger: { trigger: ".faq-list", start: "top 80%" } })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="py-20 sm:py-24 bg-gray-50">
      <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="faq-header text-center mb-12">
          <p className="text-xs font-bold text-[#25D366] uppercase tracking-widest mb-3">FAQ</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Questions operators ask before a demo</h2>
          <p className="text-gray-500 text-base max-w-2xl mx-auto">
            Munshi is built for real teams, vendors, managers, and owners who need operations to move without manual chasing.
          </p>
        </div>

        <div className="faq-list space-y-3">
          {primaryFaqs.map((faq) => (
            <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}

          <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${showAll ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="overflow-hidden">
              <div className="space-y-3 pt-3">
                {hiddenFaqs.map((faq) => (
                  <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            aria-expanded={showAll}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#25D366]/30 hover:bg-[#25D366]/5 hover:text-[#25D366] hover:shadow-md"
          >
            {showAll ? "Show Less" : "Show More"}
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showAll ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>
    </section>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="faq-item group bg-white rounded-2xl border border-gray-100 shadow-sm open:shadow-md transition-all duration-300">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5">
        <span className="font-bold text-gray-900 text-sm sm:text-base">{question}</span>
        <ChevronDown className="w-5 h-5 text-[#25D366] flex-shrink-0 transition-transform duration-300 group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-5 sm:px-6">
        <p className="text-sm text-gray-500 leading-relaxed">{answer}</p>
      </div>
    </details>
  )
}
