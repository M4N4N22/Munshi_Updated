"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

// Fade in from bottom animation
export function useFadeInUp(delay: number = 0) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    gsap.fromTo(
      ref.current,
      { 
        opacity: 0, 
        y: 60 
      },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        delay,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      }
    )

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill())
    }
  }, [delay])

  return ref
}

// Fade in from left animation
export function useFadeInLeft(delay: number = 0) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    gsap.fromTo(
      ref.current,
      { 
        opacity: 0, 
        x: -80 
      },
      {
        opacity: 1,
        x: 0,
        duration: 1,
        delay,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      }
    )

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill())
    }
  }, [delay])

  return ref
}

// Fade in from right animation
export function useFadeInRight(delay: number = 0) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    gsap.fromTo(
      ref.current,
      { 
        opacity: 0, 
        x: 80 
      },
      {
        opacity: 1,
        x: 0,
        duration: 1,
        delay,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      }
    )

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill())
    }
  }, [delay])

  return ref
}

// Scale in animation
export function useScaleIn(delay: number = 0) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    gsap.fromTo(
      ref.current,
      { 
        opacity: 0, 
        scale: 0.8 
      },
      {
        opacity: 1,
        scale: 1,
        duration: 0.8,
        delay,
        ease: "back.out(1.7)",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      }
    )

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill())
    }
  }, [delay])

  return ref
}

// Parallax effect
export function useParallax(speed: number = 0.5) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    gsap.to(ref.current, {
      yPercent: -30 * speed,
      ease: "none",
      scrollTrigger: {
        trigger: ref.current,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    })

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill())
    }
  }, [speed])

  return ref
}

// Stagger children animation
export function useStaggerChildren() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const children = ref.current.children

    gsap.fromTo(
      children,
      { 
        opacity: 0, 
        y: 40 
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.15,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      }
    )

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill())
    }
  }, [])

  return ref
}

// Float animation (continuous)
export function useFloat() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    gsap.to(ref.current, {
      y: -15,
      duration: 2,
      ease: "power1.inOut",
      yoyo: true,
      repeat: -1,
    })

    return () => {
      gsap.killTweensOf(ref.current)
    }
  }, [])

  return ref
}

// Reveal text animation
export function useTextReveal() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    gsap.fromTo(
      ref.current,
      { 
        clipPath: "inset(0 100% 0 0)",
        opacity: 0
      },
      {
        clipPath: "inset(0 0% 0 0)",
        opacity: 1,
        duration: 1.2,
        ease: "power4.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      }
    )

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill())
    }
  }, [])

  return ref
}

// Counter animation
export function useCounter(endValue: number, duration: number = 2) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const obj = { value: 0 }

    gsap.to(obj, {
      value: endValue,
      duration,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ref.current,
        start: "top 85%",
        toggleActions: "play none none reset",
      },
      onUpdate: () => {
        if (ref.current) {
          ref.current.textContent = Math.round(obj.value).toString()
        }
      },
    })

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill())
    }
  }, [endValue, duration])

  return ref
}

// Rotate in animation
export function useRotateIn(delay: number = 0) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    gsap.fromTo(
      ref.current,
      { 
        opacity: 0, 
        rotation: -15,
        scale: 0.9
      },
      {
        opacity: 1,
        rotation: 0,
        scale: 1,
        duration: 0.8,
        delay,
        ease: "back.out(1.4)",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      }
    )

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill())
    }
  }, [delay])

  return ref
}
