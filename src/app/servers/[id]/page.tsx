"use client"

import { AnalyticsChart } from "@/components/custom-ui/analytics-chart"
import { TransactionLink } from "@/components/custom-ui/explorer-link"
import { IntegrationTab } from "@/components/custom-ui/integration-tab"
import { ToolExecutionModal } from "@/components/custom-ui/tool-execution-modal"
import { useTheme } from "@/components/providers/theme-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getExplorerName, openExplorer } from "@/lib/client/blockscout"
import { api, urlUtils } from "@/lib/client/utils"
import {
  formatTokenAmount,
  fromBaseUnits,
  getTokenInfo,
} from "@/lib/commons"
// Add missing imports from amounts utilities
import { RevenueDetail } from "@/lib/gateway/db/schema"
import { PricingEntry } from "@/types"
import { type Network } from "@/types/blockchain"
import { type DailyServerAnalytics, type McpServerWithStats, type ServerSummaryAnalytics, type ToolFromMcpServerWithStats } from "@/types/mcp"
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Coins,
  Copy,
  DollarSign,
  Loader2,
  Play,
  RefreshCcw,
  Shield,
  Users,
  Wrench,
  XCircle
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export default function ServerDashboard() {
  const params = useParams()
  const serverId = params.id as string
  const [serverData, setServerData] = useState<McpServerWithStats & { dailyAnalytics: DailyServerAnalytics[], summaryAnalytics: ServerSummaryAnalytics } | null>(null)
  const [loading, setLoading] = useState(true)
  const [refetchPayment, setRefetchPayment] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [selectedTool, setSelectedTool] = useState<ToolFromMcpServerWithStats | null>(null)
  const [showToolModal, setShowToolModal] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [openTooltips, setOpenTooltips] = useState<Record<string, boolean>>({})
  const [showAllPricing, setShowAllPricing] = useState(false)
  const { isDark } = useTheme()

  // Initialize tab from URL hash
  useEffect(() => {
    const hash = window.location.hash.slice(1) // Remove the #
    const validTabs = ['overview', 'integration', 'tools', 'analytics']
    if (hash && validTabs.includes(hash)) {
      setActiveTab(hash)
    }
  }, [])

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // Don't add hash for default tab to keep URLs clean
    if (value === 'overview') {
      window.history.replaceState(null, '', window.location.pathname)
    } else {
      window.history.replaceState(null, '', `#${value}`)
    }
  }

  const fetchServerData = async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await api.getServer(serverId)
      setServerData(data as McpServerWithStats & { dailyAnalytics: DailyServerAnalytics[], summaryAnalytics: ServerSummaryAnalytics })
    } catch (err) {
      console.error('Error fetching server data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch server data')
    } finally {
      setLoading(false)
    }
  }

  const reFetchServerData = async () => {
    try {
      setRefetchPayment(true)

      const data = await api.getServer(serverId)
      setServerData(data as McpServerWithStats & { dailyAnalytics: DailyServerAnalytics[], summaryAnalytics: ServerSummaryAnalytics })

    } catch (err) {
      console.error('Error fetching server data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch server data')
    } finally {
      setRefetchPayment(false)
    }
  }

  useEffect(() => {
    if (serverId) {
      const interval = setInterval(() => {
        reFetchServerData()
      }, 10000) // 10 seconds

      return () => clearInterval(interval)
    }
  }, [serverId])

  useEffect(() => {
    if (serverId) {
      fetchServerData()
    }
  }, [serverId])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleToolExecution = (tool: ToolFromMcpServerWithStats) => {
    setSelectedTool(tool)
    setShowToolModal(true)
  }

  // Handle tooltip open/close
  const handleTooltipOpenChange = (toolId: string, open: boolean) => {
    setOpenTooltips(prev => ({
      ...prev,
      [toolId]: open
    }))
  }

  const toggleTooltip = (toolId: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setOpenTooltips(prev => ({
      ...prev,
      [toolId]: !prev[toolId]
    }))
  }

  // Helper function to safely convert to number
  const safeNumber = (value: unknown): number => {
    const num = Number(value)
    return isNaN(num) ? 0 : num
  }

  // Helper function to get active pricing entries
  const getActivePricing = (pricing: PricingEntry[] | null): PricingEntry[] => {
    if (!pricing || !Array.isArray(pricing)) return []
    return pricing.filter(p => p.active === true)
  }

  // Helper function to calculate total revenue from revenueDetails array
  const calculateTotalRevenue = (revenueDetails: RevenueDetail[] | null): number => {
    if (!revenueDetails || !Array.isArray(revenueDetails)) {
      return 0
    }

    return revenueDetails.reduce((total, detail) => {
      if (detail && detail.amount_raw && detail.decimals !== undefined &&
        typeof detail.amount_raw === 'string' && detail.amount_raw.trim() !== '') {
        try {
          const humanAmount = safeNumber(fromBaseUnits(detail.amount_raw, detail.decimals))
          return total + humanAmount
        } catch (error) {
          console.error('Error converting revenue amount:', error)
          return total
        }
      }
      return total
    }, 0)
  }

  // Helper function to format the primary revenue amount for display
  const formatPrimaryRevenue = (revenueDetails: RevenueDetail[] | null): string => {
    if (!revenueDetails || !Array.isArray(revenueDetails) || revenueDetails.length === 0) {
      return "0.00"
    }

    // Get the first revenue detail for primary display
    const primaryDetail = revenueDetails[0]
    if (primaryDetail && primaryDetail.amount_raw && primaryDetail.decimals !== undefined &&
      typeof primaryDetail.amount_raw === 'string' && primaryDetail.amount_raw.trim() !== '') {
      try {
        const humanAmount = fromBaseUnits(primaryDetail.amount_raw, primaryDetail.decimals)
        return safeNumber(humanAmount).toFixed(2)
      } catch (error) {
        console.error('Error formatting primary revenue:', error)
        return "0.00"
      }
    }

    return "0.00"
  }

  // Helper function to format daily analytics revenue
  const formatDailyRevenue = (revenueDetails: RevenueDetail[] | null): string => {
    const total = calculateTotalRevenue(revenueDetails)
    return total.toFixed(2)
  }

  // Enhanced formatCurrency function using token registry
  const formatCurrency = (amount: string | number, currency: string, network?: string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount

    // Handle undefined or null currency
    if (!currency) {
      return `${num.toFixed(6)} Unknown`
    }

    // If we have network info, try to get token info from registry
    if (network) {
      try {
        const tokenInfo = getTokenInfo(currency, network as Network)
        if (tokenInfo) {
          // Use formatTokenAmount for precise formatting
          // Since we already have human-readable amounts, pass them directly
          return formatTokenAmount(num, currency, network as Network, {
            showSymbol: true,
            precision: tokenInfo.isStablecoin ? 2 : 4,
            compact: num >= 1000
          });
        }
      } catch (error) {
        console.error('Error getting token info:', error)
        // Fall through to fallback
      }
    }

    // Fallback: check if it's a token address and show abbreviated
    if (currency.startsWith('0x') && currency.length === 42) {
      return `${num.toFixed(6)} ${currency.slice(0, 6)}...${currency.slice(-4)}`
    }

    // Simple currency display
    return `${num.toFixed(6)} ${currency}`
  }

  // Enhanced token display with verification badge
  const TokenDisplay = ({
    currency,
    network,
    amount
  }: {
    currency?: string
    network?: string
    amount?: string | number
  }) => {
    // Safety checks for required parameters
    if (!currency || !network) {
      return (
        <span className={isDark ? "text-gray-400" : "text-gray-500"}>
          {amount ? `${amount} Unknown` : 'Unknown'}
        </span>
      )
    }

    let tokenInfo = null
    try {
      tokenInfo = getTokenInfo(currency, network as Network)
    } catch (error) {
      console.error('Error getting token info in TokenDisplay:', error)
    }

    return (
      <div className="flex items-center gap-2">
        {/* Token Logo */}
        {tokenInfo?.logoUri && (
          <div className="w-5 h-5 rounded-full overflow-hidden">
            <Image
              src={tokenInfo.logoUri}
              alt={tokenInfo.symbol}
              width={20}
              height={20}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Amount and Symbol */}
        <div className="flex items-center gap-1">
          {amount && (
            <span className="font-medium">
              {formatCurrency(amount, currency, network)}
            </span>
          )}
          {!amount && tokenInfo && (
            <span className="font-medium">{tokenInfo.symbol}</span>
          )}
          {!amount && !tokenInfo && (
            <span className="font-mono text-xs">
              {currency && currency.startsWith('0x') ? `${currency.slice(0, 6)}...` : currency || 'Unknown'}
            </span>
          )}
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className={`min-h-screen transition-colors duration-200 bg-black`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-[#F5F56B]" />
              <p className={"text-white font-darker-grotesque"}>Loading server dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`min-h-screen transition-colors duration-200 ${isDark ? "bg-gradient-to-br from-black to-gray-900 text-white" : "bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900"
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className={`h-12 w-12 mx-auto mb-4 ${isDark ? "text-red-400" : "text-red-500"}`} />
              <h3 className="text-lg font-medium mb-2">Failed to load server</h3>
              <p className={`mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>{error}</p>
              <Button
                onClick={() => window.location.reload()}
                className={isDark ? "bg-gray-700 text-white hover:bg-gray-600" : ""}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!serverData) return null

  return (
    <div className={`min-h-screen transition-colors duration-200 relative py-[100px] bg-[#080808] text-white`}>
      {/* <Image src={"/register/background.png"} alt={"background"} fill className="hidden lg:block" />
      <Image src={"/register/background-mobile.png"} alt={"background"} fill className="block lg:hidden" /> */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-2">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-[32px] sm:text-3xl xl:text-[48px] font-normal font-instrument-serif text-white mb-2">{serverData.name}</h1>
              <p className={`text-2xl max-w-xl text-[#F5F56B] font-medium font-darker-grotesque`}>
                {serverData.description}
              </p>
            </div>
            {/* <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button> */}
          </div>

          {/* <div className="flex items-center gap-4 text-sm">
            <span className={isDark ? "text-gray-400" : "text-gray-500"}>
              Created: {formatDate(serverData?.createdAt ? (typeof serverData.createdAt === 'string' ? serverData.createdAt : serverData.createdAt.toISOString()) : '')}
            </span>
            <span className={isDark ? "text-gray-400" : "text-gray-500"}>
              Last Activity: {formatDate(serverData.summaryAnalytics.lastActivity || '')}
            </span>
          </div> */}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className={`grid w-full grid-cols-2 mb-6 `}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="integration">Integration</TabsTrigger>
            {/* <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="analytics">Analytics & Payments</TabsTrigger> */}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 font-darker-grotesque">
              <Card className={`bg-[rgba(255,255,255,0.04)] backdrop-blur-[10px] rounded-lg  border-none py-4 px-8`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-8">
                    <div className={`p-1.5 rounded-full w-16 h-16 bg-[#1E1E1B] flex items-center justify-center`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="24" viewBox="0 0 30 24" fill="none">
                        <path d="M16.0112 4.17594C16.0673 3.39989 16.3236 2.65163 16.7551 2.00419C17.1866 1.35676 17.7787 0.832277 18.4734 0.481948C19.1682 0.131618 19.9419 -0.0325891 20.719 0.00535493C21.4962 0.043299 22.2502 0.282098 22.9075 0.698441C22.9827 0.747612 23.0432 0.816115 23.0827 0.896755C23.1222 0.977394 23.1393 1.06719 23.1322 1.15671C23.125 1.24623 23.0938 1.33218 23.042 1.4055C22.9902 1.47883 22.9195 1.53684 22.8375 1.57344C21.6949 2.08753 20.7249 2.92056 20.0442 3.97248C19.3634 5.0244 19.0009 6.25047 19 7.50344C19 7.64969 19 7.79594 19.015 7.93969C19.0219 8.03055 19.0038 8.12156 18.9627 8.2029C18.9217 8.28424 18.8591 8.3528 18.7819 8.40119C18.7047 8.44958 18.6158 8.47594 18.5247 8.47744C18.4335 8.47894 18.3438 8.45551 18.265 8.40969C17.5283 7.98832 16.9258 7.36723 16.5271 6.6181C16.1283 5.86897 15.9495 5.02235 16.0112 4.17594ZM30 17.0797C30.0018 17.6511 29.8435 18.2116 29.543 18.6976C29.2426 19.1837 28.8119 19.5759 28.3 19.8297L28.245 19.8547L23.3913 21.9222C23.3433 21.9433 23.2935 21.9601 23.2425 21.9722L15.2425 23.9722C15.1633 23.9926 15.0818 24.0031 15 24.0034H2C1.46957 24.0034 0.960859 23.7927 0.585786 23.4177C0.210714 23.0426 0 22.5339 0 22.0034V17.0034C0 16.473 0.210714 15.9643 0.585786 15.5892C0.960859 15.2142 1.46957 15.0034 2 15.0034H5.58625L8.41375 12.1747C8.78451 11.8023 9.22539 11.507 9.71092 11.306C10.1964 11.105 10.717 11.0021 11.2425 11.0034H17.5C18.0282 11.0034 18.5496 11.1229 19.0251 11.353C19.5005 11.5831 19.9177 11.9178 20.2454 12.3321C20.5731 12.7464 20.8028 13.2295 20.9172 13.7451C21.0317 14.2608 21.0279 14.7957 20.9062 15.3097L26.1362 14.1072C26.5915 13.9866 27.0685 13.9722 27.5302 14.0651C27.992 14.1579 28.4262 14.3556 28.7995 14.6427C29.1728 14.9299 29.4752 15.299 29.6833 15.7215C29.8915 16.144 29.9998 16.6087 30 17.0797ZM28 17.0797C27.9998 16.9143 27.9616 16.7513 27.8882 16.6031C27.8148 16.4549 27.7083 16.3257 27.5769 16.2253C27.4455 16.125 27.2927 16.0562 27.1305 16.0245C26.9682 15.9927 26.8008 15.9988 26.6413 16.0422L26.6025 16.0522L18.2275 17.9784C18.154 17.9948 18.079 18.0032 18.0037 18.0034H14C13.7348 18.0034 13.4804 17.8981 13.2929 17.7105C13.1054 17.523 13 17.2687 13 17.0034C13 16.7382 13.1054 16.4839 13.2929 16.2963C13.4804 16.1088 13.7348 16.0034 14 16.0034H17.5C17.8978 16.0034 18.2794 15.8454 18.5607 15.5641C18.842 15.2828 19 14.9013 19 14.5034C19 14.1056 18.842 13.7241 18.5607 13.4428C18.2794 13.1615 17.8978 13.0034 17.5 13.0034H11.2425C10.9798 13.0026 10.7195 13.054 10.4768 13.1546C10.2341 13.2553 10.0138 13.4032 9.82875 13.5897L7 16.4172V22.0034H14.875L22.6787 20.0522L27.4287 18.0297C27.6016 17.9386 27.7463 17.8019 27.847 17.6344C27.9477 17.467 28.0006 17.2751 28 17.0797ZM21 7.50344C21 8.39346 21.2639 9.26349 21.7584 10.0035C22.2529 10.7435 22.9557 11.3203 23.7779 11.6609C24.6002 12.0015 25.505 12.0906 26.3779 11.917C27.2508 11.7433 28.0526 11.3148 28.682 10.6854C29.3113 10.0561 29.7399 9.25426 29.9135 8.38135C30.0872 7.50843 29.9981 6.60363 29.6575 5.78137C29.3169 4.9591 28.7401 4.25629 28.0001 3.76183C27.26 3.26736 26.39 3.00344 25.5 3.00344C24.3065 3.00344 23.1619 3.47755 22.318 4.32146C21.4741 5.16537 21 6.30997 21 7.50344Z" fill="white" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className={`text-[32px] font-bold text-[#F0F0F0]`}>
                        {(serverData.stats.totalUsage || 0).toLocaleString()}
                      </p>
                      <div className="text-lg font-semibold text-[#A7ACAE] mt-0.5">Requests</div>
                    </div>

                  </div>
                </CardContent>
              </Card>

              <Card className={`bg-[rgba(255,255,255,0.04)] backdrop-blur-[10px] rounded-lg  border-none py-4 px-8`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-8">
                    <div className={`p-1.5 rounded-full w-16 h-16 bg-[#1E1E1B] flex items-center justify-center`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26" fill="none">
                        <path d="M13 0C10.4288 0 7.91543 0.762437 5.77759 2.1909C3.63975 3.61935 1.97351 5.64968 0.989572 8.02512C0.0056327 10.4006 -0.251811 13.0144 0.249797 15.5362C0.751405 18.0579 1.98953 20.3743 3.80762 22.1924C5.6257 24.0105 7.94208 25.2486 10.4638 25.7502C12.9856 26.2518 15.5995 25.9944 17.9749 25.0104C20.3503 24.0265 22.3807 22.3603 23.8091 20.2224C25.2376 18.0846 26 15.5712 26 13C25.9964 9.5533 24.6256 6.24882 22.1884 3.81163C19.7512 1.37445 16.4467 0.00363977 13 0ZM15 20H14V21C14 21.2652 13.8946 21.5196 13.7071 21.7071C13.5196 21.8946 13.2652 22 13 22C12.7348 22 12.4804 21.8946 12.2929 21.7071C12.1054 21.5196 12 21.2652 12 21V20H11C9.93914 20 8.92172 19.5786 8.17158 18.8284C7.42143 18.0783 7.00001 17.0609 7.00001 16C7.00001 15.7348 7.10536 15.4804 7.2929 15.2929C7.48044 15.1054 7.73479 15 8.00001 15C8.26522 15 8.51958 15.1054 8.70711 15.2929C8.89465 15.4804 9.00001 15.7348 9.00001 16C9.00001 16.5304 9.21072 17.0391 9.58579 17.4142C9.96087 17.7893 10.4696 18 11 18H15C15.5304 18 16.0391 17.7893 16.4142 17.4142C16.7893 17.0391 17 16.5304 17 16C17 15.4696 16.7893 14.9609 16.4142 14.5858C16.0391 14.2107 15.5304 14 15 14H11.5C10.4391 14 9.42172 13.5786 8.67158 12.8284C7.92143 12.0783 7.50001 11.0609 7.50001 10C7.50001 8.93913 7.92143 7.92172 8.67158 7.17157C9.42172 6.42143 10.4391 6 11.5 6H12V5C12 4.73478 12.1054 4.48043 12.2929 4.29289C12.4804 4.10536 12.7348 4 13 4C13.2652 4 13.5196 4.10536 13.7071 4.29289C13.8946 4.48043 14 4.73478 14 5V6H14.5C15.5609 6 16.5783 6.42143 17.3284 7.17157C18.0786 7.92172 18.5 8.93913 18.5 10C18.5 10.2652 18.3946 10.5196 18.2071 10.7071C18.0196 10.8946 17.7652 11 17.5 11C17.2348 11 16.9804 10.8946 16.7929 10.7071C16.6054 10.5196 16.5 10.2652 16.5 10C16.5 9.46957 16.2893 8.96086 15.9142 8.58579C15.5391 8.21071 15.0304 8 14.5 8H11.5C10.9696 8 10.4609 8.21071 10.0858 8.58579C9.71072 8.96086 9.50001 9.46957 9.50001 10C9.50001 10.5304 9.71072 11.0391 10.0858 11.4142C10.4609 11.7893 10.9696 12 11.5 12H15C16.0609 12 17.0783 12.4214 17.8284 13.1716C18.5786 13.9217 19 14.9391 19 16C19 17.0609 18.5786 18.0783 17.8284 18.8284C17.0783 19.5786 16.0609 20 15 20Z" fill="white" />
                      </svg>
                    </div>

                    <div className="flex-1">
                      <p className={`text-[32px] font-bold text-[#F0F0F0]`}>
                        {serverData.stats.totalPayments || 0}
                      </p>
                      <div className="text-lg font-semibold text-[#A7ACAE] mt-0.5">Payments</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`bg-[rgba(255,255,255,0.04)] backdrop-blur-[10px] rounded-lg  border-none py-4 px-8`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-8">
                    <div className={`p-1.5 rounded-full w-16 h-16 bg-[#1E1E1B] flex items-center justify-center`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="31" height="22" viewBox="0 0 31 22" fill="none">
                        <path d="M13.5561 18.0934C13.6756 18.0881 13.795 18.1072 13.9069 18.1493C14.0188 18.1915 14.121 18.2559 14.2074 18.3387C14.2937 18.4215 14.3623 18.5209 14.4092 18.631C14.456 18.7411 14.48 18.8595 14.4797 18.9791C14.4795 19.0987 14.455 19.2171 14.4077 19.3269C14.3604 19.4368 14.2913 19.5359 14.2046 19.6184C14.118 19.7008 14.0155 19.7648 13.9034 19.8065C13.7913 19.8482 13.6718 19.8667 13.5524 19.8609C13.3177 19.8604 13.0929 19.7667 12.9273 19.6005C12.7618 19.4342 12.6691 19.209 12.6696 18.9743C12.6701 18.7397 12.7637 18.5149 12.93 18.3493C13.0963 18.1837 13.3215 18.091 13.5561 18.0915V18.0934ZM27.3895 12.6383C27.1557 12.6383 26.9313 12.5454 26.766 12.38C26.6006 12.2146 26.5077 11.9903 26.5077 11.7564C26.5077 11.5226 26.6006 11.2982 26.766 11.1329C26.9313 10.9675 27.1557 10.8746 27.3895 10.8746C27.6234 10.8746 27.8477 10.9675 28.0131 11.1329C28.1785 11.2982 28.2714 11.5226 28.2714 11.7564C28.2714 11.9903 28.1785 12.2146 28.0131 12.38C27.8477 12.5454 27.6234 12.6383 27.3895 12.6383ZM27.3895 9.02798C26.9572 9.0286 26.5311 9.13195 26.1465 9.3295C25.7619 9.52706 25.4297 9.81317 25.1773 10.1643C24.9249 10.5154 24.7595 10.9214 24.6948 11.3489C24.6301 11.7764 24.6679 12.2132 24.8051 12.6233L15.7943 17.4214C15.5444 17.0582 15.2099 16.7614 14.8196 16.5564C14.4293 16.3514 13.9951 16.2445 13.5543 16.2449C12.5152 16.2449 11.5684 16.8416 11.1072 17.7715L3.01308 13.5023C2.15661 13.0524 1.51661 11.6444 1.58437 10.3626C1.62014 9.69433 1.85167 9.1748 2.20367 8.97339C2.42767 8.84727 2.69496 8.85856 2.98108 9.00727L3.03379 9.03551C5.17967 10.1649 12.2008 13.8637 12.4964 14.0012C12.9519 14.212 13.206 14.2986 13.9834 13.9296L28.4964 6.38139C28.7091 6.30233 28.9576 6.09715 28.9576 5.78656C28.9576 5.35739 28.5133 5.18798 28.5114 5.18798C27.6851 4.79268 26.4164 4.19974 25.1797 3.61998C22.535 2.38139 19.5364 0.979035 18.2206 0.288212C17.8821 0.097985 17.5001 -0.00130656 17.1119 1.29823e-05C16.7236 0.00133252 16.3423 0.103218 16.0051 0.295741L15.6888 0.451976C9.7632 3.3828 1.83285 7.31315 1.38108 7.58609C0.573551 8.07739 0.072845 9.05809 0.00696267 10.2741C-0.092802 12.2016 0.889786 14.2139 2.2959 14.9499L10.8568 19.3659C10.9302 19.8642 11.14 20.3325 11.463 20.719C11.786 21.1054 12.2097 21.395 12.6871 21.5556C13.1645 21.7161 13.6771 21.7415 14.168 21.6287C14.6589 21.516 15.109 21.2697 15.4686 20.9169C15.9768 20.4143 16.2705 19.731 16.2818 19.0157L25.7124 13.9052C26.2593 14.335 26.9498 14.5395 27.6426 14.4767C28.3354 14.414 28.9779 14.0887 29.4387 13.5676C29.8994 13.0464 30.1435 12.3688 30.1209 11.6736C30.0983 10.9784 29.8107 10.3181 29.3171 9.82798C28.8059 9.3165 28.1127 9.02878 27.3895 9.02798Z" fill="white" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-[32px] font-bold text-[#F0F0F0]">{serverData.summaryAnalytics.totalTools || 0}</div>
                      <p className={`text-lg font-semibold text-[#A7ACAE] mt-0.5`}>
                        Tools
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`bg-[rgba(255,255,255,0.04)] backdrop-blur-[10px] rounded-lg  border-none py-4 px-8`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-8">
                    <div className={`p-1.5 rounded-full w-16 h-16 bg-[#1E1E1B] flex items-center justify-center`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="24" viewBox="0 0 30 24" fill="none">
                        <path d="M16.0112 4.17594C16.0673 3.39989 16.3236 2.65163 16.7551 2.00419C17.1866 1.35676 17.7787 0.832277 18.4734 0.481948C19.1682 0.131618 19.9419 -0.0325891 20.719 0.00535493C21.4962 0.043299 22.2502 0.282098 22.9075 0.698441C22.9827 0.747612 23.0432 0.816115 23.0827 0.896755C23.1222 0.977394 23.1393 1.06719 23.1322 1.15671C23.125 1.24623 23.0938 1.33218 23.042 1.4055C22.9902 1.47883 22.9195 1.53684 22.8375 1.57344C21.6949 2.08753 20.7249 2.92056 20.0442 3.97248C19.3634 5.0244 19.0009 6.25047 19 7.50344C19 7.64969 19 7.79594 19.015 7.93969C19.0219 8.03055 19.0038 8.12156 18.9627 8.2029C18.9217 8.28424 18.8591 8.3528 18.7819 8.40119C18.7047 8.44958 18.6158 8.47594 18.5247 8.47744C18.4335 8.47894 18.3438 8.45551 18.265 8.40969C17.5283 7.98832 16.9258 7.36723 16.5271 6.6181C16.1283 5.86897 15.9495 5.02235 16.0112 4.17594ZM30 17.0797C30.0018 17.6511 29.8435 18.2116 29.543 18.6976C29.2426 19.1837 28.8119 19.5759 28.3 19.8297L28.245 19.8547L23.3913 21.9222C23.3433 21.9433 23.2935 21.9601 23.2425 21.9722L15.2425 23.9722C15.1633 23.9926 15.0818 24.0031 15 24.0034H2C1.46957 24.0034 0.960859 23.7927 0.585786 23.4177C0.210714 23.0426 0 22.5339 0 22.0034V17.0034C0 16.473 0.210714 15.9643 0.585786 15.5892C0.960859 15.2142 1.46957 15.0034 2 15.0034H5.58625L8.41375 12.1747C8.78451 11.8023 9.22539 11.507 9.71092 11.306C10.1964 11.105 10.717 11.0021 11.2425 11.0034H17.5C18.0282 11.0034 18.5496 11.1229 19.0251 11.353C19.5005 11.5831 19.9177 11.9178 20.2454 12.3321C20.5731 12.7464 20.8028 13.2295 20.9172 13.7451C21.0317 14.2608 21.0279 14.7957 20.9062 15.3097L26.1362 14.1072C26.5915 13.9866 27.0685 13.9722 27.5302 14.0651C27.992 14.1579 28.4262 14.3556 28.7995 14.6427C29.1728 14.9299 29.4752 15.299 29.6833 15.7215C29.8915 16.144 29.9998 16.6087 30 17.0797ZM28 17.0797C27.9998 16.9143 27.9616 16.7513 27.8882 16.6031C27.8148 16.4549 27.7083 16.3257 27.5769 16.2253C27.4455 16.125 27.2927 16.0562 27.1305 16.0245C26.9682 15.9927 26.8008 15.9988 26.6413 16.0422L26.6025 16.0522L18.2275 17.9784C18.154 17.9948 18.079 18.0032 18.0037 18.0034H14C13.7348 18.0034 13.4804 17.8981 13.2929 17.7105C13.1054 17.523 13 17.2687 13 17.0034C13 16.7382 13.1054 16.4839 13.2929 16.2963C13.4804 16.1088 13.7348 16.0034 14 16.0034H17.5C17.8978 16.0034 18.2794 15.8454 18.5607 15.5641C18.842 15.2828 19 14.9013 19 14.5034C19 14.1056 18.842 13.7241 18.5607 13.4428C18.2794 13.1615 17.8978 13.0034 17.5 13.0034H11.2425C10.9798 13.0026 10.7195 13.054 10.4768 13.1546C10.2341 13.2553 10.0138 13.4032 9.82875 13.5897L7 16.4172V22.0034H14.875L22.6787 20.0522L27.4287 18.0297C27.6016 17.9386 27.7463 17.8019 27.847 17.6344C27.9477 17.467 28.0006 17.2751 28 17.0797ZM21 7.50344C21 8.39346 21.2639 9.26349 21.7584 10.0035C22.2529 10.7435 22.9557 11.3203 23.7779 11.6609C24.6002 12.0015 25.505 12.0906 26.3779 11.917C27.2508 11.7433 28.0526 11.3148 28.682 10.6854C29.3113 10.0561 29.7399 9.25426 29.9135 8.38135C30.0872 7.50843 29.9981 6.60363 29.6575 5.78137C29.3169 4.9591 28.7401 4.25629 28.0001 3.76183C27.26 3.26736 26.39 3.00344 25.5 3.00344C24.3065 3.00344 23.1619 3.47755 22.318 4.32146C21.4741 5.16537 21 6.30997 21 7.50344Z" fill="white" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className={`text-[32px] font-bold text-[#F0F0F0]`}>
                        {(serverData.stats.totalUniqueUsers || 0).toLocaleString()}
                      </p>
                      <div className="text-lg font-semibold text-[#A7ACAE] mt-0.5">Unique Users</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* main content */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8  mt-8">
              <div className="xl:col-span-2">
                {/* Tools */}
                <Card className={`py-4 border border-[rgba(245,245,107,0.10)] font-darker-grotesque bg-[#080805]`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-[32px] font-bold text-white">
                          Tools ({serverData.summaryAnalytics.totalTools})
                        </CardTitle>
                      </div>
                      {/* <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAllPricing(!showAllPricing)}
                      className={`text-g font-bold text-black`}
                    >
                      {showAllPricing ? 'Hide' : 'Show'} All Pricing
                    </Button> */}
                    </div>
                  </CardHeader>

                  <CardContent>
                    {(serverData.tools || []).map((tool) => (
                      <div key={tool.id} className="mb-3 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 p-4 rounded-lg bg-[rgba(245,245,107,0.04)] backdrop-blur-[20px] border border-[rgba(255,255,255,0.04)]">
                        <div className="w-[200px]">
                          <div className=" text-white text-lg font-semibold">{tool.name}</div>
                          <div className={`text-white text-lg font-semibold truncate`}>
                            {tool.description.length > 60 ? `${tool.description.substring(0, 60)}...` : tool.description}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="bg-[#2B2B13] rounded text-lg text-[#F5F56B] font-semibold py-2 px-3">
                            {(() => {
                              const activePricing = getActivePricing(tool.pricing as PricingEntry[])
                              if (activePricing.length > 0) {
                                // Get unique prices and show them compactly
                                const uniquePrices = [...new Set(activePricing.map(p =>
                                  p?.maxAmountRequiredRaw && typeof p.maxAmountRequiredRaw === 'string' && p.maxAmountRequiredRaw.trim() !== ''
                                    ? fromBaseUnits(p.maxAmountRequiredRaw, p.tokenDecimals || 0)
                                    : '0'
                                ))]

                                return (
                                  <div className="text-sm font-medium">
                                    {uniquePrices.length === 1 ? (
                                      <span>{formatCurrency(uniquePrices[0], activePricing[0]?.assetAddress || '', activePricing[0]?.network)}</span>
                                    ) : (
                                      <div className="space-y-0.5">
                                        {uniquePrices.slice(0, 3).map((price, index) => (
                                          <div key={index} className="text-xs">
                                            {formatCurrency(price, activePricing.find(p =>
                                              fromBaseUnits(p.maxAmountRequiredRaw || '0', p.tokenDecimals || 0) === price
                                            )?.assetAddress || '', activePricing[0]?.network)}
                                          </div>
                                        ))}
                                        {uniquePrices.length > 3 && (
                                          <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                            +{uniquePrices.length - 3} more
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              } else {
                                return (
                                  <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                    Free
                                  </div>
                                )
                              }
                            })()}
                          </div>

                          <div>
                            <Button
                              variant={null}
                              size="sm"
                              onClick={() => handleToolExecution(tool)}
                              className={`bg-[#F5F56B] px-4 py-2 text-[#2B2B13] text-base font-bold`}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Try
                            </Button>
                          </div>
                        </div>

                        {/* <div>
                          <TooltipProvider>
                            {(() => {
                              const activePricing = getActivePricing(tool.pricing as PricingEntry[])
                              const isPaid = activePricing.length > 0

                              if (isPaid && activePricing[0]) {
                                return (
                                  <Tooltip
                                    open={openTooltips[tool.id] || false}
                                    onOpenChange={(open) => handleTooltipOpenChange(tool.id, open)}
                                  >
                                    <TooltipTrigger asChild>
                                      <Badge
                                        variant="secondary"
                                        className={`text-xs cursor-pointer select-none ${isDark ? "bg-gray-600 text-gray-200 hover:bg-gray-500" : "hover:bg-gray-200"}`}
                                        onClick={(e) => toggleTooltip(tool.id, e)}
                                      >
                                        Paid
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="right"
                                      className={`max-w-xs p-3 ${isDark
                                        ? "bg-gray-800 border-gray-700 text-gray-100"
                                        : "bg-white border-gray-200 text-gray-900"
                                        }`}
                                    >
                                      <div className="space-y-2">
                                        <div className={`text-xs font-medium ${isDark ? "text-gray-300" : "text-gray-600"
                                          }`}>
                                          {activePricing.length === 1 ? 'Pricing' : `Pricing (${activePricing.length} options)`}
                                        </div>
                                        <div className="space-y-1.5">
                                          {activePricing.map((pricing, index) => (
                                            <div
                                              key={index}
                                              className={`flex items-center justify-between py-1.5 px-2 rounded ${isDark ? "bg-gray-700/50" : "bg-gray-50"
                                                }`}
                                            >
                                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <TokenDisplay
                                                  currency={pricing?.assetAddress}
                                                  network={pricing?.network}
                                                  amount={pricing?.maxAmountRequiredRaw && typeof pricing.maxAmountRequiredRaw === 'string' && pricing.maxAmountRequiredRaw.trim() !== ''
                                                    ? fromBaseUnits(pricing.maxAmountRequiredRaw, pricing.tokenDecimals || 0)
                                                    : '0'}
                                                />
                                              </div>
                                              <Badge
                                                variant="outline"
                                                className={`text-xs ml-2 shrink-0 ${isDark
                                                  ? "border-gray-600 text-gray-300 bg-gray-800"
                                                  : "border-gray-300 text-gray-600 bg-white"
                                                  }`}
                                              >
                                                {pricing.network}
                                              </Badge>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                )
                              } else {
                                return (
                                  <Badge variant="outline" className={`text-xs ${isDark ? "border-gray-500 text-gray-300" : ""}`}>
                                    Free
                                  </Badge>
                                )
                              }
                            })()}
                          </TooltipProvider>
                        </div>

                        <div className="text-sm">
                          <div>{tool.totalUsage || 0} uses</div>
                          <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            {tool.totalPayments || 0} payments
                          </div>
                        </div>

                        <div>
                          {(tool.totalProofs || 0) > 0 ? (
                            <div className="flex items-center justify-end gap-2 text-xs">
                              <div className={`flex items-center gap-1 ${(tool.consistentProofs || 0) > 0 ? "text-green-500" : "text-red-500"
                                }`}>
                                {(tool.consistentProofs || 0) > 0 ? (
                                  <CheckCircle className="h-3 w-3" />
                                ) : (
                                  <XCircle className="h-3 w-3" />
                                )}
                                <span>
                                  {tool.consistentProofs || 0}/{tool.totalProofs || 0}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                              No proofs
                            </span>
                          )}
                        </div>

                        <div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToolExecution(tool)}
                            className={`text-xs ${isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : ""}`}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Try
                          </Button>
                        </div> */}

                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
              <div>
                {/* Server Connection */}
                <Card className={`bg-[#15150B] rounded-[12px] border-none font-darker-grotesque py-4 px-8`}>

                  <h5 className="text-2xl font-bold text-white pb-4 border-b border-b-[rgba(245,245,107,0.10)]">Connection</h5>
                  <CardContent className="px-0">
                    {/* MCP Connection URL */}
                    <div>
                      <label className={`text-xl font-medium block mb-2 text-white/80`}>
                        Get connection URL
                      </label>
                      <div className="flex items-center gap-3 py-3 px-4 bg-[rgba(245,245,107,0.10)] rounded-lg">
                        <code className={`text-[#FAFABB] text-lg font-semibold grow truncate`}>
                          {urlUtils.getMcpUrl(serverData.serverId)}
                        </code>
                        <Button
                          variant={null}
                          size="sm"
                          onClick={() => {
                            copyToClipboard(urlUtils.getMcpUrl(serverData.serverId))
                            toast.success("MCP URL copied to clipboard")
                          }}
                          className="w-10 h-10 bg-[rgba(245,245,107,0.10)] rounded flex items-center justify-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M16.875 2.5H6.875C6.70924 2.5 6.55027 2.56585 6.43306 2.68306C6.31585 2.80027 6.25 2.95924 6.25 3.125V6.25H3.125C2.95924 6.25 2.80027 6.31585 2.68306 6.43306C2.56585 6.55027 2.5 6.70924 2.5 6.875V16.875C2.5 17.0408 2.56585 17.1997 2.68306 17.3169C2.80027 17.4342 2.95924 17.5 3.125 17.5H13.125C13.2908 17.5 13.4497 17.4342 13.5669 17.3169C13.6842 17.1997 13.75 17.0408 13.75 16.875V13.75H16.875C17.0408 13.75 17.1997 13.6842 17.3169 13.5669C17.4342 13.4497 17.5 13.2908 17.5 13.125V3.125C17.5 2.95924 17.4342 2.80027 17.3169 2.68306C17.1997 2.56585 17.0408 2.5 16.875 2.5ZM16.25 12.5H13.75V6.875C13.75 6.70924 13.6842 6.55027 13.5669 6.43306C13.4497 6.31585 13.2908 6.25 13.125 6.25H7.5V3.75H16.25V12.5Z" fill="#F5F56B" />
                          </svg>
                        </Button>

                      </div>
                    </div>

                    {/* Payment Address */}
                    {/* <div>
                    <label className={`text-sm font-medium block mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Payment Address
                    </label>
                    <div className="flex items-start gap-2">
                      <code className={`flex-1 text-sm p-3 rounded-md font-mono break-all overflow-hidden ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-800"}`}>
                        {serverData.receiverAddress}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          copyToClipboard(serverData.receiverAddress)
                          toast.success("Address copied to clipboard")
                        }}
                        title="Copy address"
                        className="shrink-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div> */}

                    {/* Owner & Server ID */}
                    {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className={`text-sm font-medium block mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        Server Owner
                      </label>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? "bg-gray-700" : "bg-gray-100"
                          }`}>
                          {serverData.creator?.avatarUrl || serverData.creator?.image ? (
                            <Image
                              src={serverData.creator?.avatarUrl || serverData.creator?.image || ''}
                              alt={serverData.creator.displayName || serverData.creator.name || ''}
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <Users className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{serverData.creator?.displayName || serverData.creator?.name || ''}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className={`text-sm font-medium block mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        Server ID
                      </label>
                      <code className={`text-sm font-mono block p-3 rounded-md break-all overflow-hidden ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-800"
                        }`}>
                        {serverData.serverId}
                      </code>
                    </div>
                  </div> */}
                  </CardContent>
                </Card>
              </div>

              {/* Recent Payments */}
              <Card className={`xl:col-span-3 py-4 border border-[rgba(245,245,107,0.10)] font-darker-grotesque bg-[#080805] mt-8`}>
                <CardHeader className="border-b border-b-[rgba(245,245,107,0.10)] flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-[32px] font-bold text-white">
                      Recent Payments {`(${serverData.stats.recentPayments})`}
                    </CardTitle>
                    <CardDescription className="text-[rgba(255,255,255,0.80)] text-xl font-medium">
                      Latest payment transactions from tool usage with verified token information <br />
                      <span className="text-[#FAFABB] text-lg font-semibold bg-[rgba(245,245,107,0.10)] px-4 py-1.5 rounded-full mt-2 flex items-center justify-center w-fit">Auto-refresh every 10s</span>
                    </CardDescription>
                  </div>
                  <figure onClick={reFetchServerData} className={`${refetchPayment ? "animate-spin" : ""} cursor-pointer`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M8.25 10.125H3.75C3.45163 10.125 3.16548 10.0065 2.9545 9.79553C2.74353 9.58455 2.625 9.29841 2.625 9.00004V4.50004C2.625 4.20167 2.74353 3.91552 2.9545 3.70454C3.16548 3.49356 3.45163 3.37504 3.75 3.37504C4.04837 3.37504 4.33452 3.49356 4.5455 3.70454C4.75647 3.91552 4.875 4.20167 4.875 4.50004V6.28129L5.60625 5.55004C7.34974 3.79956 9.71689 2.8129 12.1875 2.80691H12.24C14.6894 2.80097 17.0426 3.75984 18.7903 5.47597C18.8959 5.57927 18.9802 5.70235 19.0383 5.83821C19.0963 5.97406 19.1271 6.12002 19.1287 6.26775C19.1304 6.41549 19.1029 6.5621 19.0479 6.69922C18.9929 6.83634 18.9114 6.96128 18.8081 7.06691C18.7048 7.17254 18.5817 7.2568 18.4459 7.31486C18.31 7.37292 18.1641 7.40366 18.0163 7.40531C17.8686 7.40697 17.722 7.37951 17.5849 7.3245C17.4478 7.26949 17.3228 7.18802 17.2172 7.08472C15.8757 5.77463 14.072 5.04612 12.1969 5.05717C10.3219 5.06823 8.52683 5.81796 7.20094 7.14379L6.46875 7.87504H8.25C8.54837 7.87504 8.83452 7.99356 9.0455 8.20454C9.25647 8.41552 9.375 8.70167 9.375 9.00004C9.375 9.29841 9.25647 9.58455 9.0455 9.79553C8.83452 10.0065 8.54837 10.125 8.25 10.125ZM20.25 13.875H15.75C15.4516 13.875 15.1655 13.9936 14.9545 14.2045C14.7435 14.4155 14.625 14.7017 14.625 15C14.625 15.2984 14.7435 15.5846 14.9545 15.7955C15.1655 16.0065 15.4516 16.125 15.75 16.125H17.5312L16.8 16.8563C15.4761 18.1868 13.6782 18.9373 11.8012 18.9432H11.7609C9.89978 18.948 8.11163 18.2194 6.78375 16.9153C6.57042 16.7067 6.28295 16.5914 5.98459 16.5948C5.68623 16.5981 5.40142 16.7198 5.19281 16.9332C4.9842 17.1465 4.86888 17.434 4.87222 17.7323C4.87557 18.0307 4.99729 18.3155 5.21063 18.5241C6.95833 20.2402 9.31154 21.1991 11.7609 21.1932H11.8125C14.2822 21.1854 16.6479 20.1978 18.39 18.4472L19.125 17.7188V19.5C19.125 19.7984 19.2435 20.0846 19.4545 20.2955C19.6655 20.5065 19.9516 20.625 20.25 20.625C20.5484 20.625 20.8345 20.5065 21.0455 20.2955C21.2565 20.0846 21.375 19.7984 21.375 19.5V15C21.375 14.7017 21.2565 14.4155 21.0455 14.2045C20.8345 13.9936 20.5484 13.875 20.25 13.875Z" fill="white" />
                    </svg>
                  </figure>
                </CardHeader>

                <CardContent>
                  <div className="rounded-md">
                    <Table>
                      <TableHeader >
                        <TableRow className="">
                          <TableHead className="w-[60px]">Status</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Network</TableHead>
                          <TableHead className="text-right">Transaction</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(serverData.tools || [])
                          .flatMap(tool => (tool.payments || []))
                          .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
                          .slice(0, 10).map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell className="w-[60px]">
                                <div className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center ${payment.status === 'completed'
                                  ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                                  : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400'
                                  }`}>
                                  {payment.status === 'completed' ? (
                                    <CheckCircle className="h-3 w-3" />
                                  ) : (
                                    <Clock className="h-3 w-3" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">
                                <TokenDisplay
                                  currency={payment?.currency}
                                  network={payment?.network}
                                  amount={payment?.amountRaw && typeof payment.amountRaw === 'string' && payment.amountRaw.trim() !== ''
                                    ? fromBaseUnits(payment.amountRaw, payment.tokenDecimals || 0)
                                    : '0'}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">{formatDate(payment.createdAt ? (typeof payment.createdAt === 'string' ? payment.createdAt : payment.createdAt.toISOString()) : '')}</div>
                                {/* {payment.settledAt && (
                              <div className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                Settled: {formatDate(typeof payment.settledAt === 'string' ? payment.settledAt : payment.settledAt.toISOString())}
                              </div>
                            )} */}
                              </TableCell>
                              <TableCell>
                                {payment?.network ? (
                                  <>
                                    <Badge variant={null} className="w-fit mb-1 bg-[rgba(0,97,255,0.12)] rounded border-none py-1 px-4 text-[#4C81DB] text-base font-bold">
                                      {payment.network}
                                    </Badge>
                                    {/* <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                  {getExplorerName(payment.network as Network)}
                                </div> */}
                                  </>
                                ) : (
                                  <span className={`text-[#4C81DB] text-base font-bold`}>
                                    Unknown network
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {payment?.transactionHash && payment?.network ? (
                                  <TransactionLink
                                    txHash={payment.transactionHash}
                                    network={payment.network as Network}
                                    variant="view"
                                    showCopyButton={true}
                                    className="text-xs"
                                  />
                                ) : (
                                  <span className={`text-[#F5F56B] text-base font-bold`}>
                                    {payment?.transactionHash ? 'Unknown network' : 'Pending'}
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>


          {/* Integration Tab */}
          <TabsContent value="integration" className="space-y-6">
            <IntegrationTab serverData={serverData} onTabChange={handleTabChange} />
          </TabsContent>

          {/* Tools Tab */}
          {/* <TabsContent value="tools" className="space-y-6">
            <Card className={`${isDark ? "bg-gray-800 border-gray-700" : ""}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Wrench className="h-5 w-5" />
                      Tools ({serverData.summaryAnalytics.totalTools})
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {serverData.summaryAnalytics.monetizedTools || 0} monetized • {(serverData.summaryAnalytics.totalTools || 0) - (serverData.summaryAnalytics.monetizedTools || 0)} free • Hover or click &quot;Paid&quot; badges to see pricing details
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllPricing(!showAllPricing)}
                    className={`${isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : ""}`}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    {showAllPricing ? 'Hide' : 'Show'} All Pricing
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Tool</TableHead>
                        <TableHead>Type</TableHead>
                        {showAllPricing && <TableHead>Pricing Details</TableHead>}
                        <TableHead>Usage</TableHead>
                        <TableHead className="text-right">Verification</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(serverData.tools || []).map((tool) => (
                        <TableRow key={tool.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="font-medium text-sm">{tool.name}</div>
                              <div className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                {tool.description.length > 60 ? `${tool.description.substring(0, 60)}...` : tool.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              {(() => {
                                const activePricing = getActivePricing(tool.pricing as PricingEntry[])
                                const isPaid = activePricing.length > 0

                                if (isPaid && activePricing[0]) {
                                  return (
                                    <Tooltip
                                      open={openTooltips[tool.id] || false}
                                      onOpenChange={(open) => handleTooltipOpenChange(tool.id, open)}
                                    >
                                      <TooltipTrigger asChild>
                                        <Badge
                                          variant="secondary"
                                          className={`text-xs cursor-pointer select-none ${isDark ? "bg-gray-600 text-gray-200 hover:bg-gray-500" : "hover:bg-gray-200"}`}
                                          onClick={(e) => toggleTooltip(tool.id, e)}
                                        >
                                          Paid
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="right"
                                        className={`max-w-xs p-3 ${isDark
                                          ? "bg-gray-800 border-gray-700 text-gray-100"
                                          : "bg-white border-gray-200 text-gray-900"
                                          }`}
                                      >
                                        <div className="space-y-2">
                                          <div className={`text-xs font-medium ${isDark ? "text-gray-300" : "text-gray-600"
                                            }`}>
                                            {activePricing.length === 1 ? 'Pricing' : `Pricing (${activePricing.length} options)`}
                                          </div>
                                          <div className="space-y-1.5">
                                            {activePricing.map((pricing, index) => (
                                              <div
                                                key={index}
                                                className={`flex items-center justify-between py-1.5 px-2 rounded ${isDark ? "bg-gray-700/50" : "bg-gray-50"
                                                  }`}
                                              >
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                  <TokenDisplay
                                                    currency={pricing?.assetAddress}
                                                    network={pricing?.network}
                                                    amount={pricing?.maxAmountRequiredRaw && typeof pricing.maxAmountRequiredRaw === 'string' && pricing.maxAmountRequiredRaw.trim() !== ''
                                                      ? fromBaseUnits(pricing.maxAmountRequiredRaw, pricing.tokenDecimals || 0)
                                                      : '0'}
                                                  />
                                                </div>
                                                <Badge
                                                  variant="outline"
                                                  className={`text-xs ml-2 shrink-0 ${isDark
                                                    ? "border-gray-600 text-gray-300 bg-gray-800"
                                                    : "border-gray-300 text-gray-600 bg-white"
                                                    }`}
                                                >
                                                  {pricing.network}
                                                </Badge>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  )
                                } else {
                                  return (
                                    <Badge variant="outline" className={`text-xs ${isDark ? "border-gray-500 text-gray-300" : ""}`}>
                                      Free
                                    </Badge>
                                  )
                                }
                              })()}
                            </TooltipProvider>
                          </TableCell>
                          {showAllPricing && (
                            <TableCell className="w-[120px]">
                              {(() => {
                                const activePricing = getActivePricing(tool.pricing as PricingEntry[])
                                if (activePricing.length > 0) {
                                  // Get unique prices and show them compactly
                                  const uniquePrices = [...new Set(activePricing.map(p =>
                                    p?.maxAmountRequiredRaw && typeof p.maxAmountRequiredRaw === 'string' && p.maxAmountRequiredRaw.trim() !== ''
                                      ? fromBaseUnits(p.maxAmountRequiredRaw, p.tokenDecimals || 0)
                                      : '0'
                                  ))]

                                  return (
                                    <div className="text-sm font-medium">
                                      {uniquePrices.length === 1 ? (
                                        <span>{formatCurrency(uniquePrices[0], activePricing[0]?.assetAddress || '', activePricing[0]?.network)}</span>
                                      ) : (
                                        <div className="space-y-0.5">
                                          {uniquePrices.slice(0, 3).map((price, index) => (
                                            <div key={index} className="text-xs">
                                              {formatCurrency(price, activePricing.find(p =>
                                                fromBaseUnits(p.maxAmountRequiredRaw || '0', p.tokenDecimals || 0) === price
                                              )?.assetAddress || '', activePricing[0]?.network)}
                                            </div>
                                          ))}
                                          {uniquePrices.length > 3 && (
                                            <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                              +{uniquePrices.length - 3} more
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )
                                } else {
                                  return (
                                    <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                      Free
                                    </div>
                                  )
                                }
                              })()}
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="text-sm">
                              <div>{tool.totalUsage || 0} uses</div>
                              <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                {tool.totalPayments || 0} payments
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {(tool.totalProofs || 0) > 0 ? (
                              <div className="flex items-center justify-end gap-2 text-xs">
                                <div className={`flex items-center gap-1 ${(tool.consistentProofs || 0) > 0 ? "text-green-500" : "text-red-500"
                                  }`}>
                                  {(tool.consistentProofs || 0) > 0 ? (
                                    <CheckCircle className="h-3 w-3" />
                                  ) : (
                                    <XCircle className="h-3 w-3" />
                                  )}
                                  <span>
                                    {tool.consistentProofs || 0}/{tool.totalProofs || 0}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                No proofs
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToolExecution(tool)}
                              className={`text-xs ${isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : ""}`}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Try
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent> */}

          {/* Analytics & Payments Tab */}
          {/* <TabsContent value="analytics" className="space-y-6">
            
            <AnalyticsChart
              dailyAnalytics={serverData.dailyAnalytics || []}
              isDark={isDark}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
                <CardHeader>
                  <CardTitle className="flex justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Recent Proofs
                    </div>
                    <div>
                      <Badge variant="outline" className={`ml-6 text-xs ${isDark ? "border-gray-500 text-gray-300" : ""}`}>
                        Powered by <a href="https://www.vlayer.xyz/" target="_blank" rel="noopener noreferrer" className="inline-block ml-1 hover:opacity-80 transition-opacity">
                          <Image src="/vlayer-logo.svg" alt="vLayer" width={60} height={20} className="inline" />
                        </a>
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(serverData.proofs || []).length > 0 ? (
                      (serverData.proofs || []).slice(0, 5).map((proof) => (
                        <div key={proof.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {proof.isConsistent ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{proof.tool.name}</p>
                              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                <button
                                  onClick={() => openExplorer(proof.user?.walletAddress || '', 'base-sepolia')}
                                  className={`hover:underline ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
                                  title={`View address on ${getExplorerName('base-sepolia')}`}
                                >
                                  {proof.user?.displayName || proof.user?.walletAddress || ''}
                                </button>
                                {" • "}
                                {formatDate(typeof proof.createdAt === 'string' ? proof.createdAt : proof.createdAt.toISOString())}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {(safeNumber(proof.confidenceScore) * 100).toFixed(1)}%
                            </p>
                            {proof.webProofPresentation && (
                              <Badge variant="outline" className={`text-xs ${isDark ? "border-gray-500 text-gray-300" : ""}`}>
                                Web Proof
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={`text-center py-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No proofs yet</p>
                        <p className="text-xs mt-1">Proofs will appear here when users verify this server&apos;s tools</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent> */}


        </Tabs>

        {/* Tool Execution Modal */}
        {serverData && (
          <ToolExecutionModal
            isOpen={showToolModal}
            onClose={() => {
              setShowToolModal(false)
              setSelectedTool(null)
            }}
            tool={selectedTool}
            serverId={serverData.serverId}
          />
        )}
      </div>
    </div>
  )
}