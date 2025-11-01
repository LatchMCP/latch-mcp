"use client";

import BuildingGrid from "@/components/custom-ui/building-grid";
import ContentCards from "@/components/custom-ui/content-cards";
import Footer from "@/components/custom-ui/footer";
import Hero from "@/components/custom-ui/hero";
import ServersGrid from "@/components/custom-ui/servers-grid";
import { useTheme } from "@/components/providers/theme-context";
import { Button } from "@/components/ui/button";
import { urlUtils } from "@/lib/client/utils";
import { ArrowRight, Rocket, TrendingUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface APITool {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  isMonetized: boolean;
  payment: Record<string, unknown> | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties: Record<string, MCPInputPropertySchema>;
  };
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
}

interface MCPInputPropertySchema {
  type: string;
  description?: string;
  [key: string]: unknown;
}

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
  tools: MCPTool[];
  icon: React.ReactNode;
  verified?: boolean;
}

interface APIServer {
  id: string;
  serverId: string;
  name: string;
  receiverAddress: string;
  description: string;
  metadata?: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
  tools: APITool[];
}

const transformServerData = (apiServer: APIServer): MCPServer => ({
  id: apiServer.serverId,
  name: apiServer.name || "Unknown Server",
  description: apiServer.description || "No description available",
  url: apiServer.receiverAddress,
  category:
    ((apiServer.metadata as Record<string, unknown>)?.category as string) ||
    "General",
  icon: <TrendingUp className="h-6 w-6" />,
  verified: apiServer.status === "active",
  tools: apiServer.tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type:
        ((tool.inputSchema as Record<string, unknown>)?.type as string) ||
        "object",
      properties:
        ((tool.inputSchema as Record<string, unknown>)?.properties as Record<
          string,
          MCPInputPropertySchema
        >) || {},
    },
    annotations: {
      title: tool.name,
      readOnlyHint: !tool.isMonetized,
      destructiveHint: false,
    },
  })),
});

