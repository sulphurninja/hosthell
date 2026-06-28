"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Shield,
  Globe,
  Terminal,
  ArrowRight,
  Flame,
  Bot,
  Gauge,
  ChevronRight,
  MonitorUp,
  Store,
  CreditCard,
  Users,
  X,
  MessageSquare,
  ServerCrash,
  Clock,
  Wrench,
  Headphones,
  Rocket,
  CheckCircle2,
  Brain,
  TrendingUp,
} from "lucide-react";

/* ━━━ ANIMATION HELPERS ━━━ */

function FloatingParticles() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 4 + 2,
            height: Math.random() * 4 + 2,
            left: `${Math.random() * 100}%`,
            bottom: `-${Math.random() * 10}%`,
            background: `hsl(${Math.random() * 30}deg 80% 50% / ${Math.random() * 0.4 + 0.1})`,
            animation: `ember-float ${Math.random() * 8 + 8}s linear infinite`,
            animationDelay: `${Math.random() * 10}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes ember-float {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 0.3;
          }
          100% {
            transform: translateY(-100vh) scale(0.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

function AnimatedSection({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function AnimatedCounter({ target, suffix = "", duration = 2 }: { target: number; suffix?: string; duration?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const step = target / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, target, duration]);
  return <span ref={ref}>{count}{suffix}</span>;
}

function Tilt3DCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setRotateX(-y * 10);
    setRotateY(x * 10);
  }, []);
  return (
    <motion.div
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { setRotateX(0); setRotateY(0); }}
      style={{ perspective: 800 }}
      animate={{ rotateX, rotateY }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}

function TypingTerminal() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [visibleLines, setVisibleLines] = useState(0);

  const lines = [
    { prompt: "you", text: '"Deploy WordPress on server-04"', isAI: false, success: false },
    { prompt: "ai", text: "Connecting to 103.168.x.x via SSH...", isAI: true, success: false },
    { prompt: "ai", text: "Installing nginx, PHP 8.2, MariaDB...", isAI: true, success: false },
    { prompt: "ai", text: "Configuring WordPress, issuing SSL cert...", isAI: true, success: false },
    { prompt: "ai", text: "✓ WordPress live at server-04.client.com", isAI: true, success: true },
    { prompt: "separator", text: "", isAI: false, success: false },
    { prompt: "you", text: '"Customer says site is down — server-02"', isAI: false, success: false },
    { prompt: "ai", text: "Checking server-02 health metrics...", isAI: true, success: false },
    { prompt: "ai", text: "Detected: nginx OOM kill (memory spike at 14:32)", isAI: true, success: false },
    { prompt: "ai", text: "Restarting nginx, tuning worker_connections to 512...", isAI: true, success: false },
    { prompt: "ai", text: "✓ Site restored. Latency: 143ms. Customer notified.", isAI: true, success: true },
    { prompt: "separator", text: "", isAI: false, success: false },
    { prompt: "you", text: '"Scale server-07 — traffic spike incoming"', isAI: false, success: false },
    { prompt: "ai", text: "Current: 4GB RAM, 2 vCPU. Load: 78%.", isAI: true, success: false },
    { prompt: "ai", text: "Upgrading to 8GB RAM, 4 vCPU via provider API...", isAI: true, success: false },
    { prompt: "ai", text: "✓ Scaled. Zero downtime. New load: 31%.", isAI: true, success: true },
  ];

  useEffect(() => {
    if (!isInView) return;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      if (i >= lines.length) {
        setVisibleLines(lines.length);
        clearInterval(timer);
      } else {
        setVisibleLines(i);
      }
    }, 300);
    return () => clearInterval(timer);
  }, [isInView, lines.length]);

  return (
    <div ref={ref} className="max-w-2xl mx-auto rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl shadow-red-500/[0.03]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/50">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/40" />
          <div className="w-3 h-3 rounded-full bg-green-500/40" />
        </div>
        <span className="text-[0.65rem] text-zinc-500 ml-2 font-mono">hosthell-agent ~ live</span>
      </div>
      <div className="p-5 space-y-4 font-mono text-[0.8rem] leading-relaxed min-h-[420px]">
        {lines.slice(0, visibleLines).map((line, idx) => {
          if (line.prompt === "separator") {
            return <div key={idx} className="border-t border-zinc-800/50 pt-4" />;
          }
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-2"
            >
              <span className={`text-[0.7rem] font-semibold mt-0.5 shrink-0 uppercase tracking-wider ${line.isAI ? "text-red-400" : "text-zinc-500"}`}>
                {line.prompt === "you" ? "you ›" : "ai  ›"}
              </span>
              <span className={`${line.success ? "text-emerald-400" : line.isAI ? "text-zinc-400" : "text-zinc-300"}`}>{line.text}</span>
            </motion.div>
          );
        })}
        {visibleLines < lines.length && isInView && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
            className="inline-block w-2 h-4 bg-red-500 ml-1"
          />
        )}
      </div>
    </div>
  );
}

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

/* ━━━ MAIN PAGE ━━━ */

export default function LandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <FloatingParticles />

      {/* Ambient glow */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-red-600/[0.06] rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-red-900/[0.04] rounded-full blur-[120px]" />
        <div className="absolute top-1/3 left-0 w-[400px] h-[700px] bg-orange-900/[0.025] rounded-full blur-[100px]" />
      </div>

      {/* ─── NAV ─── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-20 flex items-center justify-between px-6 lg:px-12 py-5 max-w-7xl mx-auto"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-red-600 flex items-center justify-center">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight font-display">
            Host<span className="text-red-500">hell</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50">
              Login
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </motion.nav>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HERO
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section ref={heroRef} className="relative z-10 pt-16 sm:pt-24 pb-28 sm:pb-36 px-6 lg:px-12">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="max-w-[54rem] mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-medium mb-8 animate-pulse-border"
          >
            <Flame className="h-3.5 w-3.5" />
            The first AI-powered hosting OS. WHMCS era is over.
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-[2.75rem] sm:text-6xl lg:text-[4.75rem] font-bold tracking-tight leading-[1.08] mb-7 font-display"
          >
            <span className="text-white">Start your hosting</span>
            <br className="hidden sm:block" />
            <span className="text-white">business in </span>
            <span className="text-red-500 text-glow">10 minutes.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="text-lg sm:text-[1.25rem] text-zinc-400 max-w-[40rem] mx-auto mb-3.5 leading-relaxed"
          >
            No DevOps. No tickets. No duct-taping 7 tools together.
            <br className="hidden sm:block" />
            Just an AI-powered platform that sells, manages, and supports
            your entire hosting operation — while you sleep.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="text-[0.8rem] text-zinc-500/80 mb-11 tracking-wide"
          >
            Shopify for hosting + AI that runs your servers. That&apos;s the pitch.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/login">
              <Button size="lg" className="hell-gradient text-white px-8 h-13 text-base font-semibold hell-glow-sm hover:opacity-90 transition-opacity">
                <Terminal className="mr-2 h-5 w-5" />
                Login to Dashboard
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="px-8 h-13 text-base border-zinc-700 text-zinc-300 hover:bg-zinc-800/50 hover:border-zinc-600">
                See How It Works
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="mt-24 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 max-w-3xl mx-auto"
          >
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white font-display">
                <AnimatedCounter target={10} suffix=" min" />
              </p>
              <p className="text-[0.65rem] text-zinc-500 mt-1.5 uppercase tracking-wider leading-snug">To a live hosting company</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white font-display">
                <AnimatedCounter target={80} suffix="%" />
              </p>
              <p className="text-[0.65rem] text-zinc-500 mt-1.5 uppercase tracking-wider leading-snug">Ops handled by AI</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white font-display">24/7</p>
              <p className="text-[0.65rem] text-zinc-500 mt-1.5 uppercase tracking-wider leading-snug">Autonomous monitoring</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white font-display">₹0</p>
              <p className="text-[0.65rem] text-zinc-500 mt-1.5 uppercase tracking-wider leading-snug">DevOps budget needed</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          THE PROBLEM — Hosting is broken in 3 layers
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative z-10 py-24 px-6 lg:px-12 border-t border-zinc-800/40">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <p className="text-[0.7rem] font-semibold text-red-400 uppercase tracking-[0.2em] mb-3">The real problem</p>
            <h2 className="text-3xl sm:text-[2.5rem] font-bold text-white leading-tight mb-5 font-display">
              Running a hosting business is broken <br className="hidden sm:block" />in <span className="text-red-500">three fundamental layers.</span>
            </h2>
            <p className="text-zinc-500 max-w-2xl mx-auto">
              Plenty of tools fix one layer. Nobody has unified all three. That&apos;s the gap. That&apos;s where we come in.
            </p>
          </AnimatedSection>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <motion.div variants={staggerItem}>
              <ProblemCard
                icon={<Store className="h-5 w-5" />}
                number="01"
                title="Selling infra is stuck in 2010"
                desc="WHMCS. cPanel. Outdated UIs. Your customers expect a Stripe-level checkout and a modern dashboard. What they get is a panel designed before the iPhone existed."
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <ProblemCard
                icon={<ServerCrash className="h-5 w-5" />}
                number="02"
                title="Managing infra demands a DevOps team"
                desc="SSH into 30 servers. Write monitoring scripts. Configure alerting pipelines. Want to run a hosting business? Hope you've got 3 engineers and a night-shift budget."
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <ProblemCard
                icon={<Headphones className="h-5 w-5" />}
                number="03"
                title="Supporting users eats you alive"
                desc="'My site is down.' 'Server is slow.' 'I can't connect.' Tickets pile up. Your team is checking logs at 3 AM. Customers churn because you took 6 hours to reply."
              />
            </motion.div>
          </motion.div>

          <AnimatedSection delay={0.3} className="mt-12 p-5 rounded-xl border border-red-500/10 bg-red-500/[0.02] text-center">
            <p className="text-sm text-zinc-400">
              Everyone has tried to solve one of these.
              <span className="text-white font-semibold"> Nobody has unified all three with AI.</span>
            </p>
            <p className="text-xs text-zinc-600 mt-1.5">Until Hosthell.</p>
          </AnimatedSection>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          POSITIONING — WHMCS = tool. Hosthell = platform + intelligence.
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative z-10 py-24 px-6 lg:px-12 border-t border-zinc-800/40">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection className="text-center mb-14">
            <p className="text-[0.7rem] font-semibold text-red-400 uppercase tracking-[0.2em] mb-3">Category shift</p>
            <h2 className="text-3xl sm:text-[2.5rem] font-bold text-white leading-tight mb-5 font-display">
              We don&apos;t compete with WHMCS.<br className="hidden sm:block" />
              <span className="text-red-500">We replace the entire category.</span>
            </h2>
          </AnimatedSection>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto"
          >
            {/* WHMCS */}
            <motion.div variants={staggerItem} className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30">
              <p className="text-[0.65rem] font-semibold text-zinc-600 uppercase tracking-[0.15em] mb-5">The old way</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-400">WHMCS & friends</p>
                  <p className="text-xs text-zinc-600">&ldquo;Tool to manage hosting billing&rdquo;</p>
                </div>
              </div>
              <div className="space-y-3">
                <ComparisonLine icon={<X className="h-3.5 w-3.5 text-zinc-700" />} text="Install + configure + maintain" muted />
                <ComparisonLine icon={<X className="h-3.5 w-3.5 text-zinc-700" />} text="12 plugins for basic functionality" muted />
                <ComparisonLine icon={<X className="h-3.5 w-3.5 text-zinc-700" />} text="Manual provisioning & monitoring" muted />
                <ComparisonLine icon={<X className="h-3.5 w-3.5 text-zinc-700" />} text="Ticket-based support only" muted />
                <ComparisonLine icon={<X className="h-3.5 w-3.5 text-zinc-700" />} text="No intelligence, no automation" muted />
                <ComparisonLine icon={<X className="h-3.5 w-3.5 text-zinc-700" />} text="Looks like it was built in 2008" muted />
              </div>
            </motion.div>

            {/* Hosthell */}
            <motion.div variants={staggerItem} className="p-6 rounded-xl border border-red-500/20 bg-red-500/[0.03]">
              <p className="text-[0.65rem] font-semibold text-red-400 uppercase tracking-[0.15em] mb-5">The new standard</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Hosthell</p>
                  <p className="text-xs text-red-400/70">&ldquo;Run a hosting company with AI&rdquo;</p>
                </div>
              </div>
              <div className="space-y-3">
                <ComparisonLine icon={<CheckCircle2 className="h-3.5 w-3.5 text-red-500" />} text="Live in 10 minutes, zero config" />
                <ComparisonLine icon={<CheckCircle2 className="h-3.5 w-3.5 text-red-500" />} text="Storefront + billing + panel — unified" />
                <ComparisonLine icon={<CheckCircle2 className="h-3.5 w-3.5 text-red-500" />} text="AI provisions, monitors & fixes" />
                <ComparisonLine icon={<CheckCircle2 className="h-3.5 w-3.5 text-red-500" />} text="AI resolves support in real-time" />
                <ComparisonLine icon={<CheckCircle2 className="h-3.5 w-3.5 text-red-500" />} text="Intelligence layer: insights + optimization" />
                <ComparisonLine icon={<Flame className="h-3.5 w-3.5 text-red-500" />} text="Looks like the future. Because it is." />
              </div>
            </motion.div>
          </motion.div>

          <AnimatedSection delay={0.2} className="text-center mt-10">
            <p className="text-xs text-zinc-600 max-w-md mx-auto">
              WHMCS is a tool. Hosthell is a platform + intelligence + experience.
              <span className="text-zinc-400 font-medium"> Different category entirely.</span>
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          4 UNFAIR ADVANTAGES
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative z-10 py-24 px-6 lg:px-12 border-t border-zinc-800/40">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <p className="text-[0.7rem] font-semibold text-red-400 uppercase tracking-[0.2em] mb-3">Why we win</p>
            <h2 className="text-3xl sm:text-[2.5rem] font-bold text-white leading-tight mb-5 font-display">
              Four unfair advantages.<br className="hidden sm:block" />
              <span className="text-red-500">Stacked.</span>
            </h2>
            <p className="text-zinc-500 max-w-xl mx-auto text-sm">
              Any one of these is a product. We ship all four in a single platform.
            </p>
          </AnimatedSection>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            <motion.div variants={staggerItem}>
              <AdvantageCard
                num="01"
                icon={<Store className="h-6 w-6" />}
                label="Shopify for Hosting"
                title="Start a hosting company in 10 minutes"
                desc="Sign up and you instantly get a white-labeled storefront, payment gateway, product catalog, client dashboard, and server panel — all under your own domain. No WHMCS. No plugins. No setup headache. Just launch."
                highlights={["Prebuilt storefront", "Plans & checkout ready", "Payments ready", "Client panel ready"]}
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <AdvantageCard
                num="02"
                icon={<Bot className="h-6 w-6" />}
                label="AI DevOps Agent"
                title="This is where we destroy everyone"
                desc='WHMCS says "Server created." Hosthell says "Server created + configured + optimized + monitored + auto-healed." Type "Deploy Next.js" or "Fix high CPU" — the AI SSHs in, executes commands, reads logs, and resolves it. Autonomously.'
                highlights={["SSH execution", "Log analysis", "Auto-fixes", "Real commands, not chatbot"]}
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <AdvantageCard
                num="03"
                icon={<Headphones className="h-6 w-6" />}
                label="AI Customer Support"
                title="Kill the ticket queue forever"
                desc='Customer says "my site is down." The AI checks server logs, detects the issue, fixes it, and responds — all in under 30 seconds. No human intervention. Escalates only when it genuinely needs to. This alone saves you a full-time support hire.'
                highlights={["Instant diagnosis", "Auto-resolution", "Smart escalation", "24/7, no humans"]}
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <AdvantageCard
                num="04"
                icon={<Brain className="h-6 w-6" />}
                label="Intelligence Layer"
                title="The part WHMCS will never have"
                desc="Cost optimization insights. Usage analytics. Auto-scaling recommendations. Revenue forecasting. Hosthell doesn't just run your hosting business — it thinks about it. Every metric, every pattern, surfaced automatically."
                highlights={["Cost optimization", "Usage insights", "Auto-scaling triggers", "Revenue analytics"]}
              />
            </motion.div>
          </motion.div>

          <AnimatedSection delay={0.3} className="mt-12 text-center">
            <p className="text-[1.05rem] text-white font-semibold mt-2 max-w-lg mx-auto">
              &ldquo;Shopify for hosting + AI DevOps + AI support + intelligence — <span className="text-red-400">one platform.</span>&rdquo;
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HOW IT WORKS — 3 steps
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="how-it-works" className="relative z-10 py-24 px-6 lg:px-12 border-t border-zinc-800/40">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <p className="text-[0.7rem] font-semibold text-red-400 uppercase tracking-[0.2em] mb-3">How it works</p>
            <h2 className="text-3xl sm:text-[2.5rem] font-bold text-white leading-tight mb-5 font-display">
              Three steps. <span className="text-red-500">That&apos;s literally it.</span>
            </h2>
            <p className="text-zinc-500 text-sm max-w-lg mx-auto">
              No 47-page setup guide. No &ldquo;contact our sales team.&rdquo; Just do this and you&apos;re live.
            </p>
          </AnimatedSection>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-5"
          >
            <motion.div variants={staggerItem}>
              <StepCard
                num="01"
                title="Connect your providers"
                desc="Plug in Hostycare, SmartVPS, Virtualizor — any combination. Hosthell unifies them into a single control plane. 2 minutes, done."
                icon={<Wrench className="h-5 w-5" />}
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <StepCard
                num="02"
                title="Launch your brand"
                desc="White-labeled storefront, client dashboard, automated billing, server management panel — live under your domain. Your company, instantly."
                icon={<Rocket className="h-5 w-5" />}
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <StepCard
                num="03"
                title="Let AI handle ops"
                desc="Server provisioning, monitoring, troubleshooting, customer support — the AI runs it. You focus on growing your business, not babysitting infra."
                icon={<Bot className="h-5 w-5" />}
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          AI AGENT TERMINAL DEMO
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative z-10 py-24 px-6 lg:px-12 border-t border-zinc-800/40">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <p className="text-[0.7rem] font-semibold text-red-400 uppercase tracking-[0.2em] mb-3">See it in action</p>
            <h2 className="text-3xl sm:text-[2.5rem] font-bold text-white leading-tight mb-5 font-display">
              Your DevOps team. <span className="text-red-500">Minus the team.</span>
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto text-sm">
              Not a chatbot. An autonomous agent that SSHs into servers,
              runs real commands, reads logs, and fixes problems. Watch.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <TypingTerminal />
          </AnimatedSection>

          <AnimatedSection delay={0.4} className="text-center mt-5">
            <p className="text-xs text-zinc-600">
              Real SSH execution. Real commands. Real server actions. Not a wrapper on ChatGPT.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          WHAT YOU'RE ACTUALLY GETTING — full feature grid
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative z-10 py-24 px-6 lg:px-12 border-t border-zinc-800/40">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <p className="text-[0.7rem] font-semibold text-red-400 uppercase tracking-[0.2em] mb-3">Full platform</p>
            <h2 className="text-3xl sm:text-[2.5rem] font-bold text-white mb-4 font-display">
              Everything. Under <span className="text-red-500">one roof.</span>
            </h2>
            <p className="text-zinc-500 max-w-xl mx-auto text-sm">
              Stop paying for WHMCS + monitoring tool + ticketing system + provisioning scripts + a prayer.
            </p>
          </AnimatedSection>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <motion.div variants={staggerItem}><FeatureCard icon={<Store className="h-5 w-5" />} title="White-Label Storefront" desc="Your brand, your domain. Product pages, pricing tables, modern checkout. Customers see you, not us." /></motion.div>
            <motion.div variants={staggerItem}><FeatureCard icon={<Users className="h-5 w-5" />} title="Client Dashboards" desc="Every customer gets their own panel — server controls, credentials, reinstall, live metrics. Fully branded." /></motion.div>
            <motion.div variants={staggerItem}><FeatureCard icon={<CreditCard className="h-5 w-5" />} title="Automated Billing" desc="Razorpay, Stripe, UPI. Recurring invoices, renewal reminders, promo codes, wallet credits. Set it, forget it." /></motion.div>
            <motion.div variants={staggerItem}><FeatureCard icon={<MonitorUp className="h-5 w-5" />} title="One-Click Provisioning" desc="Customer pays → server created + configured + credentials sent. Across any provider. Fully automatic." /></motion.div>
            <motion.div variants={staggerItem}><FeatureCard icon={<Bot className="h-5 w-5" />} title="AI DevOps Agent" desc="SSHs in, deploys apps, fixes crashes, tunes configs, reads logs. Your 24/7 infrastructure team." /></motion.div>
            <motion.div variants={staggerItem}><FeatureCard icon={<MessageSquare className="h-5 w-5" />} title="AI Support Agent" desc="Customer has a problem → AI diagnoses, resolves, and responds. Before your team even wakes up." /></motion.div>
            <motion.div variants={staggerItem}><FeatureCard icon={<Gauge className="h-5 w-5" />} title="Real-Time Monitoring" desc="CPU, RAM, bandwidth, disk — live. Intelligent alerts. Auto-scaling triggers. No Grafana setup required." /></motion.div>
            <motion.div variants={staggerItem}><FeatureCard icon={<Shield className="h-5 w-5" />} title="Enterprise Security" desc="DDoS protection, automated backups, SSL management, role-based access. Built-in, not bolted on." /></motion.div>
            <motion.div variants={staggerItem}><FeatureCard icon={<Globe className="h-5 w-5" />} title="Multi-DC, Multi-Provider" desc="Hostycare + SmartVPS + Virtualizor + anything else. All providers, all datacenters, one unified interface." /></motion.div>
          </motion.div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          WHO IS THIS FOR — the ICP
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative z-10 py-24 px-6 lg:px-12 border-t border-zinc-800/40">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <p className="text-[0.7rem] font-semibold text-red-400 uppercase tracking-[0.2em] mb-3">Built for</p>
            <h2 className="text-3xl sm:text-[2.5rem] font-bold text-white leading-tight mb-5 font-display">
              If this sounds like you, <span className="text-red-500">we built this for you.</span>
            </h2>
          </AnimatedSection>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
          >
            <motion.div variants={staggerItem}>
              <PersonaCard
                emoji="🏪"
                title="Hosting Resellers"
                desc="You're tired of WHMCS. Tired of clunky panels. You want modern UX, automated ops, and a stack that doesn't make you embarrassed to show clients."
                tags={["Kill WHMCS", "Modern UX", "Auto-billing"]}
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <PersonaCard
                emoji="🛠️"
                title="Dev Agencies"
                desc="You want to resell hosting to your clients without hiring a sysadmin. Deploy their stuff, let AI manage it. Collect revenue while you focus on shipping code."
                tags={["Zero ops", "Client panels", "Passive revenue"]}
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <PersonaCard
                emoji="🚀"
                title="Indie Founders"
                desc="You've been thinking about launching a hosting business but the infra complexity stopped you. What if you could skip all of that and be live in 10 minutes?"
                tags={["Quick launch", "No DevOps", "AI-powered"]}
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          WHAT YOU'RE NOT JUST GETTING — the 10x framing
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative z-10 py-24 px-6 lg:px-12 border-t border-zinc-800/40">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection>
            <p className="text-[0.7rem] font-semibold text-red-400 uppercase tracking-[0.2em] mb-3">The real value</p>
            <h2 className="text-3xl sm:text-[2.5rem] font-bold text-white leading-tight mb-6 font-display">
              We&apos;re not saving you time.<br />
              <span className="text-red-500">We&apos;re removing entire jobs.</span>
            </h2>
          </AnimatedSection>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12"
          >
            <motion.div variants={staggerItem}>
              <ValueCard
                icon={<ServerCrash className="h-5 w-5" />}
                title="No more DevOps complexity"
                desc="You'll never SSH into a server, write a monitoring script, or debug nginx configs at 2 AM again."
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <ValueCard
                icon={<Headphones className="h-5 w-5" />}
                title="No more support burden"
                desc="AI handles first-line, second-line, and most third-line support. Your inbox stays clean. Your sanity stays intact."
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <ValueCard
                icon={<TrendingUp className="h-5 w-5" />}
                title="New businesses, enabled"
                desc="People who could never run a hosting company now can. That's not an incremental improvement. That's a new market."
              />
            </motion.div>
          </motion.div>

          <AnimatedSection delay={0.3}>
            <p className="text-xs text-zinc-600 mt-10">
              That&apos;s not a 2x product. <span className="text-zinc-400 font-medium">That&apos;s a 10x product.</span>
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          INFRASTRUCTURE PARTNER — OceanLinux
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative z-10 py-24 px-6 lg:px-12 border-t border-zinc-800/40">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium mb-6">
              <Image src="https://oceanlinux.com/ol.png" alt="OceanLinux" width={14} height={14} className="rounded-sm" />
              Infrastructure Partner
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 font-display">
              Backed by <span className="text-emerald-400">OceanLinux</span> — the infra layer that makes this possible
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto leading-relaxed text-sm">
              Hosthell is built on top of OceanLinux&apos;s production-grade infrastructure.
              The same platform that powers thousands of active servers across Indian
              datacenters is the engine behind every Hosthell deployment. We don&apos;t just
              integrate with infrastructure — we&apos;re built by the people who run it.
            </p>
          </AnimatedSection>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10"
          >
            <motion.div variants={staggerItem}><OceanStat val="100000+" label="Active servers managed" /></motion.div>
            <motion.div variants={staggerItem}><OceanStat val="Multiple DCs" label="Mumbai, Noida, expanding" /></motion.div>
            <motion.div variants={staggerItem}><OceanStat val="99.9%" label="Uptime track record" /></motion.div>
          </motion.div>

          <AnimatedSection delay={0.2} className="flex items-center justify-center">
            <div className="inline-flex items-center gap-4 px-6 py-4 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03]">
              <div className="h-11 w-11 rounded-lg bg-emerald-500/10 flex items-center justify-center overflow-hidden">
                <Image src="https://oceanlinux.com/ol.png" alt="OceanLinux" width={28} height={28} className="rounded-md" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">OceanLinux.com</p>
                <p className="text-xs text-zinc-500">Premium VPS &amp; Hosting Infrastructure — our foundation</p>
              </div>
              <a href="https://oceanlinux.com" target="_blank" rel="noopener noreferrer"
                className="ml-3 h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.3} className="text-center mt-6">
            <p className="text-xs text-zinc-600">
              We don&apos;t just partner with OceanLinux. We&apos;re <span className="text-zinc-400">built by the same team.</span>
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FINAL CTA
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative z-10 py-28 px-6 lg:px-12 border-t border-zinc-800/40">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection>
            <div className="relative p-10 sm:p-16 rounded-2xl border border-red-500/15 bg-gradient-to-b from-red-500/[0.06] to-transparent overflow-hidden">
              <div className="absolute inset-0 noise-bg" />
              <div className="relative z-10">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Flame className="h-11 w-11 text-red-500 mx-auto mb-6" />
                </motion.div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 font-display leading-tight">
                  Stop duct-taping. Stop hiring.<br />
                  <span className="text-red-500">Start raising hell.</span>
                </h2>
                <p className="text-zinc-400 mb-3 text-sm max-w-md mx-auto">
                  The first AI-powered hosting business OS.
                  From zero to hosting company in 10 minutes.
                </p>
                <p className="text-zinc-500 mb-10 text-xs max-w-md mx-auto">
                  Already have an OceanLinux order? Access your server dashboard now.
                  Everyone else — the public launch is coming.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link href="/login">
                    <Button size="lg" className="hell-gradient text-white px-10 h-12 text-base font-semibold hell-glow-sm hover:opacity-90 transition-opacity">
                      <Zap className="mr-2 h-5 w-5" />
                      Login to Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 border-t border-zinc-800/50 py-8 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-zinc-400 font-display">
              Host<span className="text-red-500">hell</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-600">Infrastructure by</span>
            <a href="https://oceanlinux.com" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-emerald-400 transition-colors">
              <Image src="https://oceanlinux.com/ol.png" alt="OceanLinux" width={12} height={12} className="rounded-sm" />
              OceanLinux
            </a>
            <span className="text-xs text-zinc-700">|</span>
            <p className="text-xs text-zinc-600">
              &copy; {new Date().getFullYear()} Hosthell. Raise hell.
            </p>
          </div>
        </div>
      </footer>

      {/* Animated gradient border keyframes */}
      <style jsx>{`
        @keyframes pulse-border {
          0%, 100% {
            border-color: rgba(239, 68, 68, 0.2);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
          50% {
            border-color: rgba(239, 68, 68, 0.5);
            box-shadow: 0 0 12px 0 rgba(239, 68, 68, 0.15);
          }
        }
        .animate-pulse-border {
          animation: pulse-border 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

/* ━━━ SUB-COMPONENTS ━━━ */

function ProblemCard({ icon, number, title, desc }: { icon: React.ReactNode; number: string; title: string; desc: string }) {
  return (
    <Tilt3DCard className="relative p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden hover:border-red-500/30 hover:shadow-[0_0_20px_rgba(239,68,68,0.05)] transition-all duration-300">
      <span className="text-5xl font-bold text-zinc-800/40 absolute -top-2 -right-1 font-display select-none">{number}</span>
      <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 mb-4">
        {icon}
      </div>
      <h3 className="text-[0.95rem] font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
    </Tilt3DCard>
  );
}

function AdvantageCard({ num, icon, label, title, desc, highlights }: { num: string; icon: React.ReactNode; label: string; title: string; desc: string; highlights: string[] }) {
  return (
    <Tilt3DCard className="relative p-7 rounded-xl border border-zinc-800/80 bg-zinc-900/30 hover:border-red-500/30 hover:shadow-[0_0_25px_rgba(239,68,68,0.07)] transition-all duration-300 overflow-hidden">
      <span className="text-6xl font-bold text-zinc-800/30 absolute -top-3 -right-2 font-display select-none">{num}</span>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-11 w-11 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-[0.6rem] font-semibold text-red-400 uppercase tracking-[0.15em]">{label}</p>
          <h3 className="text-base font-semibold text-white leading-tight">{title}</h3>
        </div>
      </div>
      <p className="text-sm text-zinc-400 leading-relaxed mb-5">{desc}</p>
      <div className="flex flex-wrap gap-1.5">
        {highlights.map((h) => (
          <span key={h} className="text-[0.6rem] px-2.5 py-1 rounded-full border border-red-500/15 bg-red-500/5 text-red-400/80">{h}</span>
        ))}
      </div>
    </Tilt3DCard>
  );
}

function StepCard({ num, title, desc, icon }: { num: string; title: string; desc: string; icon: React.ReactNode }) {
  return (
    <Tilt3DCard className="relative p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/30 hover:border-red-500/30 hover:shadow-[0_0_20px_rgba(239,68,68,0.05)] transition-all duration-300">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
          {icon}
        </div>
        <span className="text-2xl font-bold text-red-500/15 font-display">{num}</span>
      </div>
      <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-400 leading-relaxed">{desc}</p>
    </Tilt3DCard>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Tilt3DCard className="group relative p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:border-red-500/30 hover:bg-zinc-900/70 hover:shadow-[0_0_20px_rgba(239,68,68,0.05)] transition-all duration-300">
      <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 mb-3.5 group-hover:bg-red-500/15 transition-colors">
        {icon}
      </div>
      <h3 className="text-[0.9rem] font-semibold text-white mb-1.5">{title}</h3>
      <p className="text-[0.8rem] text-zinc-400 leading-relaxed">{desc}</p>
    </Tilt3DCard>
  );
}

function PersonaCard({ emoji, title, desc, tags }: { emoji: string; title: string; desc: string; tags: string[] }) {
  return (
    <Tilt3DCard className="p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/30 hover:border-red-500/30 hover:shadow-[0_0_20px_rgba(239,68,68,0.05)] transition-all duration-300">
      <p className="text-3xl mb-3">{emoji}</p>
      <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-400 leading-relaxed mb-4">{desc}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="text-[0.65rem] px-2.5 py-1 rounded-full border border-zinc-800 bg-zinc-800/40 text-zinc-400">{t}</span>
        ))}
      </div>
    </Tilt3DCard>
  );
}

function ValueCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Tilt3DCard className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/30 text-center hover:border-red-500/30 hover:shadow-[0_0_20px_rgba(239,68,68,0.05)] transition-all duration-300">
      <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-3">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-white mb-1.5">{title}</h3>
      <p className="text-[0.78rem] text-zinc-500 leading-relaxed">{desc}</p>
    </Tilt3DCard>
  );
}

function ComparisonLine({ icon, text, muted }: { icon: React.ReactNode; text: string; muted?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {icon}
      <span className={`text-sm ${muted ? "text-zinc-500" : "text-zinc-300"}`}>{text}</span>
    </div>
  );
}

function OceanStat({ val, label }: { val: string; label: string }) {
  return (
    <div className="p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.02] text-center">
      <p className="text-lg font-bold text-emerald-400 font-display">{val}</p>
      <p className="text-[0.65rem] text-zinc-500 uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}
