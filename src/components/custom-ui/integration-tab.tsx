"use client";

import {
  Activity,
  AlertCircle,
  CheckCircle,
  Copy,
  Download,
  ExternalLink,
  Github,
  Package,
  Plug,
  Shield,
  Wrench,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "sonner";
import { api, urlUtils } from "../../lib/client/utils";
import { useSession } from "../../lib/client/auth";
import {
  DailyServerAnalytics,
  McpServerWithStats,
  ServerSummaryAnalytics,
} from "../../types";
import { useTheme } from "../providers/theme-context";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

interface IntegrationTabProps {
  serverData: McpServerWithStats & {
    dailyAnalytics: DailyServerAnalytics[];
    summaryAnalytics: ServerSummaryAnalytics;
  };
  onTabChange: (tab: string) => void;
}

interface IntegrationContentConfig {
  sections: IntegrationSection[];
  securityWarning: {
    title: string;
    message: string;
  };
  quickLinks: LinkItem[];
}

interface IntegrationSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  content: IntegrationContentItem[];
}

interface IntegrationContentItem {
  type: "code" | "links";
  title: string;
  description?: string;
  language?: string;
  code?: string;
  copyable?: boolean;
  badge?: string;
  links?: LinkItem[];
}

interface LinkItem {
  text: string;
  href?: string;
  variant?: "primary" | "secondary" | "external" | "internal" | "cursor";
  icon?: React.ComponentType<{ className?: string }> | string;
  onClick?: () => void;
}

