"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2, ClipboardList, MessageCircle, Mic, Play, ShieldCheck } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { GetAccessModal } from "@/components/get-access-modal"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const demoHighlights = [
  {
    icon: ClipboardList,
    title: "Assign operating work",
    desc: "A manager creates attendance, inventory, and vendor follow-up tasks in plain language.",
  },
  {
    icon: MessageCircle,
    title: "Collect natural responses",
    desc: "Workers reply through WhatsApp, voice, image, or text without opening a new app.",
  },
  {
    icon: ShieldCheck,
    title: "Verify and summarize",
    desc: "Munshi validates proof, escalates delays, and sends leadership a clean operating summary.",
  },
]

const demoChannels = [
  { icon: MessageCircle, label: "WhatsApp" },
  { icon: Mic, label: "Voice" },
  { icon: ClipboardList, label: "Proof" },
  { icon: ShieldCheck, label: "Verified" },
]

const demoEmbed = `
  <html>
    <body style="margin:0;background:#071209;color:white;font-family:Inter,Arial,sans-serif;">
      <div style="height:100%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 20% 20%,rgba(37,211,102,.18),transparent 28%),linear-gradient(135deg,#0f1a14,#0d1f11 55%,#071209);">
        <div style="width:88%;max-width:780px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
            <div style="display:flex;align-items:center;gap:10px;color:#25D366;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;">
              <span style="width:10px;height:10px;border-radius:999px;background:#25D366;display:inline-block;box-shadow:0 0 18px rgba(37,211,102,.9);"></span>
              Operations command layer
            </div>
            <div style="color:rgba(255,255,255,.55);font-size:12px;font-weight:700;">Live workflow preview</div>
          </div>
          <div style="border:1px solid rgba(255,255,255,.14);border-radius:30px;padding:24px;background:rgba(255,255,255,.07);box-shadow:0 30px 90px rgba(0,0,0,.42);backdrop-filter:blur(12px);">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
              <div style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:15px;">
                <div style="color:rgba(255,255,255,.45);font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px;">Task created</div>
                <div style="color:white;font-size:16px;font-weight:800;line-height:1.35;">Assign inventory audit to Shift A and follow up with packaging vendor.</div>
              </div>
              <div style="background:#25D366;color:white;border-radius:18px;padding:15px;box-shadow:0 18px 45px rgba(37,211,102,.22);">
                <div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px;opacity:.8;">Munshi delegated</div>
                <div style="font-size:16px;font-weight:800;line-height:1.35;">3 tasks routed, photo proof requested, vendor reminder scheduled.</div>
              </div>
            </div>
            <div style="display:grid;gap:12px;">
              <div style="background:white;color:#1f2937;border-radius:18px;padding:15px;font-size:15px;font-weight:800;">Worker replied with voice note, photo proof, and stock count.</div>
              <div style="display:flex;gap:12px;">
                <div style="flex:1;background:#DCFCE7;color:#166534;border-radius:18px;padding:15px;font-size:15px;font-weight:900;">2 complete</div>
                <div style="flex:1;background:#FEF3C7;color:#92400E;border-radius:18px;padding:15px;font-size:15px;font-weight:900;">1 delayed</div>
                <div style="flex:1;background:#DBEAFE;color:#1E40AF;border-radius:18px;padding:15px;font-size:15px;font-weight:900;">Vendor escalated</div>
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;margin-top:24px;">
            <div style="width:68px;height:68px;border-radius:999px;background:#25D366;display:flex;align-items:center;justify-content:center;box-shadow:0 18px 42px rgba(37,211,102,.28);">
              <div style="width:0;height:0;border-top:14px solid transparent;border-bottom:14px solid transparent;border-left:21px solid white;margin-left:5px;"></div>
            </div>
          </div>
        </div>
      </div>
    </body>
  </html>
`

