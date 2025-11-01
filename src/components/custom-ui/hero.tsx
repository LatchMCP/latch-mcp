"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { HeroTab } from "./hero-tab";
import { cn } from "@/lib/utils";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { easeOut } from "motion";
import LogoStack from "@/components/custom-ui/logo-stack";
import Link from "next/link";

type Copy = {
  id: "devs" | "hosts" | "agents";
  label: string;
  subheading: string;
  cta: string;
  href?: string;
};

const COPY: Copy[] = [
  {
    id: "devs",
    label: "AI DEVELOPERS",
    subheading:
      "Consume MCPs seamlessly with micropayments, no subscription required.",
    cta: "Browse Servers",
    href: "/servers",
  },
  {
    id: "hosts",
    label: "MCP HOSTS",
    subheading:
      "Register your servers and accept micropayments, with custom prices for each tool call.",
    cta: "Monetize Server",
    href: "/monetize",
  },
  {
    id: "agents",
    label: "AI AGENTS",
    subheading:
      "Prepare your infrastructure for Agent to Agents payments, enabling microtransactions.",
    cta: "Explorer",
    href: "/explorer",
  },
];

const tabList = [
  {
    id: 0,
    label: "Launch App",
    icon: "/hero/monetize.svg",
    link: "/register"
  },
  {
    id: 1,
    label: "Docs",
    icon: "/hero/document.svg",
    link: "#"
  },
  {
    id: 2,
    label: "Github",
    icon: "/hero/github.svg",
    link: "#"
  }
]

export default function Hero({
  className,
  durationMs = 10000,
}: {
  className?: string;
  /** milliseconds per tab for auto-advance + underline fill */
  durationMs?: number;
}) {
  const [active, setActive] = React.useState<Copy["id"]>("devs");
  const current = COPY.find((c) => c.id === active) ?? COPY[0];
  const prefersReduced = useReducedMotion();

  const fadeUp: Variants = React.useMemo(
    () => ({
      hidden: { opacity: 0, y: prefersReduced ? 0 : 8 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: prefersReduced ? 0 : 0.4, ease: easeOut },
      },
    }),
    [prefersReduced]
  );

  return (
    <section>
      {/* Image + Overlay Title */}
      <div className="relative mx-auto w-full h-[780px] overflow-hidden">
        <Image src={"/hero/background.png"} alt="Hero Background" fill className="object-cover" priority />
        <div className="absolute inset-0 flex items-center">
          <div className="w-full xl:w-[732px] mx-auto">
            <motion.h3
              initial={{ opacity: 0, filter: "blur(16px) saturate(0.9)" }}
              animate={{ opacity: 1, filter: "blur(0px) saturate(1)" }}
              transition={{ duration: prefersReduced ? 0 : 0.8, ease: easeOut }}
              className="font-instrument-serif text-[64px] 2xl:text-[112px] text-white text-center">Payments for MCPs</motion.h3>

            <motion.div
              className="text-white/80 text-base 2xl:text-lg font-semibold uppercase font-darker-grotesque text-center"
              initial={{ opacity: 0, }}
              animate={{ opacity: 1 }}
              transition={{ duration: prefersReduced ? 0 : 0.8, ease: easeOut, delay: 0.3 }}
            >
              <p>LATCH connects MCP and x402 into one open, programmable layer — bringing on-chain micropayments to any tool, model, or API without changing your stack.</p>
              {/* <p>Add micropayments to any server without rewriting your stack.</p> */}
            </motion.div>

            <motion.div className="flex flex-col lg:flex-row items-center lg:justify-between"
              initial={{ opacity: 0, }}
              animate={{ opacity: 1 }}
              transition={{ duration: prefersReduced ? 0 : 0.8, ease: easeOut, delay: 0.3 }}>
              {tabList.map((tab, index) => (
                <Link key={index} href={tab.link}>
                  <div className={cn(
                    "flex items-center w-[200px] justify-between mx-4 mt-10 cursor-pointer px-4 py-3 border border-[rgba(245,245,107,0.16)] bg-[rgba(245,245,107,0.10)] backdrop-blur-[6px]"
                  )}
                  >
                    <div className="w-4 h-4">
                      <Image src={tab.icon} alt={tab.label} width={0} height={0} sizes="100vw" className="w-full h-full" />
                    </div>
                    <span className="text-sm font-semibold uppercase font-darker-grotesque text-[#FCFCD1] ">{tab.label}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M10.7692 9.03061V1.38477H3.13261V2.714H8.51415L1.53754 9.68323L2.47077 10.6155L9.44554 3.6463V9.03061H10.7692Z" fill="#FCFCD1" />
                    </svg>
                  </div>
                </Link>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
