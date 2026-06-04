"use client"

import { useState } from "react"
import { X, CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GetAccessModalProps {
  open: boolean
  onClose: () => void
}

export function GetAccessModal({ open, onClose }: GetAccessModalProps) {
  const [form, setForm] = useState({
    name: "",
    number: "",
    businessName: "",
    description: "",
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError("")
  }

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!form.name || !form.number || !form.businessName || !form.description) {
      setError("Please fill in all fields.")
      return
    }
    if (!/^\d{10}$/.test(form.number.replace(/\s/g, ""))) {
      setError("Please enter a valid 10-digit phone number.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Something went wrong.")
      }

      setSubmitted(true)
      setForm({ name: "", number: "", businessName: "", description: "" })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to submit. Please try again."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
    setTimeout(() => {
      setSubmitted(false)
      setError("")
      setForm({ name: "", number: "", businessName: "", description: "" })
    }, 300)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0f1a14] to-[#1a2e1f] px-8 pt-8 pb-6">
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-200"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-[#25D366] rounded-full flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <span className="text-xs font-bold text-[#25D366] uppercase tracking-widest">Book a Demo</span>
          </div>
          <h2 className="text-2xl font-bold text-white leading-tight">
            See Munshi run your<br />operations on WhatsApp
          </h2>
          <p className="text-white/60 text-sm mt-2">Share your details and we&apos;ll schedule a walkthrough around your operating workflows.</p>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          {submitted ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-[#25D366]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#25D366]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Demo request received</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Thanks for your interest. We&apos;ll reach out at <span className="font-semibold text-gray-700">{form.number || "your number"}</span> to schedule a walkthrough.
              </p>
              <Button
                onClick={handleClose}
                className="bg-[#25D366] hover:bg-[#1fba5a] text-white rounded-full px-8 font-bold"
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Name *</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number *</label>
                <input
                  type="tel"
                  name="number"
                  value={form.number}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Business Name *</label>
                <input
                  type="text"
                  name="businessName"
                  value={form.businessName}
                  onChange={handleChange}
                  placeholder="e.g. Sharma Textiles Pvt Ltd"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Business Description *</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Tell us briefly about your operations, teams, vendors, and current follow-up process..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] transition-all duration-200 resize-none"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">
                  {error}
                </p>
              )}

              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-[#25D366] hover:bg-[#1fba5a] text-white rounded-full py-6 text-[15px] font-bold shadow-lg shadow-[#25D366]/20 transition-all duration-300 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  "Book Demo"
                )}
              </Button>

              <p className="text-center text-xs text-gray-400">
                We respect your privacy. No spam, ever.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}