export function LiveDemosSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [accessModalOpen, setAccessModalOpen] = useState(false)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".demos-header",
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
          },
        }
      )

      gsap.fromTo(
        ".demo-panel",
        { opacity: 0, y: 80, scale: 0.9 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          stagger: 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".demos-grid",
            start: "top 80%",
          },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <>
    <section ref={sectionRef} className="py-20 sm:py-24 bg-white overflow-hidden relative" id="demo">
      <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-[#25D366]/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-[360px] h-[360px] bg-emerald-100/60 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="demos-header text-center mb-16">
          <p className="text-xs font-bold text-[#25D366] uppercase tracking-widest mb-3">
            DEMO
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            See Munshi Run Your Operations
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-base leading-relaxed">
            Watch the operating flow: assignment, delegation, natural response, proof validation, escalation, and verified leadership summary.
          </p>
        </div>

        <div className="demos-grid max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-[1.45fr_0.85fr] gap-5 lg:gap-6 items-stretch bg-[#0b1a14] rounded-[2rem] sm:rounded-[2.5rem] p-3 sm:p-4 lg:p-5 shadow-2xl shadow-gray-900/20 border border-gray-900/10 overflow-hidden relative">
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "42px 42px" }} />
            <div className="demo-panel relative bg-gray-950 rounded-[1.6rem] sm:rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between gap-4 px-4 sm:px-5 py-3 border-b border-white/10 bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-300/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#25D366]" />
                </div>
                <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold text-white/50 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse" />
                  Workflow preview
                </div>
              </div>
              <div className="relative aspect-video">
                <iframe
                  title="Munshi operations demo"
                  srcDoc={demoEmbed}
                  className="absolute inset-0 h-full w-full"
                  loading="lazy"
                />
                <div className="absolute left-4 right-4 bottom-4 hidden sm:flex items-center justify-between gap-3">
                  <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-xl border border-white/70">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Verified summary</p>
                    <p className="text-xs font-bold text-gray-800">2 complete | 1 delayed | vendor escalated</p>
                  </div>
                  <button aria-label="Play Munshi demo" className="w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-2xl shadow-[#25D366]/30 transition-transform duration-300 hover:scale-105">
                    <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 sm:p-4 bg-white/[0.03] border-t border-white/10">
                {demoChannels.map((channel) => (
                  <div key={channel.label} className="flex items-center justify-center gap-2 rounded-full bg-white/[0.06] border border-white/10 px-3 py-2">
                    <channel.icon className="w-3.5 h-3.5 text-[#25D366]" />
                    <span className="text-[11px] font-bold text-white/70">{channel.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="demo-panel relative bg-white rounded-[1.6rem] sm:rounded-[2rem] p-6 sm:p-7 border border-white/80 shadow-xl">
              <div className="inline-flex items-center gap-2 bg-[#25D366]/10 rounded-full px-3 py-1.5 mb-5">
                <CheckCircle2 className="w-4 h-4 text-[#25D366]" />
                <span className="text-[11px] font-bold text-[#25D366] uppercase tracking-widest">What you will see</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">A guided walkthrough of real operating work</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                See how Munshi turns scattered follow-ups into a controlled workflow from task creation to verified leadership summary.
              </p>

              <div className="space-y-3 mb-7">
                {demoHighlights.map((highlight, index) => (
                  <div key={highlight.title} className="group rounded-2xl border border-gray-100 bg-gray-50 p-4 transition-all duration-300 hover:bg-white hover:shadow-md hover:border-[#25D366]/20">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-[#25D366] transition-colors duration-300">
                        <highlight.icon className="w-4 h-4 text-[#25D366] group-hover:text-white transition-colors duration-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-[#25D366] uppercase tracking-widest">0{index + 1}</span>
                          <h4 className="text-sm font-bold text-gray-900">{highlight.title}</h4>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{highlight.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-7">
                {[
                  ["5", "Steps"],
                  ["4", "Channels"],
                  ["1", "Summary"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-2xl bg-[#0b1a14] px-3 py-3 text-center">
                    <p className="text-lg font-bold text-white">{value}</p>
                    <p className="text-[10px] font-semibold text-white/45 uppercase tracking-wide">{label}</p>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => setAccessModalOpen(true)}
                className="bg-[#25D366] hover:bg-[#1fba5a] text-white rounded-full w-full px-6 py-5 font-bold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#25D366]/30"
              >
                Book a Demo
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
    <GetAccessModal open={accessModalOpen} onClose={() => setAccessModalOpen(false)} />
    </>
  )
}