export default function MCPBrowser() {
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isDark } = useTheme();

  const getFriendlyErrorMessage = (error: string) => {
    if (error.includes("404")) {
      return {
        title: "Welcome to latchmcp!",
        message:
          "We're setting up the server directory. Be the first to register your MCP server and start earning!",
        actionText: "Register your server",
        actionHref: "/register",
        showRetry: false,
      };
    }
    if (
      error.includes("500") ||
      error.includes("502") ||
      error.includes("503")
    ) {
      return {
        title: "Server maintenance",
        message:
          "We're performing some quick maintenance. Please try again in a few moments.",
        actionText: "Try again",
        actionHref: null,
        showRetry: true,
      };
    }
    if (error.includes("Network") || error.includes("fetch")) {
      return {
        title: "Connection issue",
        message: "Please check your internet connection and try again.",
        actionText: "Try again",
        actionHref: null,
        showRetry: true,
      };
    }
    return {
      title: "Something went wrong",
      message:
        "We're working to fix this issue. In the meantime, you can register your MCP server.",
      actionText: "Register your server",
      actionHref: "/register",
      showRetry: true,
    };
  };

  useEffect(() => {
    const fetchServers = async () => {
      try {
        setLoading(true);
        setError(null);

        const serversResponse = await fetch(
          urlUtils.getApiUrl("/servers?limit=6&type=trending")
        );
        if (!serversResponse.ok) {
          throw new Error(`Failed to fetch servers: ${serversResponse.status}`);
        }

        const servers: APIServer[] = await serversResponse.json();
        setMcpServers(servers.map(transformServerData));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch servers"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchServers();
  }, []);

  if (error) {
    const errorInfo = getFriendlyErrorMessage(error);
    return (
      <div className="min-h-screen bg-background">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-16 relative">
            <div className="mb-[100px]"></div>
            <h1
              className={`text-5xl font-extrabold tracking-tight mb-6 animate-fade-in-up ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {errorInfo.title}
            </h1>
            <p
              className={`text-lg max-w-3xl mx-auto leading-relaxed animate-fade-in-up animation-delay-300 ${
                isDark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              {errorInfo.message}
            </p>
            <div className="flex items-center justify-center gap-6 mt-8 animate-fade-in-up animation-delay-500">
              {errorInfo.actionHref && (
                <Link href={errorInfo.actionHref}>
                  <Button
                    size="lg"
                    className="bg-[#0052FF] hover:bg-[#0052FF]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Rocket className="h-5 w-5 mr-2" />
                    {errorInfo.actionText}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              )}
              {errorInfo.showRetry && (
                <Button
                  onClick={() => window.location.reload()}
                  size="lg"
                  variant="outline"
                  className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  {errorInfo.actionHref ? "Try Again" : errorInfo.actionText}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="">
        <section>
          <Hero />
        </section>

        {/* <section className="mb-40">
          <HeroStats />
        </section> */}

        <section className="bg-[#080808] xl:py-40">
          {/* Top */}
          <div className="max-w-7xl px-4 md:px-6 mx-auto flex flex-col gap-6 xl:flex-row xl:justify-between py-16">
            {/* Top - left */}
            <div className="xl:h-[600px] xl:w-[480px]">
              <div>
                <div className="p-3 border border-[rgba(245,245,107,0.16)] bg-[rgba(245,245,107,0.10)] backdrop-blur-[6px] w-fit flex items-center gap-3">
                  <figure className="w-4 h-4 min-w-4">
                    <Image
                      src={"/hero/monetize.svg"}
                      alt={"icon"}
                      width={0}
                      height={0}
                      sizes="100vw"
                      className="w-full h-full"
                    />
                  </figure>
                  <span className="text-[#FCFCD1] text-sm uppercase font-semibold font-darker-grotesque">
                    SDK TOOLS
                  </span>
                </div>
                <h2 className="text-3xl xl:text-[64px] font-normal font-instrument-serif mb-16 mt-6 text-white">
                  Develop with precision
                </h2>
              </div>
              <div className="font-darker-grotesque">
                <p className="text-[#F5F56B] text-base xl:text-2xl font-semibold mb-6">
                  The LATCH SDK gives you everything to build payment-aware
                  agents and APIs — from x402 integration to analytics, all in a
                  few lines of code.
                </p>
                <ul className="text-[rgba(255,255,255,0.64)] text-xl font-medium">
                  <li className="flex items-center gap-4">
                    <figure>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M3.33333 9.99996C3.33333 6.31806 6.3181 3.33329 10 3.33329C13.6819 3.33329 16.6667 6.31806 16.6667 9.99996C16.6667 13.6819 13.6819 16.6666 10 16.6666C6.3181 16.6666 3.33333 13.6819 3.33333 9.99996ZM10 1.66663C5.39762 1.66663 1.66666 5.39758 1.66666 9.99996C1.66666 14.6023 5.39762 18.3333 10 18.3333C14.6023 18.3333 18.3333 14.6023 18.3333 9.99996C18.3333 5.39758 14.6023 1.66663 10 1.66663ZM14.5476 7.88088L13.3691 6.70237L9.16666 10.9048L6.83926 8.57738L5.66074 9.75588L9.16666 13.2618L14.5476 7.88088Z"
                          fill="#F5F56B"
                        />
                      </svg>
                    </figure>
                    <span>Supports EVM and Solana</span>
                  </li>
                  <li className="flex items-center gap-4">
                    <figure>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M3.33333 9.99996C3.33333 6.31806 6.3181 3.33329 10 3.33329C13.6819 3.33329 16.6667 6.31806 16.6667 9.99996C16.6667 13.6819 13.6819 16.6666 10 16.6666C6.3181 16.6666 3.33333 13.6819 3.33333 9.99996ZM10 1.66663C5.39762 1.66663 1.66666 5.39758 1.66666 9.99996C1.66666 14.6023 5.39762 18.3333 10 18.3333C14.6023 18.3333 18.3333 14.6023 18.3333 9.99996C18.3333 5.39758 14.6023 1.66663 10 1.66663ZM14.5476 7.88088L13.3691 6.70237L9.16666 10.9048L6.83926 8.57738L5.66074 9.75588L9.16666 13.2618L14.5476 7.88088Z"
                          fill="#F5F56B"
                        />
                      </svg>
                    </figure>
                    <span>Extendable with hooks and custom logic</span>
                  </li>
                  <li className="flex items-center gap-4">
                    <figure>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M3.33333 9.99996C3.33333 6.31806 6.3181 3.33329 10 3.33329C13.6819 3.33329 16.6667 6.31806 16.6667 9.99996C16.6667 13.6819 13.6819 16.6666 10 16.6666C6.3181 16.6666 3.33333 13.6819 3.33333 9.99996ZM10 1.66663C5.39762 1.66663 1.66666 5.39758 1.66666 9.99996C1.66666 14.6023 5.39762 18.3333 10 18.3333C14.6023 18.3333 18.3333 14.6023 18.3333 9.99996C18.3333 5.39758 14.6023 1.66663 10 1.66663ZM14.5476 7.88088L13.3691 6.70237L9.16666 10.9048L6.83926 8.57738L5.66074 9.75588L9.16666 13.2618L14.5476 7.88088Z"
                          fill="#F5F56B"
                        />
                      </svg>
                    </figure>
                    <span>Deploy x402 flows in minutes</span>
                  </li>
                  <li className="flex items-center gap-4">
                    <figure>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M3.33333 9.99996C3.33333 6.31806 6.3181 3.33329 10 3.33329C13.6819 3.33329 16.6667 6.31806 16.6667 9.99996C16.6667 13.6819 13.6819 16.6666 10 16.6666C6.3181 16.6666 3.33333 13.6819 3.33333 9.99996ZM10 1.66663C5.39762 1.66663 1.66666 5.39758 1.66666 9.99996C1.66666 14.6023 5.39762 18.3333 10 18.3333C14.6023 18.3333 18.3333 14.6023 18.3333 9.99996C18.3333 5.39758 14.6023 1.66663 10 1.66663ZM14.5476 7.88088L13.3691 6.70237L9.16666 10.9048L6.83926 8.57738L5.66074 9.75588L9.16666 13.2618L14.5476 7.88088Z"
                          fill="#F5F56B"
                        />
                      </svg>
                    </figure>
                    <span>Fully open and production-ready</span>
                  </li>
                </ul>
              </div>
            </div>
            {/* Top - right */}
            <div className="w-full xl:w-[600px]">
              <Image
                src={"/home/code.png"}
                alt="code"
                width={0}
                height={0}
                sizes="100vw"
                className="w-full h-full"
              />
            </div>
          </div>
          {/* Bottom */}
          <div className="py-16">
            <BuildingGrid />
          </div>
        </section>

        <section
          className="py-[100px]"
          style={{
            background: "linear-gradient(315deg, #E8F5FF 16.8%, #FFFFEC 83.2%)",
          }}
        >
          <div className="max-w-6xl px-4 md:px-6 mx-auto">
            <h2 className="text-[40px] xl:text-[64px] font-medium font-instrument-serif text-center mb-10 xl:mb-16">
              Featured Servers
            </h2>
          </div>
          <ServersGrid servers={mcpServers} loading={loading} />
          <div className="text-center mt-10">
            <div className="inline-flex gap-4">
              <Link href="/servers">
                <Button
                  variant="ghostCustom"
                  className="h-10 py-3 px-6 font-darker-grotesque font-bold text-lg bg-[#080805] text-white hover:bg-[#0E2854] capitalize"
                >
                  Browse Servers
                </Button>
              </Link>
              {/* <Link href="/explorer">
                <Button variant="ghostCustomSecondary" className="h-10 py-3 px-6 font-darker-grotesque font-bold text-lg bg-[#CFD6D8] text-[#080805] hover:bg-[#0E2854] hover:text-white capitalize">Explorer</Button>
              </Link> */}
            </div>
          </div>
        </section>

        <section className="bg-[#080808] py-20 xl:py-40">
          <div className="max-w-6xl px-4 md:px-6 mx-auto">
            <div className="p-3 border border-[rgba(245,245,107,0.16)] bg-[rgba(245,245,107,0.10)] backdrop-blur-[6px] w-fit flex items-center gap-3">
              <figure className="w-4 h-4 min-w-4">
                <Image
                  src={"/hero/monetize.svg"}
                  alt={"icon"}
                  width={0}
                  height={0}
                  sizes="100vw"
                  className="w-full h-full"
                />
              </figure>
              <span className="text-[#FCFCD1] text-sm uppercase font-semibold font-darker-grotesque">
                Features
              </span>
            </div>
            <h2 className="text-[40px] xl:text-[64px] font-normal font-instrument-serif mb-16 mt-6 text-white">
              How it works
            </h2>
          </div>
          <ContentCards />
        </section>

        <section>
          <div className="relative mx-auto w-full h-[720px] overflow-hidden">
            <Image
              src={"/home/bg-meet.png"}
              alt="Meet Background"
              fill
              priority
            />
            <div className="absolute inset-0 z-2 flex items-center justify-center">
              <div className="w-full mx-auto">
                <figure className="w-[68px] h-[68px] mx-auto">
                  <Image
                    src={"/home/meet-logo.svg"}
                    alt="Meet Background"
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="w-full h-full"
                  />
                </figure>
                <div>
                  <h3 className="text-xl text-center xl:text-[64px] font-normal font-instrument-serif text-white">
                    Where compute meets commerce.
                  </h3>
                  <p className="text-xl text-center xl:text-[48px] font-semibold font-darker-grotesque text-white">
                    The open payment layer for MCPs, x402 apps,and intelligent
                    systems.
                  </p>
                </div>
                <p className="text-lg text-center font-semibold uppercase font-darker-grotesque text-[rgba(255,255,255,0.64)] mt-8 mb-12">
                  Instant, verifiable, machine-to-machine payments.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
