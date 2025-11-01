"use client"

import { ConnectButton } from "@/components/custom-ui/connect-button"
import { useTheme } from "@/components/providers/theme-context"
import { useUser, useUserWallets, useWalletBalances } from "@/components/providers/user"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogHeader
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader
} from "@/components/ui/drawer"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { signIn, signOut, useSession } from "@/lib/client/auth"
import { openExplorer } from "@/lib/client/blockscout"
import { api } from "@/lib/client/utils"
import { ApiKey } from "@/types/mcp"
import { AccountModalProps, BalancesByChain, ChainBalance } from "@/types/ui"
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Code,
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  Github,
  Loader2,
  LogOut,
  Plus,
  Settings,
  Star,
  Trash2,
  TrendingUp,
  User,
  Wallet
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useAccount, useDisconnect } from "wagmi"

export function AccountModal({ isOpen, onClose, defaultTab = 'wallets' }: AccountModalProps) {
  const { isDark } = useTheme()
  const { data: session, isPending: sessionLoading } = useSession()
  const { address: connectedWallet, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  // Use the UserProvider for wallet data and actions
  const {
    addWallet,
    setPrimaryWallet,
    removeWallet
  } = useUser()
  const userWallets = useUserWallets()
  const {
    mainnet: mainnetBalancesByChain,
    testnet: testnetBalancesByChain,
    totalMainnet: totalFiatValue,
    totalTestnet: testnetTotalFiatValue,
    summary: balanceSummary
  } = useWalletBalances()

  const [activeTab, setActiveTab] = useState(defaultTab)
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState<string>("")
  const [isMobile, setIsMobile] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // State for Developer tab
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoadingApiKeys, setIsLoadingApiKeys] = useState(false)
  const [newApiKeyPermissions, setNewApiKeyPermissions] = useState<string[]>(['read', 'write', 'execute'])
  const [showNewApiKeyForm, setShowNewApiKeyForm] = useState(false)
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null)

  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])



  const handleGitHubSignIn = async () => {
    setIsAuthenticating(true)
    setIsLoading(true)
    setError("")

    try {
      await signIn.social({
        provider: "github",
        callbackURL: window.location.href
      })
      // Keep loading state active - it will be cleared when session loads
      // Don't set isLoading to false here as we want to show loading during redirect
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to sign in with GitHub")
      setIsAuthenticating(false)
      setIsLoading(false)
    }
  }

  // Clear authenticating state when session is loaded or on session loading completion
  useEffect(() => {
    if (session?.user && isAuthenticating) {
      setIsAuthenticating(false)
      setIsLoading(false)
    }
    // Also clear if session loading completes without a user (error case)
    if (!sessionLoading && isAuthenticating && !session?.user) {
      setIsAuthenticating(false)
      setIsLoading(false)
    }
  }, [session, sessionLoading, isAuthenticating])

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await signOut()
      if (isConnected) {
        disconnect()
      }
      // Provider will automatically handle clearing wallet data on sign out
    } catch (error) {
      console.error('Failed to sign out:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectWallet = async () => {
    if (!session?.user?.id || !connectedWallet) return

    setIsLoading(true)
    try {
      await addWallet({
        walletAddress: connectedWallet,
        blockchain: 'ethereum',
        walletType: 'external',
        provider: 'metamask',
        isPrimary: userWallets.length === 0,
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to connect wallet")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetPrimaryWallet = async (walletId: string) => {
    if (!session?.user?.id) return

    setIsLoading(true)
    try {
      await setPrimaryWallet(walletId)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to set primary wallet")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveWallet = async (walletId: string, isPrimary: boolean) => {
    if (!session?.user?.id) return

    // Confirm removal, especially for primary wallets
    const confirmMessage = isPrimary
      ? "Are you sure you want to remove your primary wallet? This will affect your account access."
      : "Are you sure you want to remove this wallet?"

    if (!confirm(confirmMessage)) return

    setIsLoading(true)
    try {
      await removeWallet(walletId)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to remove wallet")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBuyCrypto = async () => {
    if (!session?.user?.id) return

    setIsLoading(true)
    try {
      const response = await api.createOnrampUrl(session.user.id, {
        redirectUrl: window.location.href,
        network: "base",
        amount: 5,
        asset: 'USDC',
        currency: 'USD',
      })
      if (response && typeof response === 'object' && 'onrampUrl' in response && response.onrampUrl) {
        const onrampUrl = response.onrampUrl as string
        // Open Coinbase Onramp in a new window
        window.open(onrampUrl, '_blank')
        toast.success("Redirecting to Coinbase to buy crypto...")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create buy crypto URL")
      toast.error("Failed to open buy crypto flow")
    } finally {
      setIsLoading(false)
    }
  }

  // API Key Management Functions
  const loadApiKeys = async () => {
    if (!session?.user?.id) return

    setIsLoadingApiKeys(true)
    try {
      const keys = await api.getUserApiKeys(session.user.id)
      setApiKeys(keys as ApiKey[])
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load API keys")
    } finally {
      setIsLoadingApiKeys(false)
    }
  }

  // Generate random API key name
  const generateApiKeyName = () => {
    const adjectives = ['Swift', 'Clever', 'Bright', 'Quick', 'Smart', 'Fast', 'Smooth', 'Sharp', 'Bold', 'Cool']
    const nouns = ['Key', 'Access', 'Token', 'Gate', 'Bridge', 'Link', 'Port', 'Pass', 'Code', 'Lock']
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    const number = Math.floor(Math.random() * 999) + 1
    return `${adjective}${noun}${number}`
  }

  const handleCreateApiKey = async () => {
    if (!session?.user?.id) return

    setIsLoading(true)
    try {
      const response = await api.createApiKey(session.user.id, {
        name: generateApiKeyName(),
        permissions: newApiKeyPermissions
      })

      if (response && typeof response === 'object' && 'apiKey' in response) {
        setCreatedApiKey(response.apiKey as string)
        setNewApiKeyPermissions(['read', 'write', 'execute'])
        setShowNewApiKeyForm(false)
        await loadApiKeys()
        toast.success("API key created successfully!")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create API key")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevokeApiKey = async (keyId: string, keyName: string) => {
    if (!session?.user?.id) return

    setIsLoading(true)
    try {
      await api.revokeApiKey(session.user.id, keyId)
      await loadApiKeys()
      toast.success("API key revoked successfully")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to revoke API key")
    } finally {
      setIsLoading(false)
    }
  }

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'developer') {
      loadApiKeys()
    }
  }, [activeTab, session?.user?.id])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }



  // Helper function to get friendly chain display names
  const getChainDisplayName = (chainKey: string, chainName: string): string => {
    const chainMap: { [key: string]: string } = {
      'base': 'Base',
      'baseSepolia': 'Base Sepolia',
      'avalanche': 'Avalanche',
      'avalancheFuji': 'Avalanche Fuji',
      'iotex': 'IoTeX',
      'seiTestnet': 'Sei Testnet',
      'ethereum': 'Ethereum',
      'polygon': 'Polygon',
    }

    return chainMap[chainKey] || chainName || chainKey
  }

  // Helper function to format balance numbers nicely
  const formatBalance = (balance: number): string => {
    if (balance === 0) return '0.00'
    if (balance < 0.01) return '< 0.01'
    if (balance < 1) return balance.toFixed(4).replace(/\.?0+$/, '')
    if (balance < 1000) return balance.toFixed(2).replace(/\.?0+$/, '')
    if (balance < 1000000) return (balance / 1000).toFixed(1).replace(/\.?0+$/, '') + 'K'
    return (balance / 1000000).toFixed(1).replace(/\.?0+$/, '') + 'M'
  }

  // Helper function to transform chain balance data into ChainBalance format
  const transformChainData = (balancesByChain: BalancesByChain): ChainBalance[] => {
    const result: ChainBalance[] = []

    Object.entries(balancesByChain).forEach(([chainKey, balances]) => {
      if (!balances || balances.length === 0) return

      // Get friendly chain name
      const chainName = getChainDisplayName(chainKey, balances[0]?.chainName)

      // Group tokens by stablecoin type and sum balances across all addresses
      const tokenGroups: { [symbol: string]: { balance: number; value: number; addresses: Set<string> } } = {}

      balances.forEach(balance => {
        if (!tokenGroups[balance.stablecoin]) {
          tokenGroups[balance.stablecoin] = { balance: 0, value: 0, addresses: new Set() }
        }
        tokenGroups[balance.stablecoin].balance += parseFloat(balance.formattedBalance)
        tokenGroups[balance.stablecoin].value += balance.fiatValue
        tokenGroups[balance.stablecoin].addresses.add(balance.tokenIdentifier)
      })

      // Calculate total balance for this chain
      const totalBalanceUsd = Object.values(tokenGroups).reduce((sum, group) => sum + group.value, 0)

      // Only include chains with actual balances > $0.001
      if (totalBalanceUsd > 0.001) {
        const tokens = Object.entries(tokenGroups)
          .map(([symbol, group]) => ({
            symbol,
            balance: group.balance.toString(),
            balanceUsd: group.value,
            address: Array.from(group.addresses)[0] // Use first address as reference
          }))
          .filter(token => token.balanceUsd > 0.001) // Only include tokens with meaningful value
          .sort((a, b) => b.balanceUsd - a.balanceUsd) // Sort by value, highest first

        if (tokens.length > 0) {
          result.push({
            chain: chainName,
            network: chainKey,
            balance: totalBalanceUsd.toString(),
            balanceUsd: totalBalanceUsd,
            tokens
          })
        }
      }
    })

    // Sort chains by balance value, highest first
    return result.sort((a, b) => b.balanceUsd - a.balanceUsd)
  }

  // Helper function to get filtered chains based on current view
  const getFilteredChains = () => {
    const mainnetChains = transformChainData(mainnetBalancesByChain)
    const testnetChains = transformChainData(testnetBalancesByChain)

    return {
      chains: [...mainnetChains, ...testnetChains],
      total: totalFiatValue + testnetTotalFiatValue
    }
  }

  // GitHub Sign In Component
  const GitHubSignIn = () => (
    <div className="flex flex-col justify-center min-h-[400px] space-y-5 p-1">
      <div className="text-center">
        <figure className="w-16 h-16 mx-auto">
          <Image src={"/home/meet-logo.svg"} alt="Meet Background" width={0} height={0} sizes="100vw" className="w-full h-full" />
        </figure>
        <h2 className={`text-xl xl:text-[48px] font-instrument-serif font-normal text-white`}>
          Welcome to Latch
        </h2>
        <p className={`text-sm mt-1 text-[rgba(255,255,255,0.80)] font-semibold font-darker-grotesque uppercase`}>
          Sign in to access your account dashboard and manage your wallets & API keys.
        </p>
      </div>

      {error && (
        <div className={`p-3 rounded-lg border ${isDark ? "bg-red-950/50 border-red-800/50 text-red-400" : "bg-red-50 border-red-200 text-red-700"
          }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      <Button
        type="button"
        onClick={handleGitHubSignIn}
        disabled={isLoading || isAuthenticating}
        className="w-full h-11 bg-[rgba(245,245,107,0.10)] font-darker-grotesque text-lg text-[#FAFABB] font-semibold"
        size="lg"
      >
        {isLoading || isAuthenticating ? (
          <Loader2 className="w-4 h-4 mr-3 animate-spin" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <mask id="mask0_27007_1457" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
              <path d="M0.943359 0.706055H23.5316V23.2943H0.943359V0.706055Z" fill="white" />
            </mask>
            <g mask="url(#mask0_27007_1457)">
              <path fillRule="evenodd" clipRule="evenodd" d="M12.2036 0.706055C5.97771 0.706055 0.943359 5.883 0.943359 12.2868C0.943359 17.4058 4.16783 21.7385 8.64312 23.2731C9.20218 23.3875 9.40548 23.0232 9.40548 22.7169C9.40548 22.4486 9.38854 21.5282 9.38854 20.5696C6.25583 21.2599 5.60501 19.1889 5.60501 19.1889C5.09959 17.8477 4.35418 17.5018 4.35418 17.5018C3.32924 16.7917 4.42901 16.7917 4.42901 16.7917C5.56689 16.8693 6.16265 17.9804 6.16265 17.9804C7.16924 19.7451 8.79136 19.2468 9.4436 18.9404C9.53677 18.1922 9.83607 17.6741 10.1523 17.3875C7.65348 17.1192 5.02618 16.1211 5.02618 11.6726C5.02618 10.4077 5.4723 9.37147 6.18101 8.56676C6.06948 8.27876 5.67842 7.09005 6.29395 5.499C6.29395 5.499 7.24407 5.19264 9.38854 6.6877C10.3062 6.43358 11.2521 6.30653 12.2036 6.3037C13.1537 6.3037 14.1236 6.43923 15.0187 6.6877C17.1617 5.19123 18.1132 5.499 18.1132 5.499C18.7288 7.09005 18.3363 8.28017 18.2262 8.56676C18.9518 9.37147 19.381 10.4077 19.381 11.6726C19.381 16.1211 16.7523 17.0981 14.2351 17.3861C14.6445 17.7503 15.0003 18.4406 15.0003 19.5333C15.0003 21.0863 14.9805 22.3329 14.9805 22.7169C14.9805 23.0232 15.1867 23.3875 15.7457 23.2731C20.221 21.7385 23.4455 17.4058 23.4455 12.2868C23.4638 5.883 18.4111 0.706055 12.2036 0.706055Z" fill="#FAFABB" />
            </g>
          </svg>
        )}
        {isLoading || isAuthenticating ? "Signing you in..." : "Sign In with GitHub"}
      </Button>

      <div className={`text-center text-lg text-[rgba(255,255,255,0.48)] font-darker-grotesque font-semibold`}>
        By continuing, you agree to our Terms of Service and Privacy Policy
      </div>
    </div>
  )

  // Authenticated User Interface
  const AuthenticatedInterface = () => (
    <div className="flex flex-col h-full font-darker-grotesque">
      {/* User Header */}
      <div className="flex items-center justify-between px-1 py-6 border-b border-b-[rgba(245,245,107,0.10)]">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center `}>
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt="Profile"
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="bg-[rgba(245,245,107,0.10)] w-12 h-12 min-w-12 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M12.0324 4.625C11.9674 4.36894 12.0064 4.09757 12.1409 3.87015C12.2753 3.64274 12.4942 3.47776 12.7499 3.41125C14.8817 2.86144 17.1181 2.86144 19.2499 3.41125C19.486 3.4717 19.6919 3.61631 19.8289 3.8179C19.966 4.01949 20.0246 4.26418 19.9939 4.50597C19.9632 4.74777 19.8453 4.97003 19.6622 5.13097C19.4792 5.29192 19.2436 5.38048 18.9999 5.38C18.9156 5.37956 18.8316 5.36864 18.7499 5.3475C16.9462 4.88177 15.0537 4.88177 13.2499 5.3475C13.1225 5.38015 12.9899 5.38735 12.8598 5.3687C12.7296 5.35004 12.6044 5.3059 12.4913 5.23878C12.3782 5.17167 12.2795 5.08292 12.2007 4.97759C12.122 4.87227 12.0648 4.75245 12.0324 4.625ZM4.16866 13.75C4.29522 13.7852 4.42747 13.795 4.55785 13.7791C4.68823 13.7631 4.81418 13.7216 4.92852 13.6569C5.04286 13.5923 5.14334 13.5057 5.22422 13.4022C5.3051 13.2987 5.3648 13.1803 5.39991 13.0537C5.89875 11.2595 6.84497 9.6212 8.14991 8.2925C8.32391 8.10117 8.41701 7.84987 8.40968 7.59135C8.40235 7.33284 8.29515 7.08722 8.11059 6.90605C7.92603 6.72489 7.67846 6.62227 7.41986 6.61975C7.16125 6.61722 6.91173 6.71498 6.72366 6.8925C5.18196 8.4624 4.06375 10.3978 3.47366 12.5175C3.43829 12.6441 3.42822 12.7764 3.44402 12.9068C3.45981 13.0373 3.50117 13.1633 3.56571 13.2778C3.63026 13.3923 3.71673 13.4929 3.82019 13.5739C3.92365 13.6549 4.04206 13.7148 4.16866 13.75ZM26.5987 13.055C26.6696 13.3106 26.8392 13.5276 27.0701 13.6581C27.301 13.7887 27.5743 13.8222 27.8299 13.7512C28.0855 13.6803 28.3025 13.5107 28.433 13.2798C28.5636 13.0489 28.5971 12.7756 28.5262 12.52C27.9363 10.4002 26.8181 8.46474 25.2762 6.895C25.1841 6.80135 25.0744 6.72676 24.9535 6.67548C24.8326 6.6242 24.7028 6.59724 24.5714 6.59613C24.4401 6.59503 24.3098 6.61981 24.1881 6.66905C24.0663 6.71829 23.9554 6.79103 23.8618 6.88312C23.7681 6.97521 23.6935 7.08485 23.6423 7.20576C23.591 7.32668 23.564 7.45651 23.5629 7.58785C23.5618 7.71919 23.5866 7.84946 23.6358 7.97122C23.6851 8.09298 23.7578 8.20385 23.8499 8.2975C25.154 9.62563 26.0998 11.263 26.5987 13.0562V13.055ZM27.8324 18.25C27.7058 18.2149 27.5734 18.205 27.443 18.2211C27.3126 18.2371 27.1866 18.2787 27.0722 18.3435C26.9578 18.4083 26.8574 18.495 26.7766 18.5986C26.6957 18.7023 26.6361 18.8208 26.6012 18.9475C26.1528 20.5613 25.3403 22.0507 24.2262 23.3013C23.4971 22.2467 22.5714 21.3427 21.4999 20.6388C21.4089 20.5784 21.3005 20.5495 21.1915 20.5564C21.0825 20.5634 20.9787 20.606 20.8962 20.6775C19.5375 21.8531 17.8009 22.5001 16.0043 22.5001C14.2076 22.5001 12.4711 21.8531 11.1124 20.6775C11.0297 20.6057 10.9258 20.563 10.8165 20.556C10.7072 20.549 10.5986 20.5781 10.5074 20.6388C9.429 21.3331 8.49517 22.2296 7.75741 23.2787C6.65386 22.0317 5.8489 20.5496 5.40366 18.945C5.33271 18.6894 5.16314 18.4724 4.93223 18.3419C4.70133 18.2113 4.42801 18.1778 4.17241 18.2487C3.91681 18.3197 3.69986 18.4893 3.56928 18.7202C3.43871 18.9511 3.40521 19.2244 3.47616 19.48C4.24047 22.2151 5.87878 24.6249 8.141 26.3416C10.4032 28.0583 13.1651 28.9876 16.0049 28.9876C18.8448 28.9876 21.6066 28.0583 23.8688 26.3416C26.131 24.6249 27.7694 22.2151 28.5337 19.48C28.5685 19.3532 28.5781 19.2207 28.5617 19.0903C28.5453 18.9598 28.5033 18.8338 28.4382 18.7195C28.3731 18.6053 28.286 18.505 28.1821 18.4244C28.0781 18.3439 27.9593 18.2846 27.8324 18.25ZM15.9999 20.5C17.0877 20.5 18.1511 20.1774 19.0555 19.5731C19.96 18.9687 20.665 18.1098 21.0812 17.1048C21.4975 16.0998 21.6064 14.9939 21.3942 13.927C21.182 12.8601 20.6582 11.8801 19.889 11.1109C19.1198 10.3417 18.1398 9.8179 17.0729 9.60568C16.006 9.39346 14.9001 9.50238 13.8952 9.91866C12.8902 10.3349 12.0312 11.0399 11.4268 11.9444C10.8225 12.8488 10.4999 13.9122 10.4999 15C10.5016 16.4582 11.0816 17.8562 12.1126 18.8873C13.1437 19.9184 14.5417 20.4983 15.9999 20.5Z" fill="#F5F56B" />
                </svg>
              </div>
            )}
          </div>
          <div>
            <h3 className={`text-xl font-bold text-[#F5F56B]`}>
              {session?.user?.name || "User"}
            </h3>
            <p className={`text-base font-medium text-[#87873B]`}>
              {session?.user?.email}
            </p>
          </div>
        </div>
        <Button
          variant={null}
          size="sm"
          onClick={handleSignOut}
          disabled={isLoading || isAuthenticating}
          className={`py-2 px-4 bg-[rgba(245,245,107,0.10)]`}
        >
          <span className="text-base font-bold text-[#F5F56B]">Sign Out</span>
        </Button>
      </div>

      {/* Main Content Tabs */}
      <div className="flex-1 flex flex-col py-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'funds' | 'wallets' | 'settings' | 'developer')} className="w-full flex flex-col h-full">
          <TabsList className={`grid w-full grid-cols-2 mb-4 font-darker-grotesque`}>
            {/* <TabsTrigger value="funds" className="text-[#626566] text-lg font-bold">
              Funds
            </TabsTrigger> */}
            <TabsTrigger value="wallets" className="text-[#626566] text-lg font-bold">
              Wallets
            </TabsTrigger>
            {/* <TabsTrigger value="settings" className="text-[#626566] text-lg font-bold">
              Settings
            </TabsTrigger> */}
            <TabsTrigger value="developer" className="text-[#626566] text-lg font-bold">
              Developer
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          {/* <TabsContent value="funds" className="flex-1 flex flex-col">
            <div className="space-y-4">
              
              <div className={`rounded-lg border p-4 ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50/50 border-gray-200"}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <h4 className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                      Your Funds
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleBuyCrypto}
                      disabled={isLoading || isAuthenticating || userWallets.length === 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs px-3"
                      title="Buy cryptocurrency for your wallets"
                    >
                      <CreditCard className="h-3 w-3 mr-1.5" />
                      Fund Account
                    </Button>
                    {(balanceSummary.hasMainnetBalances || balanceSummary.hasTestnetBalances) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDetails(!showDetails)}
                        className="h-8 text-xs px-3"
                      >
                        {showDetails ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                        Details
                      </Button>
                    )}
                  </div>
                </div>

              
                {balanceSummary.hasMainnetBalances ? (
                  <div className="space-y-2 mb-4">
                    <div className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                      ${formatBalance(totalFiatValue)}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className={`text-sm ${isDark ? "text-green-400" : "text-green-600"}`}>
                        Live on {transformChainData(mainnetBalancesByChain).length} network{transformChainData(mainnetBalancesByChain).length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 mb-4">
                    <div className={`text-3xl font-bold ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      $0.00
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400" />
                      <span className={`text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                        No real funds yet
                      </span>
                    </div>
                  </div>
                )}

       
                {balanceSummary.hasTestnetBalances && (
                  <div className={`rounded-lg border p-3 mb-4 ${isDark ? "bg-orange-900/20 border-orange-800/30" : "bg-orange-50 border-orange-200"
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        <div>
                          <p className={`font-medium text-sm ${isDark ? "text-orange-300" : "text-orange-800"}`}>
                            Test Balance
                          </p>
                          <p className={`text-xs ${isDark ? "text-orange-400" : "text-orange-600"}`}>
                            Development funds
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${isDark ? "text-orange-300" : "text-orange-700"}`}>
                          ${formatBalance(testnetTotalFiatValue)}
                        </div>
                        <div className={`text-xs ${isDark ? "text-orange-400" : "text-orange-600"}`}>
                          {transformChainData(testnetBalancesByChain).length} testnet{transformChainData(testnetBalancesByChain).length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                )}



                
                <div className={`pt-3 border-t ${isDark ? "border-gray-700/50" : "border-gray-200/50"}`}>
                  <div className="flex items-center justify-between text-sm">
                    <span className={isDark ? "text-gray-400" : "text-gray-600"}>
                      {userWallets.length} wallet{userWallets.length !== 1 ? 's' : ''} connected
                    </span>
                    <div className="flex items-center gap-3">
                      {balanceSummary.hasMainnetBalances && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          <span className={`text-xs ${isDark ? "text-green-400" : "text-green-600"}`}>
                            LIVE
                          </span>
                        </div>
                      )}
                      {balanceSummary.hasTestnetBalances && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                          <span className={`text-xs ${isDark ? "text-orange-400" : "text-orange-600"}`}>
                            TEST
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>




            
                <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                  <CollapsibleContent>
                    {getFilteredChains().chains.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"} mb-3`}>
                          Balance by Network
                        </h5>

                        <div className="space-y-2">
                          {getFilteredChains().chains.map((chain, index) => {
                            // More comprehensive testnet detection
                            const isTestnet = chain.network.toLowerCase().includes('sepolia') ||
                              chain.network.toLowerCase().includes('fuji') ||
                              chain.network.toLowerCase().includes('testnet') ||
                              chain.network.toLowerCase().includes('test') ||
                              chain.network.toLowerCase().includes('goerli') ||
                              chain.network.toLowerCase().includes('mumbai')
                            const isMainnet = !isTestnet

                            return (
                              <div
                                key={`${chain.chain}-${chain.network}-${index}`}
                                className={`rounded-lg border p-3 ${isDark ? "bg-gray-800/30 border-gray-700/50" : "bg-white border-gray-200"
                                  }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className={`w-2 h-2 rounded-full ${isMainnet ? 'bg-green-500' : 'bg-orange-500'}`} />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <h6 className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"} truncate`}>
                                          {chain.chain}
                                        </h6>
                                        <Badge variant="secondary" className="text-xs">
                                          {isMainnet ? 'LIVE' : 'TEST'}
                                        </Badge>
                                      </div>
                                      {chain.tokens && chain.tokens.length > 0 && (
                                        <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                          {chain.tokens.length} token{chain.tokens.length !== 1 ? 's' : ''}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                                      ${formatBalance(chain.balanceUsd)}
                                    </div>
                                  </div>
                                </div>

                                
                                {chain.tokens && chain.tokens.length > 0 && (
                                  <div className={`mt-3 pt-3 border-t ${isDark ? "border-gray-700/30" : "border-gray-200/50"}`}>
                                    <div className="space-y-1">
                                      {chain.tokens.slice(0, 3).map((token, tokenIndex) => (
                                        <div key={tokenIndex} className="flex items-center justify-between">
                                          <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                            {formatBalance(parseFloat(token.balance))} {token.symbol}
                                          </span>
                                          <span className={`text-xs font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                            ${formatBalance(token.balanceUsd)}
                                          </span>
                                        </div>
                                      ))}
                                      {chain.tokens.length > 3 && (
                                        <div className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                                          +{chain.tokens.length - 3} more token{chain.tokens.length - 3 !== 1 ? 's' : ''}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 mt-4">
                        <Wallet className={`h-6 w-6 mx-auto mb-2 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          No balances found
                        </p>
                        <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                          Connect wallets with funds to see them here
                        </p>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </TabsContent> */}

          {/* Wallets Tab */}
          <TabsContent value="wallets" className="flex-1 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className={`font-semibold text-lg text-[rgba(255,255,255,0.48)]`}>
                  Linked wallets
                </span>
                <span>{userWallets.length}</span>
              </div>
              {/* <div className="flex items-center gap-2">
                {isConnected && !userWallets.find(w => w.walletAddress.toLowerCase() === connectedWallet?.toLowerCase()) && (
                  <Button
                    size="sm"
                    onClick={handleConnectWallet}
                    disabled={isLoading || isAuthenticating}
                    className="h-8 text-xs px-3"
                  >
                    <Plus className="h-3 w-3 mr-1.5" />
                    Link Wallet
                  </Button>
                )}
              </div> */}
            </div>

            {/* Helper text for testnet */}
            {/* {balanceSummary.hasTestnetBalances && (
              <div className={`text-xs px-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                💡 For test tokens, use faucets like{" "}
                <a
                  href="https://faucet.circle.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-400 underline"
                >
                  Circle faucet
                </a>
              </div>
            )} */}

            {/* User's Linked Wallets - Show First */}
            {userWallets.length > 0 && (
              <div className="space-y-3">
                {userWallets.map((wallet) => (
                  <div key={wallet.id} className={`rounded-lg border border-[rgba(255,255,255,0.04)] p-4 }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* <div className="relative">
                          <Wallet className="h-4 w-4" />
                          {wallet.isPrimary && (
                            <Star className="h-2.5 w-2.5 text-yellow-500 absolute -top-0.5 -right-0.5" />
                          )}
                        </div> */}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`text-base font-semibold text-white `}>
                              {wallet.walletAddress.slice(0, 6)}...{wallet.walletAddress.slice(-4)}
                            </p>
                            {wallet.isPrimary && (
                              <Badge variant="secondary" className="text-base font-bold text-[#4C81DB] py-0.5 px-2 bg-[rgba(0,97,255,0.12)]">Primary</Badge>
                            )}
                          </div>
                          {/* <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                              {wallet.walletType}
                            </Badge>
                            {wallet.provider && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                {wallet.provider}
                              </Badge>
                            )}
                          </div> */}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant={null}
                          size="sm"
                          onClick={() => copyToClipboard(wallet.walletAddress)}
                          className="w-10 h-10 bg-[rgba(245,245,107,0.10)] rounded"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M16.875 2.5H6.875C6.70924 2.5 6.55027 2.56585 6.43306 2.68306C6.31585 2.80027 6.25 2.95924 6.25 3.125V6.25H3.125C2.95924 6.25 2.80027 6.31585 2.68306 6.43306C2.56585 6.55027 2.5 6.70924 2.5 6.875V16.875C2.5 17.0408 2.56585 17.1997 2.68306 17.3169C2.80027 17.4342 2.95924 17.5 3.125 17.5H13.125C13.2908 17.5 13.4497 17.4342 13.5669 17.3169C13.6842 17.1997 13.75 17.0408 13.75 16.875V13.75H16.875C17.0408 13.75 17.1997 13.6842 17.3169 13.5669C17.4342 13.4497 17.5 13.2908 17.5 13.125V3.125C17.5 2.95924 17.4342 2.80027 17.3169 2.68306C17.1997 2.56585 17.0408 2.5 16.875 2.5ZM16.25 12.5H13.75V6.875C13.75 6.70924 13.6842 6.55027 13.5669 6.43306C13.4497 6.31585 13.2908 6.25 13.125 6.25H7.5V3.75H16.25V12.5Z" fill="#F5F56B" />
                          </svg>
                        </Button>

                        <Link href={`https://basescan.org/address/${wallet.walletAddress}`} target="_blank">
                          <Button
                            variant={null}
                            size="sm"
                            // onClick={() => }
                            className="min-w-10 h-10 bg-[rgba(245,245,107,0.10)] rounded"
                          >
                            <span className="text-[#F5F56B] text-base font-bold">View</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M10.7693 9.03061V1.38477H3.13267V2.714H8.51421L1.5376 9.68323L2.47083 10.6155L9.4456 3.6463V9.03061H10.7693Z" fill="#F5F56B" />
                            </svg>
                          </Button>
                        </Link>

                        <Button
                          variant={null}
                          size="sm"
                          // onClick={() => }
                          className="min-w-10 h-10 bg-[#F5F56B] rounded"
                        >
                          <span className="text-[#2B2B13] text-base font-bold">Fund</span>
                        </Button>
                        {/* {!wallet.isPrimary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetPrimaryWallet(wallet.id)}
                            disabled={isLoading || isAuthenticating}
                            className="h-7 px-2 text-xs"
                          >
                            <Star className="h-3 w-3 mr-1" />
                            Primary
                          </Button>
                        )} */}
                        {/* <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveWallet(wallet.id, wallet.isPrimary)}
                          disabled={isLoading || isAuthenticating}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button> */}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Current Connected Wallet (if not linked to account) */}
            {/* {isConnected && !userWallets.find(w => w.walletAddress.toLowerCase() === connectedWallet?.toLowerCase()) && (
              <div className={`border border-dashed rounded-lg p-4 ${isDark ? "border-gray-700 bg-gray-800/30" : "border-gray-300 bg-gray-50"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wallet className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                        Connected Wallet
                      </p>
                      <p className={`text-xs font-mono ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        {connectedWallet?.slice(0, 6)}...{connectedWallet?.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">Not Linked</Badge>
                </div>
              </div>
            )} */}

            {/* Native Wallet Connection Component - Collapsible */}
            {/* <Collapsible>
              <div className={`rounded-lg border ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50/50 border-gray-200"}`}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full flex items-center justify-between p-4 h-auto"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? "bg-gray-800" : "bg-gray-100"
                        }`}>
                        <Wallet className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <h4 className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                          Native Wallet
                        </h4>
                        <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          Connect MetaMask, Coinbase Wallet, etc.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isConnected && (
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                      )}
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    <div className={`h-px mb-4 ${isDark ? "bg-gray-800" : "bg-gray-200"}`} />

                    {!isConnected ? (
                      <div className="text-center py-4">
                        <Wallet className={`h-6 w-6 mx-auto mb-3 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                        <p className={`text-xs mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          No native wallet connected
                        </p>
                        <ConnectButton />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <div>
                            <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                              Connected
                            </p>
                            <p className={`text-xs font-mono ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                              {connectedWallet?.slice(0, 6)}...{connectedWallet?.slice(-4)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!userWallets.find(w => w.walletAddress.toLowerCase() === connectedWallet?.toLowerCase()) && (
                            <Button
                              size="sm"
                              onClick={handleConnectWallet}
                              disabled={isLoading || isAuthenticating}
                              className="h-7 text-xs px-2"
                            >
                              Link
                            </Button>
                          )}
                          <ConnectButton />
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible> */}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="flex-1 flex flex-col">
            <div className="space-y-3">
              <div className={`rounded-lg border p-4 ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50/50 border-gray-200"}`}>
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4" />
                  <h4 className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                    Profile Information
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs font-medium block mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Name
                    </label>
                    <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      {session?.user?.name || "Not set"}
                    </p>
                  </div>
                  <div>
                    <label className={`text-xs font-medium block mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Email
                    </label>
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        {session?.user?.email?.slice(0, 20)}...
                      </p>
                      {session?.user?.emailVerified ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-orange-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className={`rounded-lg border p-4 ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50/50 border-gray-200"}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="h-4 w-4" />
                  <h4 className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                    Account Settings
                  </h4>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                        Email Verification
                      </p>
                      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        {session?.user?.emailVerified ? "Your email is verified" : "Please verify your email"}
                      </p>
                    </div>
                    {session?.user?.emailVerified ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Button variant="outline" size="sm" className="h-7 text-xs px-3">
                        Verify
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Developer Tab */}
          <TabsContent value="developer" className="flex-1 overflow-y-auto space-y-4">

            {/* Show created API key (one-time display) */}
            {createdApiKey && (

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <figure>
                    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <circle cx="4" cy="4" r="4" fill="#00FF75" />
                    </svg>
                  </figure>
                  <span className="text-lg font-semibold text-[#00FF75]">API key created</span>
                </div>
                <div className="flex items-center gap-3 py-3 px-4 bg-[rgba(245,245,107,0.10)] rounded-lg">
                  <code className={`text-[#FAFABB] text-lg font-semibold grow truncate`}>
                    {createdApiKey}
                  </code>

                  <Button
                    variant={null}
                    size="sm"
                    onClick={() => {
                      copyToClipboard(createdApiKey)
                      setCreatedApiKey(null)
                    }}
                    className="w-10 h-10 bg-[rgba(245,245,107,0.10)] rounded flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M16.875 2.5H6.875C6.70924 2.5 6.55027 2.56585 6.43306 2.68306C6.31585 2.80027 6.25 2.95924 6.25 3.125V6.25H3.125C2.95924 6.25 2.80027 6.31585 2.68306 6.43306C2.56585 6.55027 2.5 6.70924 2.5 6.875V16.875C2.5 17.0408 2.56585 17.1997 2.68306 17.3169C2.80027 17.4342 2.95924 17.5 3.125 17.5H13.125C13.2908 17.5 13.4497 17.4342 13.5669 17.3169C13.6842 17.1997 13.75 17.0408 13.75 16.875V13.75H16.875C17.0408 13.75 17.1997 13.6842 17.3169 13.5669C17.4342 13.4497 17.5 13.2908 17.5 13.125V3.125C17.5 2.95924 17.4342 2.80027 17.3169 2.68306C17.1997 2.56585 17.0408 2.5 16.875 2.5ZM16.25 12.5H13.75V6.875C13.75 6.70924 13.6842 6.55027 13.5669 6.43306C13.4497 6.31585 13.2908 6.25 13.125 6.25H7.5V3.75H16.25V12.5Z" fill="#F5F56B" />
                    </svg>
                  </Button>

                  <Button
                    variant={null}
                    size="sm"
                    onClick={() => {
                      setCreatedApiKey(null)
                    }}
                    className="w-10 h-10 text-[rgba(255,255,255,0.48)] text-base font-semibold rounded flex items-center justify-center"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}
            {/* API Keys List */}
            <div className="h-[290px] overflow-auto">
              <p className="text-lg font-semibold text-[rgba(255,255,255,0.48)] mb-4">Your API Keys</p>
              {isLoadingApiKeys ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : apiKeys.length > 0 ? (
                <div className="space-y-3">
                  {apiKeys.map((key) => (
                    <div key={key.id} className={`rounded-lg border border-[rgba(255,255,255,0.04)] p-4 bg-[rgba(255,255,255,0.04)]`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className={`text-base text-white font-medium `}>
                                {key.name}
                              </p>
                              {/* {key.permissions && (
                                <div className="flex gap-1">
                                  {key.permissions.map((permission: string) => (
                                    <Badge key={permission} variant="secondary" className="text-xs px-1.5 py-0">
                                      {permission}
                                    </Badge>
                                  ))}
                                </div>
                              )} */}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <p className={`text-sm text-[#A7ACAE]`}>
                                Created: {new Date(key.createdAt).toLocaleDateString()}
                              </p>
                              {key.lastUsedAt && (
                                <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                  Last used: {new Date(key.lastUsedAt).toLocaleDateString()}
                                </p>
                              )}
                              {key.expiresAt && (
                                <p className={`text-xs ${new Date(key.expiresAt) < new Date()
                                  ? 'text-red-500'
                                  : isDark ? "text-gray-400" : "text-gray-600"
                                  }`}>
                                  Expires: {new Date(key.expiresAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant={null}
                          size="sm"
                          onClick={() => handleRevokeApiKey(key.id, key.name)}
                          disabled={isLoading}
                          className="h-10 w-10 p-0 bg-[rgba(233,53,68,0.08)]"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M13.5 3H11V2.5C11 2.10218 10.842 1.72064 10.5607 1.43934C10.2794 1.15804 9.89782 1 9.5 1H6.5C6.10218 1 5.72064 1.15804 5.43934 1.43934C5.15804 1.72064 5 2.10218 5 2.5V3H2.5C2.36739 3 2.24021 3.05268 2.14645 3.14645C2.05268 3.24021 2 3.36739 2 3.5C2 3.63261 2.05268 3.75979 2.14645 3.85355C2.24021 3.94732 2.36739 4 2.5 4H3V13C3 13.2652 3.10536 13.5196 3.29289 13.7071C3.48043 13.8946 3.73478 14 4 14H12C12.2652 14 12.5196 13.8946 12.7071 13.7071C12.8946 13.5196 13 13.2652 13 13V4H13.5C13.6326 4 13.7598 3.94732 13.8536 3.85355C13.9473 3.75979 14 3.63261 14 3.5C14 3.36739 13.9473 3.24021 13.8536 3.14645C13.7598 3.05268 13.6326 3 13.5 3ZM7 10.5C7 10.6326 6.94732 10.7598 6.85355 10.8536C6.75979 10.9473 6.63261 11 6.5 11C6.36739 11 6.24021 10.9473 6.14645 10.8536C6.05268 10.7598 6 10.6326 6 10.5V6.5C6 6.36739 6.05268 6.24021 6.14645 6.14645C6.24021 6.05268 6.36739 6 6.5 6C6.63261 6 6.75979 6.05268 6.85355 6.14645C6.94732 6.24021 7 6.36739 7 6.5V10.5ZM10 10.5C10 10.6326 9.94732 10.7598 9.85355 10.8536C9.75979 10.9473 9.63261 11 9.5 11C9.36739 11 9.24021 10.9473 9.14645 10.8536C9.05268 10.7598 9 10.6326 9 10.5V6.5C9 6.36739 9.05268 6.24021 9.14645 6.14645C9.24021 6.05268 9.36739 6 9.5 6C9.63261 6 9.75979 6.05268 9.85355 6.14645C9.94732 6.24021 10 6.36739 10 6.5V10.5ZM10 3H6V2.5C6 2.36739 6.05268 2.24021 6.14645 2.14645C6.24021 2.05268 6.36739 2 6.5 2H9.5C9.63261 2 9.75979 2.05268 9.85355 2.14645C9.94732 2.24021 10 2.36739 10 2.5V3Z" fill="#E93544" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 px-4 border border-[rgba(255,255,255,0.04)] bg-[rgba(245,245,107,0.04)] backdrop-blur-[20px] rounded-lg h-[70px] flex items-center">
                  <span className="text-[#A7ACAE] text-lg font-semibold">No API keys yet. Create one above.</span>
                </div>
              )}
            </div>



            {/* Take note - create api button */}
            <div className="mt-8 flex items-center justify-between gap-4 text-base text-white font-medium bg-[#2B2B13] py-4 px-6 rounded-lg backdrop-blur-[20px]">
              <div className="bg-[rgba(245,245,107,0.10)] w-12 h-12 min-w-12 rounded-full flex items-center justify-center">
                <div className="bg-[rgba(245,245,107,0.10)] w-12 h-12 min-w-12 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M20.3034 3.69655C19.1121 2.50359 17.5536 1.74681 15.8794 1.54832C14.2052 1.34984 12.513 1.72123 11.0758 2.60256C9.63854 3.4839 8.54018 4.82377 7.95793 6.40597C7.37568 7.98816 7.34349 9.72039 7.86657 11.3231L2.6897 16.5C2.5498 16.6388 2.43889 16.804 2.36341 16.986C2.28792 17.168 2.24938 17.3632 2.25001 17.5603V20.25C2.25001 20.6478 2.40804 21.0293 2.68935 21.3107C2.97065 21.592 3.35218 21.75 3.75001 21.75H6.75001C6.94892 21.75 7.13969 21.671 7.28034 21.5303C7.42099 21.3897 7.50001 21.1989 7.50001 21V19.5H9.00001C9.19892 19.5 9.38969 19.421 9.53034 19.2803C9.67099 19.1397 9.75001 18.9489 9.75001 18.75V17.25H11.25C11.3485 17.2501 11.4461 17.2307 11.5371 17.1931C11.6282 17.1555 11.7109 17.1002 11.7806 17.0306L12.6769 16.1334C13.4271 16.3774 14.2111 16.5012 15 16.5H15.0094C16.492 16.4982 17.9408 16.057 19.1728 15.2322C20.4048 14.4074 21.3646 13.2359 21.9312 11.8658C22.4977 10.4957 22.6454 8.98846 22.3557 7.53444C22.066 6.08042 21.3518 4.74488 20.3034 3.69655ZM16.875 8.62499C16.5783 8.62499 16.2883 8.53702 16.0417 8.3722C15.795 8.20737 15.6027 7.97311 15.4892 7.69902C15.3757 7.42493 15.346 7.12333 15.4038 6.83236C15.4617 6.54139 15.6046 6.27411 15.8143 6.06433C16.0241 5.85455 16.2914 5.71169 16.5824 5.65381C16.8733 5.59594 17.1749 5.62564 17.449 5.73917C17.7231 5.8527 17.9574 6.04496 18.1222 6.29164C18.287 6.53831 18.375 6.82832 18.375 7.12499C18.375 7.52282 18.217 7.90435 17.9357 8.18565C17.6544 8.46696 17.2728 8.62499 16.875 8.62499Z" fill="#FCFCD1" />
                  </svg>
                </div>
              </div>
              <p>
                Keys inherit default permissions unless specified by the server.
              </p>
              <Button
                size="sm"
                onClick={() => handleCreateApiKey()}
                disabled={isLoading || isLoadingApiKeys}
                className="px-4 py-2 bg-[#F5F56B] text-[#2B2B13] text-base font-bold hover:bg-white"
              >
                Create API Key
              </Button>
            </div>





            <div className="flex items-center justify-between">

              {/* New API Key Form */}
              {showNewApiKeyForm && (
                <div className={`rounded-lg border p-4 ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50/50 border-gray-200"}`}>
                  <h5 className={`font-medium text-sm mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                    Create New API Key
                  </h5>
                  <div className="space-y-3">
                    <div>
                      <Label className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Permissions
                      </Label>
                      <div className="space-y-2">
                        {[
                          { id: 'read', label: 'Read', description: 'View servers, tools, and analytics' },
                          { id: 'write', label: 'Write', description: 'Create and modify resources' },
                          { id: 'execute', label: 'Execute', description: 'Run tools and make payments' },
                          { id: 'admin', label: 'Admin', description: 'Full administrative access' }
                        ].map((permission) => (
                          <div key={permission.id} className="flex items-start gap-3">
                            <Checkbox
                              id={permission.id}
                              checked={newApiKeyPermissions.includes(permission.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setNewApiKeyPermissions([...newApiKeyPermissions, permission.id])
                                } else {
                                  setNewApiKeyPermissions(newApiKeyPermissions.filter(p => p !== permission.id))
                                }
                              }}
                            />
                            <div>
                              <Label htmlFor={permission.id} className={`text-sm font-medium cursor-pointer ${isDark ? "text-white" : "text-gray-900"}`}>
                                {permission.label}
                              </Label>
                              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                {permission.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {newApiKeyPermissions.length === 0 && (
                        <p className={`text-xs text-red-500 mt-1`}>
                          At least one permission must be selected.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleCreateApiKey}
                        disabled={newApiKeyPermissions.length === 0 || isLoading}
                        className="h-8 text-xs px-3"
                      >
                        Create
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowNewApiKeyForm(false)
                          setNewApiKeyPermissions(['read', 'write', 'execute'])
                        }}
                        className="h-8 text-xs px-3"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </TabsContent>
        </Tabs>
      </div>
    </div >
  )

  const LoadingSpinner = ({ message }: { message?: string }) => (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-3">
      <Loader2 className="h-6 w-6 animate-spin" />
      {message && (
        <p className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          {message}
        </p>
      )}
    </div>
  )

  const ModalHeader = ({ Component }: { Component: React.ComponentType<{ children: React.ReactNode }> }) => (
    <Component>
      <div className="text-lg font-semibold">
        {session?.user ? "Account" : ""}
      </div>
    </Component>
  )

  // Show loading during session loading or authentication flow
  if (sessionLoading || isAuthenticating) {
    const loadingMessage = isAuthenticating
      ? "Signing you in..."
      : sessionLoading
        ? "Loading your account..."
        : undefined

    if (isMobile) {
      return (
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className={`h-[65vh] flex flex-col ${isDark ? "bg-gray-900 border-gray-800" : ""}`}>
            <LoadingSpinner message={loadingMessage} />
          </DrawerContent>
        </Drawer>
      )
    }
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-md flex flex-col ${isDark ? "bg-gray-900 border-gray-800" : ""}`}>
          <LoadingSpinner message={loadingMessage} />
        </DialogContent>
      </Dialog>
    )
  }

  // Mobile drawer
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className={`h-[65vh] flex flex-col ${isDark ? "bg-gray-900 border-gray-800" : ""}`}>
          <ModalHeader Component={DrawerHeader} />
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            {session?.user ? <AuthenticatedInterface /> : <GitHubSignIn />}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  // Desktop dialog
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-lg max-h-[70vh] flex flex-col bg-[#15150B] border border-[rgba(245,245,107,0.10)]`}>
        {/* <ModalHeader Component={DialogHeader} /> */}
        <div className="flex-1 overflow-y-auto px-1">
          {session?.user ? <AuthenticatedInterface /> : <GitHubSignIn />}
        </div>
      </DialogContent>
    </Dialog>
  )
}