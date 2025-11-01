"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlugZap, DollarSign } from "lucide-react";
import Link from "next/link";
export default function ContentCards() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 md:px-6 space-y-8 md:space-y-10">
      {/* Consume */}
      <Card className="overflow-hidden border border-[rgba(255,255,255,0.12)] rounded-2xl py-0 h-full">
        <CardContent className="p-0">
          <div className="grid md:grid-cols-3">
            {/* LEFT: */}
            <div className="p-6 sm:p-8 flex gap-6 bg-[#15150B] md:col-span-2 border-r border-r-[rgba(255,255,255,0.12)]">

              <div className="pt-3">
                <span className="text-xl xl:text-[48px] font-normal sm:text-2xl text-[#F5F56B] font-instrument-serif">01</span>
              </div>

              <div>
                <Header
                  title="Connect & Start Using"
                  titleClassName="text-[#F5F56B]"
                  description="Link your wallet or account once and access any MCP-powered service. No subscriptions, no dashboards — just pay as you go via x402."
                />
                <figure className="w-full xl:w-[513px]">
                  <Image src={"/how-it-work/Frame 47.png"} alt="background" width={0} height={0} sizes="100vw" className="w-full h-full" />
                </figure>
              </div>

            </div>

            {/* RIGHT: */}
            <div className="px-4 py-8 xl:py-16 xl:px-12 bg-black">
              <div className="flex flex-col justify-between w-full h-full">
                <Steps
                  items={[
                    { n: 1, title: "Sign in with GitHub or your preferred wallet", detail: "" },
                    {
                      n: 2,
                      title: "Fund once, use anywhere",
                      detail: "",
                    },
                    {
                      n: 3,
                      title: "Interact with any MCP tool and settle instantly per call",
                      detail: "",
                    },
                  ]}
                />

                <div className="text-right mt-8 xl:mt-0">
                  <Button
                    asChild
                    variant={null}
                    className="cursor-pointer bg-white py-2 px-6 ml-auto text-[#2B2B13] text-lg font-bold font-darker-grotesque"
                  >
                    <Link href="/servers">View All Servers</Link>
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monetize */}
      <Card className="overflow-hidden border border-[rgba(255,255,255,0.12)] rounded-2xl py-0 h-full">
        <CardContent className="p-0">
          <div className="grid md:grid-cols-3">
            {/* LEFT: */}
            <div className="p-6 sm:p-8 flex gap-6 bg-black md:col-span-2 border-r border-r-[rgba(255,255,255,0.12)]">

              <div className="pt-3">
                <span className="text-xl xl:text-[48px] font-normal sm:text-2xl text-white font-instrument-serif">02</span>
              </div>

              <div>
                <Header
                  title="Turn usage into income"
                  titleClassName="text-white"
                  description="Set on-chain pricing for your MCP or API routes. Each call settles automatically through the x402 flow — no intermediaries, no subscriptions."
                  descriptionClassName="text-[rgba(255,255,255,0.48)]"
                />
                <figure className="w-full">
                  <Image src={"/how-it-work/Frame 48.png"} alt="background" width={0} height={0} sizes="100vw" className="w-full h-full object-cover" />
                </figure>
              </div>

            </div>

            {/* RIGHT: */}
            <div className="px-4 py-8 xl:py-16 xl:px-12 bg-[#020D1F]">
              <div className="flex flex-col justify-between w-full h-full">
                <Steps
                  items={[
                    { n: 1, title: "Register your server or endpoint with LATCH", detail: "" },
                    {
                      n: 2,
                      title: "Define per-call or per-route pricing",
                      detail: "",
                    },
                    {
                      n: 3,
                      title: "Let x402 handle payments and proofs automatically",
                      detail: "",
                    },
                  ]}
                  strokeColor="#87A6FF"
                  titleClassName="text-[#4C81DB]"
                />

                <div className="text-right mt-8 xl:mt-0">
                  <Button
                    asChild
                    variant={null}
                    className="cursor-pointer bg-white py-2 px-6 ml-auto text-[#2B2B13] text-lg font-bold font-darker-grotesque"
                  >
                    <Link href="/register">Monetize Server</Link>
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function Header({
  icon,
  title,
  description,
  descriptionClassName,
  titleClassName,

}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  descriptionClassName?: string;
  titleClassName?: string;
}) {
  return (
    <div className="mb-4 sm:mb-6 font-darker-grotesque">
      <div className="flex items-center gap-3">
        <h3 className={cn("text-xl xl:text-[48px] font-bold sm:text-2xl", titleClassName)}>
          {title}
        </h3>
      </div>
      <p
        className={cn(
          "mt-2 text-sm sm:text-[16px] 2xl:text-2xl text-[#87873B] font-medium",
          descriptionClassName
        )}
      >
        {description}
      </p>
    </div>
  );
}

function Steps({
  items,
  className,
  strokeColor = "white",
  titleClassName = "text-[rgba(255,255,255,0.80)]"
}: {
  items: { n: number; title: string; detail?: string }[];
  className?: string;
  strokeColor?: string;
  titleClassName?: string;
}) {
  return (
    <ol className={cn("mt-4 space-y-4 sm:space-y-5", className)}>
      {items.map((s) => (
        <li key={s.n} className="flex items-center gap-4 font-darker-grotesque font-semibold">
          <figure>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M22 7H10C7.79086 7 6 8.79086 6 11V25C6 27.2091 7.79086 29 10 29H22C24.2091 29 26 27.2091 26 25V11C26 8.79086 24.2091 7 22 7Z" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 7V4C10 3.73478 10.1054 3.48043 10.2929 3.29289C10.4804 3.10536 10.7348 3 11 3H21C21.2652 3 21.5196 3.10536 21.7071 3.29289C21.8946 3.48043 22 3.73478 22 4V7" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 7V3" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18 7V3" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 22H17C17.5304 22 18.0391 21.7893 18.4142 21.4142C18.7893 21.0391 19 20.5304 19 20C19 19.4696 18.7893 18.9609 18.4142 18.5858C18.0391 18.2107 17.5304 18 17 18H15C14.4696 18 13.9609 17.7893 13.5858 17.4142C13.2107 17.0391 13 16.5304 13 16C13 15.4696 13.2107 14.9609 13.5858 14.5858C13.9609 14.2107 14.4696 14 15 14H18" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 14V12" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 24V22" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </figure>
          <div className={`text-sm xl:text-xl ${titleClassName}`}>
            <span className="font-semibold">{s.title}</span>{" "}
          </div>
        </li>
      ))}
    </ol>
  );
}

function ImagePanel({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={cn("relative aspect-[4/3] md:aspect-auto md:h-full", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover"
      />
    </div>
  );
}