export function IntegrationTab({
  serverData,
  onTabChange,
}: IntegrationTabProps) {
  const { isDark } = useTheme();
  const { data: session } = useSession();
  const [markdownCopied, setMarkdownCopied] = useState(false);
  const [isGeneratingApiKey, setIsGeneratingApiKey] = useState(false);

  // Cursor logo component using the official SVG
  const CursorLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
    <img
      src="/logos/cursor-ai-logo.svg"
      alt="Cursor AI"
      className={className}
    />
  );

  // Generate random API key name for MCP access
  const generateApiKeyName = () => {
    const adjectives = [
      "Swift",
      "Clever",
      "Bright",
      "Quick",
      "Smart",
      "Fast",
      "Smooth",
      "Sharp",
      "Bold",
      "Cool",
    ];
    const nouns = [
      "MCP",
      "Access",
      "Link",
      "Gate",
      "Bridge",
      "Connect",
      "Port",
      "Pass",
      "Key",
      "Hub",
    ];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 999) + 1;
    return `${adjective}${noun}${number}`;
  };

  // Generate Cursor deep link with API key
  const generateCursorDeepLink = (apiKey: string) => {
    if (!serverData) return "";

    const mcpUrl = urlUtils.getMcpUrl(serverData.serverId);
    const config = {
      url: `${mcpUrl}?apiKey=${apiKey}`,
    };
    const encodedConfig = btoa(JSON.stringify(config));
    const serverName = (serverData.name || "mcp-server")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");

    return `cursor://anysphere.cursor-deeplink/mcp/install?name=${serverName}&config=${encodedConfig}`;
  };

  const handleCursorInstall = async () => {
    // Check if user is authenticated
    if (!session?.user?.id) {
      toast.error("Please sign in to install MCP server in Cursor");
      return;
    }

    setIsGeneratingApiKey(true);

    try {
      // Generate API key for MCP access
      const response = await api.createApiKey(session.user.id, {
        name: generateApiKeyName(),
        permissions: [
          "read",
          "write",
          "execute",
          `server:${serverData.serverId}`,
        ], // Full MCP permissions
      });

      if (response && typeof response === "object" && "apiKey" in response) {
        const apiKey = response.apiKey as string;
        const deepLink = generateCursorDeepLink(apiKey);

        if (deepLink) {
          window.location.href = deepLink;
          toast.success(
            "API key generated! Opening Cursor to install MCP server..."
          );
        } else {
          toast.error("Unable to generate install link");
        }
      }
    } catch (error) {
      console.error("Error creating API key for Cursor install:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate API key for MCP access"
      );
    } finally {
      setIsGeneratingApiKey(false);
    }
  };

  // Centralized content configuration - single source of truth
  const getContentConfig = (): IntegrationContentConfig => {
    if (!serverData) {
      return {
        sections: [],
        securityWarning: { title: "", message: "" },
        quickLinks: [],
      };
    }

    return {
      sections: [
        {
          id: "mcp-client",
          title: "MCP Client Integration",
          description:
            "Connect to AI assistants like Claude, Cursor, and Windsurf",
          icon: Plug,
          content: [
            {
              type: "links",
              title: "One-Click Install for Cursor",
              description: session?.user
                ? "Install this MCP server directly in Cursor with a single click. This will automatically generate an API key and configure the server in your Cursor MCP settings."
                : "Sign in to install this MCP server directly in Cursor with a single click.",
              badge: "Recommended",
              links: [
                {
                  text: isGeneratingApiKey
                    ? "Generating API Key..."
                    : !session?.user
                    ? "Sign In Required"
                    : "Install in Cursor",
                  variant: "cursor",
                  icon: isGeneratingApiKey ? Activity : "cursor-logo",
                  onClick: handleCursorInstall,
                },
              ],
            },
            {
              type: "code",
              title: "Manual Configuration with API Key",
              description:
                "Create an API key in your account settings and add this to your MCP client config file (e.g., claude_desktop_config.json). Replace YOUR_API_KEY with your actual API key.",
              language: "json",
              copyable: true,
              badge: "Recommended",
              code: JSON.stringify(
                {
                  mcpServers: {
                    [serverData.name || "server-name"]: {
                      command: "npx",
                      args: [
                        "latchmcp",
                        "server",
                        "--urls",
                        urlUtils.getMcpUrl(serverData.serverId),
                        "--api-key",
                        "latchmcp_YOUR_API_KEY_HERE",
                      ],
                    },
                  },
                },
                null,
                2
              ),
            },
            {
              type: "code",
              title: "Manual Configuration with Private Key",
              description:
                "Alternative method using wallet private key. Replace YOUR_PRIVATE_KEY with your actual wallet private key (less secure than API key method).",
              language: "json",
              copyable: true,
              badge: "Alternative",
              code: JSON.stringify(
                {
                  mcpServers: {
                    [serverData.name || "server-name"]: {
                      command: "npx",
                      args: [
                        "latchmcp",
                        "server",
                        "--urls",
                        urlUtils.getMcpUrl(serverData.serverId),
                        "--private-key",
                        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                      ],
                    },
                  },
                },
                null,
                2
              ),
            },
            {
              type: "code",
              title: "latchmcp CLI (Direct Connection)",
              description:
                "Use API key for authentication (recommended) or private key as alternative",
              language: "bash",
              copyable: true,
              code: `# Using API Key (recommended)
npx latchmcp server --urls ${urlUtils.getMcpUrl(
                serverData.serverId
              )} --api-key latchmcp_YOUR_API_KEY_HERE

# Using Private Key (alternative)
npx latchmcp server --urls ${urlUtils.getMcpUrl(
                serverData.serverId
              )} --private-key YOUR_PRIVATE_KEY`,
            },
          ],
        },
        {
          id: "api-integration",
          title: "Direct API Integration",
          description: "Build custom applications with programmatic access",
          icon: Activity,
          content: [
            {
              type: "code",
              title: "JavaScript/TypeScript SDK",
              description:
                "Replace 0x1234567890abcdef... with your actual wallet private key. Adjust the maxPaymentValue as needed.",
              language: "typescript",
              copyable: true,
              badge: "Advanced",
              code: `import { Client } from '@modelcontextprotocol/sdk/client'
import { createPaymentTransport } from 'latchmcp/client'
import { privateKeyToAccount } from 'viem/accounts'

// Initialize account from private key
const account = privateKeyToAccount('0x1234567890abcdef...')
const url = new URL('${urlUtils.getMcpUrl(serverData.serverId)}')

// Create payment-enabled transport
const transport = createPaymentTransport(url, account, {
  maxPaymentValue: BigInt(0.1 * 10 ** 6), // 0.1 USDC max payment
})

// Initialize MCP client
const client = new Client(
  { name: 'my-mcp-client', version: '1.0.0' },
  { capabilities: {} }
)

// Connect and start using tools
await client.connect(transport)
const tools = await client.listTools()
console.log('Available tools:', tools)`,
            },
          ],
        },
      ],
      securityWarning: {
        title: "Security Best Practices",
        message:
          "Never share your private key publicly or in version control. The latchmcp proxy handles payments securely using your private key locally. Consider using environment variables or secure key management solutions in production.",
      },
      quickLinks: [
        {
          text: "View Tools",
          variant: "primary",
          icon: Wrench,
          onClick: () => onTabChange("tools"),
        },
        ...(session?.user
          ? [
              {
                text: "Manage API Keys",
                variant: "secondary" as const,
                icon: Shield,
                onClick: () => {
                  // This should open the account modal to the API keys tab
                  const accountButton = document.querySelector(
                    "[data-account-button]"
                  ) as HTMLElement;
                  accountButton?.click();
                },
              },
            ]
          : []),
        {
          text: "latchmcp.app GitHub",
          href: "https://github.com/microchipgnu/latchmcp.app",
          variant: "secondary",
          icon: Github,
        },
        {
          text: "MCP Documentation",
          href: "https://modelcontextprotocol.io",
          variant: "external",
          icon: ExternalLink,
        },
        {
          text: "MCP GitHub",
          href: "https://github.com/modelcontextprotocol",
          variant: "external",
          icon: Github,
        },
        {
          text: "latchmcp Package",
          href: "https://www.npmjs.com/package/latchmcp",
          variant: "internal",
          icon: Package,
        },
      ],
    };
  };

  const contentConfig = getContentConfig();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const generateMarkdownContent = (): string => {
    if (!serverData) return "# Integration Guide\n\nServer data not available.";

    const config = getContentConfig();

    let markdown = `# ${serverData.name || "MCP Server"} Integration Guide\n\n`;

    config.sections.forEach((section) => {
      markdown += `## ${section.title}\n\n${section.description}\n\n`;

      section.content.forEach((item) => {
        if (item.type === "links" && item.title.includes("Cursor")) {
          markdown += `### ${item.title}\n\n`;
          if (item.description) {
            markdown += `${item.description}\n\n`;
          }
          if (session?.user) {
            markdown += `Click the "Install in Cursor" button on the website to automatically generate an API key and install.\n\n`;
          } else {
            markdown += `Sign in to the website and click "Install in Cursor" for automatic setup.\n\n`;
          }
        } else if (item.type === "code") {
          markdown += `### ${item.title}\n\n`;
          if (item.description) {
            markdown += `${item.description}\n\n`;
          }
          markdown += `\`\`\`${item.language || "text"}\n${
            item.code || ""
          }\n\`\`\`\n\n`;
        }
      });
    });

    markdown += `## ${config.securityWarning.title}\n\n⚠️ ${config.securityWarning.message}\n\n`;

    markdown += `## Authentication Methods\n\n`;
    markdown += `This MCP server supports two authentication methods:\n\n`;
    markdown += `1. **API Key (Recommended)**: More secure, can be revoked, easier to manage\n`;
    markdown += `2. **Private Key**: Direct wallet authentication, requires more security precautions\n\n`;

    markdown += `## Quick Links\n\n`;
    config.quickLinks.forEach((link) => {
      if (link.href) {
        markdown += `- [${link.text}](${link.href})\n`;
      }
    });

    return markdown;
  };

  const copyIntegrationAsMarkdown = async () => {
    const markdown = generateMarkdownContent();
    try {
      await navigator.clipboard.writeText(markdown);
      setMarkdownCopied(true);
      toast.success("Integration guide copied as Markdown!");
      setTimeout(() => setMarkdownCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy markdown");
    }
  };

  const renderContentItem = (
    item: IntegrationContentItem,
    sectionId: string,
    itemIndex: number
  ) => {
    const key = `${sectionId}-${itemIndex}`;

    if (item.type === "code") {
      return (
        <div
          key={key}
          className={`relative group rounded-xl border border-[rgba(245,245,107,0.10)] transition-all duration-200 `}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h4 className="font-bold text-white text-2xl">{item.title}</h4>
                {item.badge && (
                  <Badge
                    variant={
                      item.badge === "Recommended" || item.badge === "Fastest"
                        ? "default"
                        : "secondary"
                    }
                    className="text-xs bg-[#1663E7] text-white uppercase"
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>
              {item.copyable && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(item.code || "")}
                  className={`opacity-60 group-hover:opacity-100 transition-opacity ${
                    isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"
                  }`}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              )}
            </div>

            <div
              className={`rounded-lg overflow-hidden border border-[rgba(255,255,255,0.04)]`}
            >
              <SyntaxHighlighter
                language={item.language || "text"}
                style={oneLight}
                className="text-sm"
                wrapLines={true}
                wrapLongLines={true}
                customStyle={{
                  margin: 0,
                  padding: "1rem",
                  background: "transparent",
                  color: "#fff",
                }}
              >
                {item.code || ""}
              </SyntaxHighlighter>
            </div>

            {item.description && (
              <p
                className={`mt-4 leading-relaxed text-[rgba(255,255,255,0.64)] text-lg font-semibold`}
              >
                {item.description}
              </p>
            )}
          </div>
        </div>
      );
    }

    if (item.type === "links") {
      const isCursorInstall = item.title.includes("Cursor");
      return (
        <div
          key={key}
          className={`relative group rounded-xl transition-all duration-200 bg-[rgba(255,255,255,0.08)]`}
        >
          <div className="p-5">
            {item.badge && (
              <Badge
                variant={
                  isCursorInstall && item.badge === "Recommended"
                    ? "default"
                    : "secondary"
                }
                className={`text-xs mb-3 ${
                  isCursorInstall && item.badge === "Recommended"
                    ? "bg-[#1663E7] rounded-full text-white uppercase text-sm"
                    : ""
                }`}
              >
                {item.badge}
              </Badge>
            )}
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`p-2 rounded-lg ${
                  isCursorInstall ? "bg-blue-100" : "bg-purple-100"
                }`}
              >
                {isCursorInstall ? (
                  <CursorLogo
                    className={`h-4 w-4 ${
                      isDark ? "text-blue-400" : "text-blue-600"
                    }`}
                  />
                ) : (
                  <Download className="h-4 w-4 text-purple-600" />
                )}
              </div>
              <div className="flex items-center gap-3">
                <h4 className={`font-bold text-xl text-white `}>
                  {item.title}
                </h4>
              </div>
            </div>

            {item.description && (
              <p
                className={`text-base font-medium mb-4 leading-relaxed text-[#A7ACAE]`}
              >
                {item.description}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              {item.links?.map((link, linkIndex) => {
                const IconComponent =
                  link.icon === "cursor-logo"
                    ? CursorLogo
                    : typeof link.icon === "string"
                    ? ExternalLink
                    : link.icon || ExternalLink;

                const baseClasses =
                  "inline-flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 hover:shadow-xl relative overflow-hidden group";

                const variantStyles = {
                  primary: isDark
                    ? "bg-purple-600 text-white hover:bg-purple-500 shadow-purple-500/25"
                    : "bg-purple-600 text-white hover:bg-purple-700 shadow-purple-500/25",
                  secondary: isDark
                    ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  external: isDark
                    ? "bg-blue-600 text-white hover:bg-blue-500"
                    : "bg-blue-500 text-white hover:bg-blue-600",
                  internal: isDark
                    ? "bg-orange-600 text-white hover:bg-orange-500"
                    : "bg-orange-500 text-white hover:bg-orange-600",
                  cursor: isDark
                    ? "bg-white text-black hover:bg-gray-100 shadow-white/20 border border-gray-300"
                    : "bg-white text-black hover:bg-gray-50 shadow-gray-300/20 border border-gray-300",
                };

                const className = `${baseClasses} ${
                  variantStyles[link.variant || "external"]
                }`;

                if (link.onClick) {
                  const isDisabled =
                    (!session?.user &&
                      link.text.includes("Sign In Required")) ||
                    isGeneratingApiKey;
                  return (
                    <button
                      key={`${key}-link-${linkIndex}`}
                      onClick={link.onClick}
                      disabled={isDisabled}
                      className={`${className} ${
                        isDisabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <IconComponent className="h-5 w-5" />
                      <span>{link.text}</span>
                    </button>
                  );
                }

                return (
                  <a
                    key={`${key}-link-${linkIndex}`}
                    href={link.href}
                    target={
                      link.href?.startsWith("http") ? "_blank" : undefined
                    }
                    rel={
                      link.href?.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                    className={className}
                  >
                    <IconComponent className="h-4 w-4" />
                    {link.text}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderLink = (link: LinkItem, index: number) => {
    const IconComponent =
      link.icon === "cursor-logo"
        ? CursorLogo
        : typeof link.icon === "string"
        ? ExternalLink
        : link.icon || ExternalLink;

    const baseClasses =
      "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md";

    const variantStyles = {
      primary: isDark
        ? "bg-purple-600 text-white hover:bg-purple-500 shadow-purple-500/20"
        : "bg-purple-600 text-white hover:bg-purple-700 shadow-purple-500/20",
      secondary: isDark
        ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200",
      external: isDark
        ? "bg-blue-600 text-white hover:bg-blue-500"
        : "bg-blue-500 text-white hover:bg-blue-600",
      internal: isDark
        ? "bg-orange-600 text-white hover:bg-orange-500"
        : "bg-orange-500 text-white hover:bg-orange-600",
      cursor: isDark
        ? "bg-black text-white hover:bg-gray-900 shadow-black/20"
        : "bg-black text-white hover:bg-gray-900 shadow-black/20",
    };

    const className = `${baseClasses} ${
      variantStyles[link.variant || "external"]
    }`;

    if (link.onClick) {
      return (
        <button key={index} onClick={link.onClick} className={className}>
          <IconComponent className="h-4 w-4" />
          {link.text}
        </button>
      );
    }

    return (
      <a
        key={index}
        href={link.href}
        target={link.href?.startsWith("http") ? "_blank" : undefined}
        rel={link.href?.startsWith("http") ? "noopener noreferrer" : undefined}
        className={className}
      >
        <IconComponent className="h-4 w-4" />
        {link.text}
      </a>
    );
  };

  if (!serverData) {
    return (
      <Card
        className={`${
          isDark ? "bg-gray-900/50 border-gray-800" : "bg-white border-gray-200"
        } backdrop-blur-sm`}
      >
        <CardHeader className="pb-8">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div
              className={`p-2 rounded-lg ${
                isDark ? "bg-purple-500/20" : "bg-purple-100"
              }`}
            >
              <Plug className="h-5 w-5 text-purple-600" />
            </div>
            Integration Guide
          </CardTitle>
          <CardDescription className="text-base">
            Server data is loading...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-base">
            <div
              className={`w-2 h-2 rounded-full animate-pulse ${
                isDark ? "bg-gray-400" : "bg-gray-600"
              }`}
            />
            Please wait while we load the server information.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8 font-darker-grotesque">
      {/* Header */}
      <div className="space-y-2 p-4 rounded-lg border border-[rgba(255,255,255,0.04)] bg-[rgba(245,245,107,0.04)] backdrop-blur-[20px]">
        <h5 className="text-[#F5F56B] text-2xl font-bold">Integration Guide</h5>
        <p className="text-xl text-white font-medium">
          Learn how to integrate <strong>{serverData.name}</strong> into your
          applications. Choose from multiple integration methods based on your
          needs.
        </p>
      </div>

      {/* Integration Sections */}
      <div className="space-y-8 ">
        {contentConfig.sections.map((section) => {
          const IconComponent = section.icon;
          return (
            <Card
              key={section.id}
              className={`xl:p-4 rounded-lg border border-[rgba(255,255,255,0.04)] bg-[rgba(0,97,255,0.12)] backdrop-blur-[20px]`}
            >
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3">
                  <div>
                    <CardTitle className="text-[#4C81DB] text-2xl font-bold">
                      {section.title}
                    </CardTitle>
                    <CardDescription className="text-xl text-white font-medium">
                      {section.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {section.content.map((item, index) =>
                  renderContentItem(item, section.id, index)
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Security Warning */}
      <Card
        style={{
          borderRadius: 8,
          border:
            "1px solid var(--primary-alpha-16, rgba(245, 245, 107, 0.16))",
          background: "rgba(245, 245, 107, 0.16)",
          backdropFilter: "blur(20px)",
        }}
      >
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div>
              <h4 className="font-bold text-2xl mb-2 text-[#F5F56B]">
                {contentConfig.securityWarning.title}
              </h4>
              <p className={`text-[#87873B] text-xl font-medium`}>
                {contentConfig.securityWarning.message}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
