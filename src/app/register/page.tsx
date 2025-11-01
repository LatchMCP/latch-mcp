"use client";

import type React from "react";
import { Suspense } from "react";

import { AccountModal } from "@/components/custom-ui/account-modal";
import { useAccountModal } from "@/components/hooks/use-account-modal";
import { useTheme } from "@/components/providers/theme-context";
import {
  usePrimaryWallet,
  useUser,
  useUserWallets,
} from "@/components/providers/user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/client/auth";
import { api } from "@/lib/client/utils";
import { getTokenInfo, toBaseUnits } from "@/lib/commons";
import { getNetworkConfig, type UnifiedNetwork } from "@/lib/commons/networks";
import { type Network } from "@/types/blockchain";
import { type RegisterMCPTool } from "@/types/mcp";
import { type UserWallet } from "@/types/wallet";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle,
  ChevronDown,
  Copy,
  Globe,
  Info,
  Loader2,
  Lock,
  RefreshCw,
  Server,
  User,
  Wallet,
  Zap,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useConnect } from "wagmi";

import { getNetworkByChainId } from "@/lib/commons";
import { useChainId } from "wagmi";
import { PricingEntry } from "@/types";
import Image from "next/image";

// Helper function to format wallet address for display
const formatWalletAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Helper function to extract a display name from a URL
const generateDisplayNameFromUrl = (urlStr: string): string => {
  try {
    const url = new URL(urlStr);
    let path = url.pathname;
    if (path.startsWith("/")) path = path.substring(1);
    if (path.endsWith("/")) path = path.substring(0, path.length - 1);

    // Replace common repository hosting prefixes or suffixes if any
    path = path
      .replace(/^github\.com\//i, "")
      .replace(/^gitlab\.com\//i, "")
      .replace(/^bitbucket\.org\//i, "");
    path = path.replace(/\.git$/i, "");

    if (!path && url.hostname) {
      // If path is empty, use hostname
      path = url.hostname;
    }

    return (
      path
        .split(/[\/\-_]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ") || "Unknown Source"
    );
  } catch {
    return "Unknown Source";
  }
};

// Component that uses searchParams - needs to be wrapped in Suspense
function RegisterPageContent() {
  const { isDark } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: isSessionPending } = useSession();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    url: "",
    headers: "",
  });

  const [tools, setTools] = useState<RegisterMCPTool[]>([]);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [toolsError, setToolsError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showAuthHeaders, setShowAuthHeaders] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<Network>("ethereum");
  const [selectedPaymentToken, setSelectedPaymentToken] = useState<string>("");
  const [showNetworkSelection, setShowNetworkSelection] = useState(false);

  const { error: connectError } = useConnect();
  const chainId = useChainId();

  // Use UserProvider for wallet data
  const { hasWallets } = useUser();
  const primaryWallet = usePrimaryWallet();
  const userWallets = useUserWallets();

  // State for selected wallet (defaults to primary wallet)
  const [selectedWallet, setSelectedWallet] = useState<UserWallet | null>(null);
  const [showWalletSelection, setShowWalletSelection] = useState(false);

  // Account modal for wallet management
  const {
    isOpen: isAccountModalOpen,
    openModal: openAccountModal,
    closeModal: closeAccountModal,
  } = useAccountModal();

  // Set selected wallet to primary when primary wallet changes
  useEffect(() => {
    if (primaryWallet && !selectedWallet) {
      setSelectedWallet(primaryWallet);
    }
  }, [primaryWallet, selectedWallet]);

  // Autopopulate URL from search parameters
  useEffect(() => {
    const urlParam = searchParams.get("url");
    if (urlParam && !formData.url) {
      setFormData((prev) => ({ ...prev, url: urlParam }));
    }
  }, [searchParams, formData.url]);

  // Require account setup - use selected wallet or fallback to primary
  const activeWallet = selectedWallet || primaryWallet;
  const walletAddress = activeWallet?.walletAddress;
  const hasValidWallet = session?.user && hasWallets();

  // Get current network and blockchain info
  const currentNetwork = chainId ? getNetworkByChainId(chainId) : null;
  const currentBlockchain = currentNetwork
    ? currentNetwork.startsWith("sei")
      ? "sei"
      : "ethereum"
    : "ethereum";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasValidWallet || !walletAddress) {
      setSubmitError("Please sign in and connect a wallet to continue");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      // Parse authentication headers if provided
      let authHeaders: Record<string, unknown> | undefined;
      if (showAuthHeaders && formData.headers.trim()) {
        authHeaders = {};
        const lines = formData.headers.split("\n");
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine && trimmedLine.includes(":")) {
            const [key, ...valueParts] = trimmedLine.split(":");
            const value = valueParts.join(":").trim();
            if (key && value) {
              authHeaders[key.trim()] = value;
            }
          }
        }
      }

      // Get the selected payment token address - use predefined mapping for simplicity
      const defaultPaymentTokens: Partial<Record<Network, string>> = {
        "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC on Base Sepolia
        "sei-testnet": "0x4fCF1784B31630811181f670Aea7A7bEF803eaED", // USDC on Sei Testnet
        base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
        // 'polygon': '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359', // USDC on Polygon
      };

      const paymentTokenAddress =
        selectedPaymentToken ||
        defaultPaymentTokens[selectedNetwork] ||
        "0x0000000000000000000000000000000000000000"; // fallback to native token

      // Get token info for decimal conversion
      const tokenInfo = getTokenInfo(paymentTokenAddress, selectedNetwork);
      const tokenDecimals = tokenInfo?.decimals || 18; // Default to 18 for native tokens

      // Prepare tools data with payment information - convert prices to base units as strings
      const toolsWithPayment = tools
        .filter((tool) => tool.price && parseFloat(tool.price) > 0)
        .map((tool) => ({
          name: tool.name,
          pricing: [
            {
              maxAmountRequiredRaw: toBaseUnits(
                tool.price || "0",
                tokenDecimals
              ), // Convert to base units as string
              assetAddress: paymentTokenAddress,
              network: selectedNetwork,
              active: true,
              tokenDecimals: tokenDecimals,
            },
          ] as PricingEntry[],
        }));

      // Prepare API request payload with enhanced wallet information
      const payload = {
        mcpOrigin: formData.url,
        receiverAddress: walletAddress,
        name: formData.name,
        description: formData.description,
        requireAuth:
          showAuthHeaders && authHeaders && Object.keys(authHeaders).length > 0,
        ...(authHeaders &&
          Object.keys(authHeaders).length > 0 && { authHeaders }),
        ...(toolsWithPayment.length > 0 && { tools: toolsWithPayment }),
        // Enhanced wallet information for multi-wallet support
        walletInfo: {
          blockchain: currentBlockchain,
          network: currentNetwork || selectedNetwork,
          walletType: "external" as const,
          primaryWallet: true,
        },
        metadata: {
          registeredFromUI: true,
          timestamp: new Date().toISOString(),
          toolsCount: tools.length,
          monetizedToolsCount: toolsWithPayment.length,
          registrationNetwork: currentNetwork || selectedNetwork,
          registrationBlockchain: currentBlockchain,
        },
      };

      console.log("Submitting server registration:", payload);

      // Make API call to register the server
      const result = await api.registerServer(payload);
      console.log("Server registration successful:", result);

      // Extract server ID from the result and redirect to success page
      const serverId = result?.serverId;
      if (serverId) {
        router.push(`/servers/${serverId}`);
      } else {
        throw new Error("Server ID not found in registration result");
      }
    } catch (error) {
      console.error("Server registration failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      setSubmitError(`Registration failed: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const fetchMCPTools = useCallback(
    async (url: string) => {
      if (!url.trim()) {
        setTools([]);
        setToolsError("");
        return;
      }

      setIsLoadingTools(true);
      setToolsError("");

      try {
        const fetchedTools = (await api.getMcpTools(url)) as RegisterMCPTool[];

        if (!Array.isArray(fetchedTools)) {
          console.error("Fetched data is not an array:", fetchedTools);
          throw new Error("Invalid data format received from server.");
        }

        // Set default price for all tools
        const toolsWithDefaultPrice = fetchedTools.map((tool) => ({
          ...tool,
          price: tool.price || "0.01",
        }));
        setTools(toolsWithDefaultPrice);

        // Auto-fill server name and description if not already set by user
        // and if tools were successfully fetched.
        if (fetchedTools.length > 0) {
          const displayName = generateDisplayNameFromUrl(url);

          if (!formData.name) {
            handleInputChange("name", `${displayName} MCP Server`);
          }
          if (!formData.description) {
            const toolNames = fetchedTools
              .map((t) => t.name)
              .slice(0, 3)
              .join(", ");
            const toolCount = fetchedTools.length;
            let description = `MCP Server for ${displayName}, providing ${toolCount} tool${
              toolCount > 1 ? "s" : ""
            }.`;
            if (toolCount > 0) {
              description += ` Includes: ${toolNames}${
                toolCount > 3 ? " and more" : ""
              }.`;
            }
            handleInputChange("description", description);
          }
        }
      } catch (error) {
        console.error("Failed to fetch MCP tools:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setToolsError(
          `Failed to fetch tools: ${errorMessage}. Please check the URL and try again.`
        );
        setTools([]);
      } finally {
        setIsLoadingTools(false);
      }
    },
    [formData.name, formData.description]
  );

  const updateToolPrice = (toolName: string, price: string) => {
    setTools(
      tools.map((tool) => (tool.name === toolName ? { ...tool, price } : tool))
    );
  };

  const handleNetworkChange = async (network: Network) => {
    setSelectedNetwork(network);
    setSelectedPaymentToken(""); // Reset payment token selection
  };

  // Debounced URL checking
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.url) {
        fetchMCPTools(formData.url);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData.url, fetchMCPTools]);

  // Update toolsError display if Wagmi connectError exists
  useEffect(() => {
    if (connectError) {
      setToolsError(`Wallet Connection Error: ${connectError.message}`);
    }
  }, [connectError]);

  const isFormValid =
    formData.name &&
    formData.description &&
    formData.url &&
    hasValidWallet &&
    tools.length > 0;

  return (
    <div
      className={`min-h-screen pt-[100px] relative bg-[#080808] lg:bg-transparent`}
    >
      <Image
        src={"/register/background.png"}
        alt={"background"}
        fill
        className="hidden lg:block"
      />
      <Image
        src={"/register/background-mobile.png"}
        alt={"background"}
        fill
        className="block lg:hidden"
      />

      <div className="relative z-2">
        {/* Header Section */}
        <div className={``}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="mb-6">
                  <h1
                    className={`text-[32px] sm:text-3xl xl:text-[48px] font-normal font-instrument-serif text-white `}
                  >
                    Register MCP Server
                  </h1>
                  <p
                    className={`text-lg sm:text-2xl font-medium text-[rgba(255,255,255,0.64)] font-darker-grotesque`}
                  >
                    Connect your wallet and configure your MCP server for
                    monetization
                  </p>
                </div>

                {/* Getting Started Guide */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant={null}
                      size="sm"
                      className="py-3  px-6 h-12 border border-[rgba(245,245,107,0.16)] bg-[rgba(245,245,107,0.10)] backdrop-blur-[6px] w-fit flex items-center gap-3"
                    >
                      <figure className="w-6 h-6 min-w-6">
                        <Image
                          src={"/register/book.svg"}
                          alt={"icon"}
                          width={0}
                          height={0}
                          sizes="100vw"
                          className="w-full h-full"
                        />
                      </figure>
                      <span className="text-[#FCFCD1] text-base uppercase font-semibold font-darker-grotesque">
                        getting started{" "}
                      </span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent
                    className={`max-w-4xl max-h-[90vh] overflow-y-auto`}
                  >
                    <div className="bg-[#15150B]">
                      <DialogHeader className="py-6 px-8">
                        <h3
                          className={`text-[32px] text-white font-instrument-serif font-normal`}
                        >
                          Getting Started Guide
                        </h3>
                        <p
                          className={`text-base mt-2 text-[rgba(255,255,255,0.64)] font-semibold font-darker-grotesque`}
                        >
                          Everything you need to know about MCP server
                          registration
                        </p>
                      </DialogHeader>
                    </div>

                    <div className=" bg-[#0F0F08] p-8">
                      {/* Quick Start Section */}
                      <div className={`rounded-xl`}>
                        <div
                          style={{
                            borderRadius: 8,
                            border: "1px solid rgba(255, 255, 255, 0.04)",
                            background: "rgba(0, 97, 255, 0.12)",
                            backdropFilter: "blur(20px)",
                          }}
                          className="flex gap-4 p-4 items-center"
                        >
                          <div className="w-12 h-12 min-w-12">
                            <Image
                              src={"/register/chatgpt.png"}
                              alt="icon"
                              width={0}
                              height={0}
                              sizes="100vw"
                              className="w-full h-full"
                            />
                          </div>
                          <div>
                            <h5
                              className={`font-semibold text-lg text-[#4C81DB] font-darker-grotesque`}
                            >
                              Need to build an MCP server?
                            </h5>
                            <p
                              className={`text-base text-white font-medium font-darker-grotesque`}
                            >
                              Try{" "}
                              <a
                                href="https://github.com/punkpeye/fastmcp"
                                className={`font-semibold underline decoration-2 underline-offset-2 `}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                fastmcp
                              </a>{" "}
                              to create a compliant server quickly with minimal
                              configuration.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Requirements Section */}
                      <div className={`rounded-xl mt-3 mb-8`}>
                        <div
                          style={{
                            borderRadius: 8,
                            border: "1px solid rgba(255, 255, 255, 0.04)",
                            background: "rgba(245, 245, 107, 0.04)",
                            backdropFilter: "blur(20px)",
                          }}
                          className="flex gap-4 p-4 items-center"
                        >
                          <div className="w-12 h-12 min-w-12">
                            <Image
                              src={"/register/chatgpt1.png"}
                              alt="icon"
                              width={0}
                              height={0}
                              sizes="100vw"
                              className="w-full h-full"
                            />
                          </div>
                          <div>
                            <h5
                              className={`font-semibold text-lg text-[#FAFABB] font-darker-grotesque`}
                            >
                              Technical Requirements
                            </h5>
                            <p
                              className={`text-base text-white font-medium font-darker-grotesque`}
                            >
                              MCP servers must implement the{" "}
                              <a
                                href="https://modelcontextprotocol.io/specification/draft/basic/transports#streamable-http"
                                className={`font-semibold underline decoration-2 underline-offset-2 transition-colors ${
                                  isDark
                                    ? "hover:text-amber-100"
                                    : "hover:text-amber-900"
                                }`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Streamable HTTP transport
                              </a>{" "}
                              as defined in the MCP specification.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* How it Works Section */}
                      <div className={`rounded-[12px] bg-[#2B2B13] px-6 py-4`}>
                        <h4
                          className={`font-bold font-darker-grotesque text-2xl text-[#F5F56B]`}
                        >
                          How it works
                        </h4>

                        <div className="grid">
                          {[
                            "Connect your wallet for payment processing",
                            "Enter your MCP server URL to auto-detect available tools",
                            "Enable authentication if your server requires it",
                            "Set individual pricing for each tool",
                            "Server details are auto-filled from tool inspection",
                            "Your MCP server must use the Streamable HTTP transport",
                          ].map((step, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-4 group rounded-lg transition-colors hover:bg-opacity-50"
                            >
                              <div
                                className={`text-[#F5F56B] font-instrument-serif text-xl font-normal`}
                              >
                                0{index + 1}
                              </div>
                              <p
                                className={`text-[#FAFABB] font-medium text-base font-darker-grotesque`}
                              >
                                {step}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div>
                {/* Wallet Connection */}
                <div
                  className={`p-4 xl:p-6 rounded-[12px] border border-[rgba(255,214,0,0.50)] bg-[#15150B] w-full min-h-52 xl:w-[440px]`}
                >
                  <div className="flex items-center gap-3">
                    <h3
                      className={`font-bold text-2xl text-white font-darker-grotesque`}
                    >
                      Payment Wallet
                    </h3>
                    <Badge
                      variant={null}
                      className="ml-auto bg-[rgba(0,0,0,0.48)] border-none py-2 px-4 rounded-full text-[#FCFCD1] text-base font-bold font-darker-grotesque"
                    >
                      Required
                    </Badge>
                  </div>

                  {isSessionPending ? (
                    <div className="space-y-4">
                      <p
                        className={`text-[rgba(255,255,255,0.64)] text-base font-medium font-darker-grotesque`}
                      >
                        Loading your account...
                      </p>
                      <div className="p-6 rounded-xl border-2 bg-[rgba(245,245,107,0.10)] border-[rgba(255,214,0,0.50)]">
                        <div className="flex items-center justify-center h-24">
                          <Loader2 className="h-6 w-6 animate-spin text-[rgba(245,245,107,0.10)]" />
                        </div>
                      </div>
                    </div>
                  ) : !session?.user ? (
                    <div className="space-y-4 font-darker-grotesque">
                      <p
                        className={`text-[rgba(255,255,255,0.64)] text-base font-medium`}
                      >
                        Create your latchmcp account to get started
                      </p>
                      <Button
                        type="button"
                        onClick={() => openAccountModal("wallets")}
                        className={`h-12 px-8 font-semibold text-lg w-full bg-[rgba(245,245,107,0.10)]`}
                      >
                        <figure>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <mask
                              id="mask0_27033_1031"
                              maskUnits="userSpaceOnUse"
                              x="0"
                              y="0"
                              width="24"
                              height="24"
                            >
                              <path
                                d="M0.943359 0.706055H23.5316V23.2943H0.943359V0.706055Z"
                                fill="white"
                              />
                            </mask>
                            <g mask="url(#mask0_27033_1031)">
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M12.2036 0.706055C5.97771 0.706055 0.943359 5.883 0.943359 12.2868C0.943359 17.4058 4.16783 21.7385 8.64312 23.2731C9.20218 23.3875 9.40548 23.0232 9.40548 22.7169C9.40548 22.4486 9.38854 21.5282 9.38854 20.5696C6.25583 21.2599 5.60501 19.1889 5.60501 19.1889C5.09959 17.8477 4.35418 17.5018 4.35418 17.5018C3.32924 16.7917 4.42901 16.7917 4.42901 16.7917C5.56689 16.8693 6.16265 17.9804 6.16265 17.9804C7.16924 19.7451 8.79136 19.2468 9.4436 18.9404C9.53677 18.1922 9.83607 17.6741 10.1523 17.3875C7.65348 17.1192 5.02618 16.1211 5.02618 11.6726C5.02618 10.4077 5.4723 9.37147 6.18101 8.56676C6.06948 8.27876 5.67842 7.09005 6.29395 5.499C6.29395 5.499 7.24407 5.19264 9.38854 6.6877C10.3062 6.43358 11.2521 6.30653 12.2036 6.3037C13.1537 6.3037 14.1236 6.43923 15.0187 6.6877C17.1617 5.19123 18.1132 5.499 18.1132 5.499C18.7288 7.09005 18.3363 8.28017 18.2262 8.56676C18.9518 9.37147 19.381 10.4077 19.381 11.6726C19.381 16.1211 16.7523 17.0981 14.2351 17.3861C14.6445 17.7503 15.0003 18.4406 15.0003 19.5333C15.0003 21.0863 14.9805 22.3329 14.9805 22.7169C14.9805 23.0232 15.1867 23.3875 15.7457 23.2731C20.221 21.7385 23.4455 17.4058 23.4455 12.2868C23.4638 5.883 18.4111 0.706055 12.2036 0.706055Z"
                                fill="#FAFABB"
                              />
                            </g>
                          </svg>
                        </figure>
                        Sign In with GitHub
                      </Button>
                    </div>
                  ) : !hasValidWallet ? (
                    <div className="space-y-4">
                      {/* <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {userWallets.length === 0 ? "No wallets connected" : "Loading wallet status..."}
                    </p>
                    <div className={`p-6 rounded-xl border-2 ${isDark ? 'border-amber-600 bg-gradient-to-br from-amber-900/20 to-amber-800/10' : 'border-amber-500 bg-gradient-to-br from-amber-50 to-amber-25'} relative`}>
                      <div className="text-center">
                        <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-amber-600/20' : 'bg-amber-100'}`}>
                          <Wallet className={`h-8 w-8 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                        </div>
                        <h4 className={`font-semibold text-xl mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Connect Wallet
                        </h4>
                        <p className={`text-sm mb-6 leading-relaxed ${isDark ? 'text-amber-100' : 'text-amber-900'}`}>
                          Connect a wallet to your latchmcp account to receive payments from tool usage
                        </p>
                        <Button
                          type="button"
                          onClick={() => openAccountModal('wallets')}
                          className={`h-12 px-8 font-medium text-base ${isDark ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}
                        >
                          <Wallet className="h-5 w-5 mr-3" />
                          Manage Wallets
                        </Button>
                      </div>
                    </div> */}
                    </div>
                  ) : (
                    <div className="space-y-4 font-darker-grotesque">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#00FF75]" />
                          <span
                            className={`text-lg font-semibold text-[#00FF75]`}
                          >
                            {userWallets.length} Wallet
                            {userWallets.length !== 1 ? "s" : ""} Connected
                          </span>
                        </div>
                        {userWallets.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setShowWalletSelection(!showWalletSelection)
                            }
                            className={`text-xs ${
                              isDark
                                ? "text-gray-400 hover:text-white"
                                : "text-gray-600 hover:text-gray-900"
                            }`}
                          >
                            {showWalletSelection
                              ? "Hide Options"
                              : "Change Wallet"}
                            <ChevronDown
                              className={`h-3 w-3 ml-1 transition-transform ${
                                showWalletSelection ? "rotate-180" : ""
                              }`}
                            />
                          </Button>
                        )}
                      </div>

                      {/* Selected Wallet Display */}
                      <div
                        className={`rounded-lg border border-[rgba(255,255,255,0.04)] p-4 bg-[rgba(245,245,107,0.10)]`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-lg font-semibold text-[#FAFABB]`}
                              >
                                {activeWallet?.isPrimary
                                  ? "Primary Wallet"
                                  : "Selected Wallet"}
                              </span>
                              {/* {activeWallet?.isPrimary && (
                                <Badge variant="secondary" className="text-xs">Primary</Badge>
                              )} */}
                            </div>
                            {/* <div className="flex items-center gap-2">
                              <span className={`font-mono text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                {formatWalletAddress(walletAddress || '')}
                              </span>
                              {activeWallet?.provider && (
                              <Badge variant="outline" className="text-xs">
                                {activeWallet.provider}
                              </Badge>
                            )}
                            </div> */}
                          </div>

                          <span
                            className={`text-white text-base font-semibold mr-3`}
                          >
                            {formatWalletAddress(walletAddress || "")}
                          </span>
                          <Button
                            variant={null}
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                walletAddress || ""
                              );
                              toast.success("Copied to clipboard");
                            }}
                            className="w-10 h-10 bg-[rgba(245,245,107,0.10)] rounded"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
                              viewBox="0 0 20 20"
                              fill="none"
                            >
                              <path
                                d="M16.875 2.5H6.875C6.70924 2.5 6.55027 2.56585 6.43306 2.68306C6.31585 2.80027 6.25 2.95924 6.25 3.125V6.25H3.125C2.95924 6.25 2.80027 6.31585 2.68306 6.43306C2.56585 6.55027 2.5 6.70924 2.5 6.875V16.875C2.5 17.0408 2.56585 17.1997 2.68306 17.3169C2.80027 17.4342 2.95924 17.5 3.125 17.5H13.125C13.2908 17.5 13.4497 17.4342 13.5669 17.3169C13.6842 17.1997 13.75 17.0408 13.75 16.875V13.75H16.875C17.0408 13.75 17.1997 13.6842 17.3169 13.5669C17.4342 13.4497 17.5 13.2908 17.5 13.125V3.125C17.5 2.95924 17.4342 2.80027 17.3169 2.68306C17.1997 2.56585 17.0408 2.5 16.875 2.5ZM16.25 12.5H13.75V6.875C13.75 6.70924 13.6842 6.55027 13.5669 6.43306C13.4497 6.31585 13.2908 6.25 13.125 6.25H7.5V3.75H16.25V12.5Z"
                                fill="#F5F56B"
                              />
                            </svg>
                          </Button>
                        </div>
                      </div>

                      {/* Wallet Selection Dropdown */}
                      {/* {showWalletSelection && userWallets.length > 1 && (
                        <div className={`space-y-2 p-4 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800/30' : 'border-gray-300 bg-gray-50/50'}`}>
                          <h4 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-3`}>
                            Select Payment Wallet
                          </h4>
                          
                          {[...userWallets]
                            .sort((a, b) => {
                              if (a.isPrimary && !b.isPrimary) return -1
                              if (!a.isPrimary && b.isPrimary) return 1
                              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                            })
                            .map((wallet) => (
                              <div
                                key={wallet.id}
                                onClick={() => {
                                  setSelectedWallet(wallet)
                                  setShowWalletSelection(false)
                                }}
                                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${selectedWallet?.id === wallet.id
                                  ? isDark
                                    ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/20'
                                    : 'border-blue-500 bg-blue-50 ring-1 ring-blue-500/20'
                                  : isDark
                                    ? 'border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-700'
                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                              >
                                <div className="flex items-center gap-3 w-full">
                                  <div className={`w-2 h-2 rounded-full ${wallet.isActive ? "bg-green-500" : "bg-gray-400"
                                    }`} />
                                  <div className="text-left flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`font-mono text-sm font-medium ${selectedWallet?.id === wallet.id
                                        ? isDark ? 'text-blue-200' : 'text-blue-700'
                                        : isDark ? 'text-gray-200' : 'text-gray-800'
                                        }`}>
                                        {formatWalletAddress(wallet.walletAddress)}
                                      </span>
                                      {wallet.isPrimary && (
                                        <Badge variant="secondary" className="text-xs">Primary</Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {wallet.provider && (
                                        <Badge variant="outline" className={`text-xs ${selectedWallet?.id === wallet.id
                                          ? isDark ? 'border-blue-400/50 text-blue-300' : 'border-blue-400/50 text-blue-600'
                                          : ''
                                          }`}>
                                          {wallet.provider}
                                        </Badge>
                                      )}
                                      <span className={`text-xs ${selectedWallet?.id === wallet.id
                                        ? isDark ? 'text-blue-300' : 'text-blue-600'
                                        : isDark ? 'text-gray-400' : 'text-gray-500'
                                        }`}>
                                        {wallet.blockchain}
                                      </span>
                                    </div>
                                  </div>
                                  {selectedWallet?.id === wallet.id && (
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isDark ? 'bg-blue-500' : 'bg-blue-500'
                                      }`}>
                                      <CheckCircle className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      )} */}

                      {/* <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {userWallets.length > 1
                          ? `You can select any of your ${userWallets.length} connected wallets for payments`
                          : activeWallet?.isPrimary
                            ? "Using your primary wallet from account settings"
                            : "Using your connected wallet for payments"
                        }
                      </div> */}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Configuration Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Left Column - Wallet & Network */}
              <div className="space-y-6 lg:col-span-2">
                {/* Server URL */}
                <div
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(0, 0, 0, 0.00) 17.73%, #080805 100%), linear-gradient(94deg, rgba(255, 165, 10, 0.80) -3.72%, rgba(206, 174, 35, 0.80) 14.51%, rgba(141, 107, 13, 0.80) 49.55%, rgba(26, 27, 28, 0.80) 100%)",
                  }}
                  className={`px-4 xl:px-8 py-4 rounded-[12px] font-darker-grotesque`}
                >
                  <div className="flex items-center gap-3">
                    <h3
                      className={`font-bold text-2xl lg:text-[32px] text-[#FCFCD1]`}
                    >
                      MCP Server URL
                    </h3>
                    <Badge
                      variant="secondary"
                      className="ml-auto bg-[rgba(0,0,0,0.48)] border-none py-2 px-4 rounded-full text-[#FCFCD1] text-base font-bold font-darker-grotesque"
                    >
                      Required
                    </Badge>
                  </div>
                  <p
                    className={`text-[rgba(255,255,255,0.80)] text-xl font-medium`}
                  >
                    Your MCP server&apos;s URL must use the{" "}
                    <a
                      href="https://modelcontextprotocol.io/specification/draft/basic/transports#streamable-http"
                      className={`font-semibold underline decoration-2 underline-offset-2 transition-colors ${
                        isDark ? "hover:text-blue-100" : "hover:text-blue-900"
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Streamable HTTP transport
                    </a>
                    .
                  </p>
                  <div className="relative my-6">
                    <Input
                      placeholder="https://your-server.com/mcp?•••••••"
                      value={formData.url}
                      onChange={(e) => handleInputChange("url", e.target.value)}
                      required
                      type="url"
                      className={`py-3 px-6 bg-[rgba(245,245,107,0.16)] backdrop-blur-[10px] border-none outline-none text-xl font-bold placeholder:text-[rgba(255,255,255,0.64)] text-white`}
                    />
                    {isLoadingTools && (
                      <Loader2
                        className={`absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 animate-spin ${
                          isDark ? "text-gray-400" : "text-gray-500"
                        }`}
                      />
                    )}
                  </div>

                  {toolsError && (
                    <div
                      className={`flex items-start gap-3 text-red-500 text-sm p-4 mt-4 rounded-lg ${
                        isDark
                          ? "bg-red-900/20 border border-red-800"
                          : "bg-red-50 border border-red-200"
                      }`}
                    >
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{toolsError}</span>
                    </div>
                  )}

                  {/* Authentication Toggle */}
                  <div className="mt-6">
                    <div className="flex items-center space-x-3 p-4 rounded-lg border border-[rgba(245,245,107,0.16)]">
                      <Checkbox
                        id="auth-headers"
                        checked={showAuthHeaders}
                        onCheckedChange={(checked) =>
                          setShowAuthHeaders(checked === true)
                        }
                      />
                      <label
                        htmlFor="auth-headers"
                        className={`text-lg font-semibold flex items-center gap-2 text-[rgba(255,255,255,0.64)]`}
                      >
                        <Lock className="h-4 w-4" />
                        Enable Authentication Headers
                      </label>
                    </div>

                    {showAuthHeaders && (
                      <div className="mt-4">
                        <Textarea
                          placeholder={`Authorization: Bearer your-token
X-API-Key: your-api-key`}
                          value={formData.headers}
                          onChange={(e) =>
                            handleInputChange("headers", e.target.value)
                          }
                          rows={3}
                          className={`bg-[#0F0F08] border-none outline-none placeholder:text-[rgba(255,255,255,0.48)] placeholder:font-medium font-semibold text-white text-xl `}
                        />
                        <p
                          className={`text-base font-medium mt-2 text-[#626566]`}
                        >
                          Add required headers for server authentication (one
                          per line)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                {/* Network Selection */}
                <div
                  className={`px-4 lg:px-8 py-4 rounded-xl bg-[#0F0F08] font-darker-grotesque`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-bold text-2xl text-white `}>
                      Payment Network
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setShowNetworkSelection(!showNetworkSelection)
                      }
                      className={`ml-auto bg-[rgba(245,245,107,0.10)] border-none py-2 px-4 rounded-full text-[#F5F56B] text-base font-bold font-darker-grotesque`}
                    >
                      {showNetworkSelection ? "Hide" : "Change"}
                    </Button>
                  </div>

                  {/* Current Network */}
                  <div className="flex items-center gap-2 text-[rgba(255,255,255,0.64)] text-lg font-semibold">
                    <span>Network:</span>
                    <Badge
                      className="text-lg font-semibold bg-none"
                      variant={(() => {
                        const networkConfig = getNetworkConfig(
                          selectedNetwork as UnifiedNetwork
                        );
                        return networkConfig?.isTestnet
                          ? "secondary"
                          : "default";
                      })()}
                    >
                      {(() => {
                        const networkConfig = getNetworkConfig(
                          selectedNetwork as UnifiedNetwork
                        );
                        return networkConfig?.name || selectedNetwork;
                      })()}
                    </Badge>
                    <span className="text-base font-semibold">
                      (
                      {(() => {
                        const networkConfig = getNetworkConfig(
                          selectedNetwork as UnifiedNetwork
                        );
                        return networkConfig?.isTestnet ? "Testnet" : "Mainnet";
                      })()}
                      )
                    </span>
                  </div>

                  {/* Network Options */}
                  {showNetworkSelection && (
                    <div className="mt-4 space-y-2">
                      {(
                        ["base-sepolia", "sei-testnet", "base"] as Network[]
                      ).map((networkKey) => {
                        const networkConfig = getNetworkConfig(
                          networkKey as UnifiedNetwork
                        );
                        if (!networkConfig) return null;

                        return (
                          <Button
                            key={networkKey}
                            type="button"
                            variant={
                              selectedNetwork === networkKey
                                ? "default"
                                : "ghost"
                            }
                            onClick={() => {
                              handleNetworkChange(networkKey);
                              setShowNetworkSelection(false);
                            }}
                            className={`w-full h-auto p-3 justify-start text-lg font-semibold ${
                              selectedNetwork === networkKey
                                ? "bg-gray-900 text-white"
                                : "text-[rgba(255,255,255,0.64)] hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-center gap-3 w-full">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  networkConfig.isTestnet
                                    ? "bg-orange-500"
                                    : "bg-green-500"
                                }`}
                              />
                              <div className="text-left">
                                <div className="font-medium text-sm">
                                  {networkConfig.name}
                                </div>
                                <div
                                  className={`text-xs ${
                                    isDark ? "text-gray-400" : "text-gray-500"
                                  }`}
                                >
                                  {networkConfig.isTestnet
                                    ? "Testnet"
                                    : "Mainnet"}
                                </div>
                              </div>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Middle Column - Server Configuration */}
              <div className="lg:col-span-2 space-y-6">
                {/* Server Details */}
                <div
                  className={`px-4 lg:px-8 py-4 rounded-xl bg-[#0F0F08] font-darker-grotesque`}
                >
                  <div className="flex items-center gap-3 pb-6 border-b border-b-[rgba(245,245,107,0.10)]">
                    <h3 className={`font-bold text-2xl text-white `}>
                      Server Details
                    </h3>
                    <Badge
                      variant="secondary"
                      className="ml-auto bg-[rgba(255,255,255,0.10)] border-none py-2 px-4 rounded-full text-[rgba(255,255,255,0.8)] text-base font-bold font-darker-grotesque"
                    >
                      Auto-filled
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-8">
                    <div className="space-y-3 sm:col-span-2">
                      <label className={`text-lg font-semibold text-[#CFD6D8]`}>
                        Server Name <span className="text-[#D74D4D]">*</span>
                      </label>
                      <Input
                        placeholder="Auto-detected from server"
                        value={formData.name}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        required
                        className={`mt-4 py-3 px-4 bg-[rgba(245,245,107,0.04)] border-none outline-none placeholder:text-[#626566] text-white text-lg font-semibold`}
                        disabled={!tools.length}
                      />
                    </div>

                    <div className="space-y-3 sm:col-span-2">
                      <label className={`text-lg font-semibold text-[#CFD6D8]`}>
                        Description <span className="text-[#D74D4D]">*</span>
                      </label>
                      <Textarea
                        placeholder="Auto-generated from detected tools"
                        value={formData.description}
                        onChange={(e) =>
                          handleInputChange("description", e.target.value)
                        }
                        required
                        rows={3}
                        className={`mt-4 py-3 px-4 bg-[rgba(245,245,107,0.04)] border-none outline-none placeholder:text-[#626566] text-white text-lg font-semibold`}
                        disabled={!tools.length}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tools Section */}
            {tools.length > 0 && (
              <div
                className={`px-4 lg:px-8 py-4 rounded-xl bg-[#0F0F08] font-darker-grotesque`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-b-[rgba(245,245,107,0.10)]">
                  <div className=" w-full">
                    <h3 className={`font-bold text-2xl text-white `}>
                      Detected Tools
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#00FF75]" />
                      <span className={`text-lg font-semibold text-[#00FF75]`}>
                        {tools.length} tool{tools.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fetchMCPTools(formData.url)}
                    className={`ml-auto bg-[rgba(245,245,107,0.10)] border-none py-2 px-4 rounded-full text-[#F5F56B] text-base font-bold font-darker-grotesque`}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Tools
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-8">
                  {tools.map((tool) => (
                    <Card
                      key={tool.name}
                      className={`transition-all hover:shadow-lg border-none bg-[#2B2B13]`}
                    >
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h4
                              className={`font-bold text-2xl text-[#F5F56B] truncate`}
                            >
                              {tool.name}
                            </h4>
                            <p
                              className={`text-lg text-[#87873B] font-medium leading-relaxed line-clamp-3`}
                            >
                              {tool.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-between bg-[#18180C] py-2 px-4 rounded-lg shadow-[0_0_16px_0_rgba(98,101,102,0.08)]">
                            <span
                              className={`text-lg font-semibold text-[#FCFCD1]`}
                            >
                              Price per use
                            </span>
                            <div className="flex items-center gap-2 bg-[#2B2B13] px-3 rounded">
                              <figure>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="20"
                                  height="20"
                                  viewBox="0 0 20 20"
                                  fill="none"
                                >
                                  <path
                                    d="M12.5 11.875C12.5 12.2065 12.3683 12.5245 12.1339 12.7589C11.8995 12.9933 11.5815 13.125 11.25 13.125H10.625V10.625H11.25C11.5815 10.625 11.8995 10.7567 12.1339 10.9911C12.3683 11.2255 12.5 11.5435 12.5 11.875ZM18.125 10C18.125 11.607 17.6485 13.1779 16.7557 14.514C15.8629 15.8502 14.594 16.8916 13.1093 17.5065C11.6247 18.1215 9.99099 18.2824 8.4149 17.9689C6.8388 17.6554 5.39106 16.8815 4.25476 15.7452C3.11846 14.6089 2.34463 13.1612 2.03112 11.5851C1.71762 10.009 1.87852 8.37535 2.49348 6.8907C3.10844 5.40605 4.14985 4.1371 5.486 3.24431C6.82214 2.35152 8.39303 1.875 10 1.875C12.1542 1.87727 14.2195 2.73403 15.7427 4.25727C17.266 5.78051 18.1227 7.84581 18.125 10ZM13.75 11.875C13.75 11.212 13.4866 10.5761 13.0178 10.1072C12.5489 9.63839 11.913 9.375 11.25 9.375H10.625V6.875H10.9375C11.269 6.875 11.587 7.0067 11.8214 7.24112C12.0558 7.47554 12.1875 7.79348 12.1875 8.125C12.1875 8.29076 12.2534 8.44973 12.3706 8.56694C12.4878 8.68415 12.6467 8.75 12.8125 8.75C12.9783 8.75 13.1372 8.68415 13.2544 8.56694C13.3717 8.44973 13.4375 8.29076 13.4375 8.125C13.4375 7.46196 13.1741 6.82607 12.7053 6.35723C12.2364 5.88839 11.6005 5.625 10.9375 5.625H10.625V5C10.625 4.83424 10.5592 4.67527 10.4419 4.55806C10.3247 4.44085 10.1658 4.375 10 4.375C9.83424 4.375 9.67527 4.44085 9.55806 4.55806C9.44085 4.67527 9.375 4.83424 9.375 5V5.625H9.0625C8.39946 5.625 7.76358 5.88839 7.29474 6.35723C6.8259 6.82607 6.5625 7.46196 6.5625 8.125C6.5625 8.78804 6.8259 9.42393 7.29474 9.89277C7.76358 10.3616 8.39946 10.625 9.0625 10.625H9.375V13.125H8.75C8.41848 13.125 8.10054 12.9933 7.86612 12.7589C7.6317 12.5245 7.5 12.2065 7.5 11.875C7.5 11.7092 7.43416 11.5503 7.31695 11.4331C7.19974 11.3158 7.04076 11.25 6.875 11.25C6.70924 11.25 6.55027 11.3158 6.43306 11.4331C6.31585 11.5503 6.25 11.7092 6.25 11.875C6.25 12.538 6.5134 13.1739 6.98224 13.6428C7.45108 14.1116 8.08696 14.375 8.75 14.375H9.375V15C9.375 15.1658 9.44085 15.3247 9.55806 15.4419C9.67527 15.5592 9.83424 15.625 10 15.625C10.1658 15.625 10.3247 15.5592 10.4419 15.4419C10.5592 15.3247 10.625 15.1658 10.625 15V14.375H11.25C11.913 14.375 12.5489 14.1116 13.0178 13.6428C13.4866 13.1739 13.75 12.538 13.75 11.875ZM7.8125 8.125C7.8125 8.45652 7.9442 8.77446 8.17862 9.00888C8.41304 9.2433 8.73098 9.375 9.0625 9.375H9.375V6.875H9.0625C8.73098 6.875 8.41304 7.0067 8.17862 7.24112C7.9442 7.47554 7.8125 7.79348 7.8125 8.125Z"
                                    fill="#F5F56B"
                                  />
                                </svg>
                              </figure>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={tool.price || "0.01"}
                                onChange={(e) =>
                                  updateToolPrice(tool.name, e.target.value)
                                }
                                className={`w-20 bg-transparent border-none outline-none text-[#F5F56B] text-lg font-semibold`}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Section */}
            <div className={`p-8 rounded-[12px] bg-[#15150B]`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  <figure className="w-16 min-w-16 h-16">
                    <Image
                      src={"/register/ready.png"}
                      alt="icon"
                      width={0}
                      height={0}
                      sizes="100vw"
                      className="w-full h-full"
                    />
                  </figure>
                  <div>
                    <h3
                      className={`font-normal text-[32px] text-white font-instrument-serif  mb-1`}
                    >
                      Ready to Register?
                    </h3>
                    <p
                      className={`text-sm font-semibold font-darker-grotesque uppercase text-[rgba(255,255,255,0.64)]`}
                    >
                      Your MCP server will be registered and available for
                      monetized usage
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  variant={null}
                  className={`cursor-pointer bg-white py-2 px-6 text-[#2B2B13] text-lg font-bold font-darker-grotesque`}
                  disabled={!isFormValid || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      Register Server
                      <ArrowRight className="h-5 w-5 ml-3" />
                    </>
                  )}
                </Button>
              </div>

              {submitError && (
                <div
                  className={`flex items-start gap-3 text-red-500 text-sm p-4 mt-4 rounded-lg ${
                    isDark
                      ? "bg-red-900/20 border border-red-800"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{submitError}</span>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Account Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={closeAccountModal}
        defaultTab="wallets"
      />
    </div>
  );
}

// Loading fallback component
function RegisterPageLoading() {
  const { isDark } = useTheme();

  return (
    <div
      className={`min-h-screen ${
        isDark
          ? "bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950"
          : "bg-gradient-to-br from-gray-50 via-white to-gray-50"
      }`}
    >
      <div
        className={`border-b ${
          isDark
            ? "border-gray-800 bg-gray-900/50"
            : "border-gray-200 bg-white/50"
        } backdrop-blur-sm sticky top-0 z-10`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-xl ${
                isDark ? "bg-gray-800" : "bg-gray-100"
              }`}
            >
              <Server
                className={`h-8 w-8 ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              />
            </div>
            <div>
              <h1
                className={`text-2xl sm:text-3xl font-bold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Register MCP Server
              </h1>
              <p
                className={`text-base ${
                  isDark ? "text-gray-400" : "text-gray-600"
                } mt-1`}
              >
                Loading...
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2
            className={`h-8 w-8 animate-spin ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          />
        </div>
      </div>
    </div>
  );
}

// Main export with Suspense boundary
export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterPageLoading />}>
      <RegisterPageContent />
    </Suspense>
  );
}
