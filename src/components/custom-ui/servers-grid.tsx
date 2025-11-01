"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { Check, Copy, Hammer, Activity } from "lucide-react"
import { MCPServer } from "@/app/page"
import { urlUtils } from "@/lib/client/utils"

export default function ServersGrid({
  servers,
  loading = false,
  className = "", // NEW
  kindOfServer = "featured-server"
}: {
  servers: MCPServer[]
  loading?: boolean
  className?: string // NEW
  kindOfServer?: string
}) {
  const skeletonCount = 6

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl px-4 md:px-6 mx-auto ${className}`}
    >
      <TooltipProvider>
        {loading
          ? Array.from({ length: skeletonCount }).map((_, idx) => (
            <ServerSkeletonCard key={idx} />
          ))
          : servers.map((server) => <ServerCard key={server.id} server={server} kindOfServer={kindOfServer} />)}
      </TooltipProvider>
    </div>
  )
}

function ServerCard({ server, kindOfServer = "featured-server" }: { server: MCPServer, kindOfServer?: string }) {
  const [copied, setCopied] = useState(false)
  const url = urlUtils.getMcpUrl(server.id)

  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success("Copied MCP endpoint to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Link href={`/servers/${server.id}`} className="group">
      {kindOfServer === 'featured-server' ? <ServerCardFeatured server={server} url={url} handleCopy={handleCopy} /> : <ServerCardAllServer server={server} url={url} handleCopy={handleCopy} />}

    </Link>
  )
}

function ServerSkeletonCard() {
  return (
    <Card className="border border-border bg-background rounded-lg p-4 space-y-4">
      <div>
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full" />
      </div>

      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-sm" />
        <Skeleton className="h-5 w-16 rounded-sm" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-6 rounded-sm" />
        </div>
        <Skeleton className="h-8 w-full rounded-md" />
      </div>
    </Card>
  )
}

function ServerCardFeatured({ server, url, handleCopy }: { server: MCPServer, url: string, handleCopy: () => void }) {
  return (
    <Card className="font-darker-grotesque border xl:border-transparent xl:bg-transparent  hover:bg-[#FEFEF9] hover:border-[#E3E8EA] rounded-2xl transition-all ease-linear duration-200">
      <CardContent>
        <div className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#0E2854] w-fit rounded-full opacity-90">
          <figure>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <mask id="mask0_27060_37" maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
                <path d="M0.3125 0.470703H15.3713V15.5295H0.3125V0.470703Z" fill="white" />
              </mask>
              <g mask="url(#mask0_27060_37)">
                <path d="M7.09057 11.6209C7.15032 11.6183 7.20998 11.6278 7.26595 11.6489C7.32191 11.67 7.37302 11.7022 7.41619 11.7436C7.45935 11.785 7.49367 11.8347 7.51708 11.8897C7.54048 11.9448 7.55248 12.004 7.55236 12.0638C7.55223 12.1236 7.53998 12.1827 7.51634 12.2377C7.4927 12.2926 7.45817 12.3422 7.41482 12.3834C7.37148 12.4246 7.32024 12.4566 7.26418 12.4775C7.20813 12.4983 7.14842 12.5076 7.08869 12.5047C6.97137 12.5044 6.85895 12.4576 6.77617 12.3744C6.69339 12.2913 6.64703 12.1787 6.64728 12.0614C6.64753 11.9441 6.69437 11.8316 6.7775 11.7489C6.86064 11.6661 6.97325 11.6197 7.09057 11.62V11.6209ZM14.0073 8.89338C13.8903 8.89338 13.7782 8.84693 13.6955 8.76424C13.6128 8.68154 13.5663 8.56939 13.5663 8.45244C13.5663 8.3355 13.6128 8.22334 13.6955 8.14065C13.7782 8.05796 13.8903 8.0115 14.0073 8.0115C14.1242 8.0115 14.2364 8.05796 14.3191 8.14065C14.4018 8.22334 14.4482 8.3355 14.4482 8.45244C14.4482 8.56939 14.4018 8.68154 14.3191 8.76424C14.2364 8.84693 14.1242 8.89338 14.0073 8.89338ZM14.0073 7.08821C13.7911 7.08852 13.5781 7.14019 13.3857 7.23897C13.1934 7.33775 13.0273 7.4808 12.9011 7.65635C12.7749 7.8319 12.6923 8.03491 12.6599 8.24867C12.6276 8.46243 12.6465 8.68083 12.715 8.88585L8.20963 11.2849C8.08469 11.1033 7.91743 10.9549 7.7223 10.8524C7.52717 10.7499 7.31003 10.6965 7.08963 10.6967C6.5701 10.6967 6.09669 10.995 5.8661 11.46L1.81904 9.32538C1.3908 9.10044 1.0708 8.39644 1.10469 7.7555C1.12257 7.42138 1.23833 7.16162 1.41433 7.06091C1.52633 6.99785 1.65998 7.0035 1.80304 7.07785L1.82939 7.09197C2.90233 7.65668 6.41292 9.50609 6.56069 9.5748C6.78845 9.68021 6.91551 9.7235 7.30422 9.53903L14.5607 5.76491C14.667 5.72538 14.7913 5.6228 14.7913 5.4675C14.7913 5.25291 14.5692 5.16821 14.5682 5.16821C14.155 4.97056 13.5207 4.67409 12.9023 4.38421C11.58 3.76491 10.0807 3.06374 9.4228 2.71832C9.25356 2.62321 9.06256 2.57357 8.86843 2.57423C8.67429 2.57489 8.48363 2.62583 8.31504 2.72209L8.15692 2.80021C5.1941 4.26562 1.22892 6.23079 1.00304 6.36727C0.599275 6.61291 0.348923 7.10327 0.315981 7.71127C0.266099 8.67503 0.757393 9.68115 1.46045 10.0491L5.74092 12.2571C5.77758 12.5063 5.88248 12.7405 6.04399 12.9337C6.20551 13.1269 6.41734 13.2717 6.65605 13.352C6.89476 13.4323 7.15103 13.4449 7.39649 13.3886C7.64195 13.3322 7.86702 13.209 8.0468 13.0327C8.30092 12.7814 8.44775 12.4397 8.45339 12.0821L13.1687 9.52679C13.4421 9.74172 13.7874 9.84396 14.1338 9.81258C14.4802 9.78119 14.8015 9.61857 15.0318 9.358C15.2622 9.09743 15.3842 8.75864 15.3729 8.41102C15.3616 8.0634 15.2179 7.73326 14.971 7.48821C14.7155 7.23247 14.3688 7.08861 14.0073 7.08821Z" fill="white" />
              </g>
            </svg>
          </figure>
          <span className="text-sm text-white font-darker-grotesque font-semibold uppercase ml-1.5">{server.tools.length}  Tools</span>
        </div>
      </CardContent>

      <CardHeader>
        <CardTitle className="text-2xl font-bold truncate">{server.name}</CardTitle>
        <p className="text-slg text-[#626566] line-clamp-1 font-medium">
          {server.description}
        </p>
      </CardHeader>

      <CardContent>


        {/* URL with label + copy */}
        <div className="bg-white rounded-[12px] shadow-[0_0_16px_0_rgba(98,101,102,0.08)] flex items-center justify-between gap-4 py-3 px-4">
          <code className=" text-[#2B2B13] font-darker-grotesque text-lg font-semibold truncate">
            {url}
          </code>
          <Button
            size="icon"
            variant="outline"
            onClick={(e) => {
              e.preventDefault()
              handleCopy()
            }}
            className="min-w-10 h-10 w-10 rounded bg-[rgba(207,214,216,0.32)] cursor-pointer border-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M16.875 2.5H6.875C6.70924 2.5 6.55027 2.56585 6.43306 2.68306C6.31585 2.80027 6.25 2.95924 6.25 3.125V6.25H3.125C2.95924 6.25 2.80027 6.31585 2.68306 6.43306C2.56585 6.55027 2.5 6.70924 2.5 6.875V16.875C2.5 17.0408 2.56585 17.1997 2.68306 17.3169C2.80027 17.4342 2.95924 17.5 3.125 17.5H13.125C13.2908 17.5 13.4497 17.4342 13.5669 17.3169C13.6842 17.1997 13.75 17.0408 13.75 16.875V13.75H16.875C17.0408 13.75 17.1997 13.6842 17.3169 13.5669C17.4342 13.4497 17.5 13.2908 17.5 13.125V3.125C17.5 2.95924 17.4342 2.80027 17.3169 2.68306C17.1997 2.56585 17.0408 2.5 16.875 2.5ZM16.25 12.5H13.75V6.875C13.75 6.70924 13.6842 6.55027 13.5669 6.43306C13.4497 6.31585 13.2908 6.25 13.125 6.25H7.5V3.75H16.25V12.5Z" fill="#161B12" />
            </svg>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ServerCardAllServer({ server, url, handleCopy }: { server: MCPServer, url: string, handleCopy: () => void }) {
  return (
    <Card className="font-darker-grotesque border-transparent  bg-[rgba(255,255,255,0.08)]  hover:bg-[rgba(255,255,255,0.16)] rounded-2xl transition-all ease-linear duration-200">
      <CardContent>
        <div className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#1663E7] w-fit rounded-full opacity-90">
          <figure>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <mask id="mask0_27060_37" maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
                <path d="M0.3125 0.470703H15.3713V15.5295H0.3125V0.470703Z" fill="white" />
              </mask>
              <g mask="url(#mask0_27060_37)">
                <path d="M7.09057 11.6209C7.15032 11.6183 7.20998 11.6278 7.26595 11.6489C7.32191 11.67 7.37302 11.7022 7.41619 11.7436C7.45935 11.785 7.49367 11.8347 7.51708 11.8897C7.54048 11.9448 7.55248 12.004 7.55236 12.0638C7.55223 12.1236 7.53998 12.1827 7.51634 12.2377C7.4927 12.2926 7.45817 12.3422 7.41482 12.3834C7.37148 12.4246 7.32024 12.4566 7.26418 12.4775C7.20813 12.4983 7.14842 12.5076 7.08869 12.5047C6.97137 12.5044 6.85895 12.4576 6.77617 12.3744C6.69339 12.2913 6.64703 12.1787 6.64728 12.0614C6.64753 11.9441 6.69437 11.8316 6.7775 11.7489C6.86064 11.6661 6.97325 11.6197 7.09057 11.62V11.6209ZM14.0073 8.89338C13.8903 8.89338 13.7782 8.84693 13.6955 8.76424C13.6128 8.68154 13.5663 8.56939 13.5663 8.45244C13.5663 8.3355 13.6128 8.22334 13.6955 8.14065C13.7782 8.05796 13.8903 8.0115 14.0073 8.0115C14.1242 8.0115 14.2364 8.05796 14.3191 8.14065C14.4018 8.22334 14.4482 8.3355 14.4482 8.45244C14.4482 8.56939 14.4018 8.68154 14.3191 8.76424C14.2364 8.84693 14.1242 8.89338 14.0073 8.89338ZM14.0073 7.08821C13.7911 7.08852 13.5781 7.14019 13.3857 7.23897C13.1934 7.33775 13.0273 7.4808 12.9011 7.65635C12.7749 7.8319 12.6923 8.03491 12.6599 8.24867C12.6276 8.46243 12.6465 8.68083 12.715 8.88585L8.20963 11.2849C8.08469 11.1033 7.91743 10.9549 7.7223 10.8524C7.52717 10.7499 7.31003 10.6965 7.08963 10.6967C6.5701 10.6967 6.09669 10.995 5.8661 11.46L1.81904 9.32538C1.3908 9.10044 1.0708 8.39644 1.10469 7.7555C1.12257 7.42138 1.23833 7.16162 1.41433 7.06091C1.52633 6.99785 1.65998 7.0035 1.80304 7.07785L1.82939 7.09197C2.90233 7.65668 6.41292 9.50609 6.56069 9.5748C6.78845 9.68021 6.91551 9.7235 7.30422 9.53903L14.5607 5.76491C14.667 5.72538 14.7913 5.6228 14.7913 5.4675C14.7913 5.25291 14.5692 5.16821 14.5682 5.16821C14.155 4.97056 13.5207 4.67409 12.9023 4.38421C11.58 3.76491 10.0807 3.06374 9.4228 2.71832C9.25356 2.62321 9.06256 2.57357 8.86843 2.57423C8.67429 2.57489 8.48363 2.62583 8.31504 2.72209L8.15692 2.80021C5.1941 4.26562 1.22892 6.23079 1.00304 6.36727C0.599275 6.61291 0.348923 7.10327 0.315981 7.71127C0.266099 8.67503 0.757393 9.68115 1.46045 10.0491L5.74092 12.2571C5.77758 12.5063 5.88248 12.7405 6.04399 12.9337C6.20551 13.1269 6.41734 13.2717 6.65605 13.352C6.89476 13.4323 7.15103 13.4449 7.39649 13.3886C7.64195 13.3322 7.86702 13.209 8.0468 13.0327C8.30092 12.7814 8.44775 12.4397 8.45339 12.0821L13.1687 9.52679C13.4421 9.74172 13.7874 9.84396 14.1338 9.81258C14.4802 9.78119 14.8015 9.61857 15.0318 9.358C15.2622 9.09743 15.3842 8.75864 15.3729 8.41102C15.3616 8.0634 15.2179 7.73326 14.971 7.48821C14.7155 7.23247 14.3688 7.08861 14.0073 7.08821Z" fill="white" />
              </g>
            </svg>
          </figure>
          <span className="text-sm text-white font-darker-grotesque font-semibold uppercase ml-1.5">{server.tools.length}  Tools</span>
        </div>
      </CardContent>

      <CardHeader>
        <CardTitle className="text-2xl font-bold text-white truncate">{server.name}</CardTitle>
        <p className="text-slg text-[#A7ACAE] line-clamp-1 font-medium">
          {server.description}
        </p>
      </CardHeader>

      <CardContent>


        {/* URL with label + copy */}
        <div className="bg-[rgba(0,0,0,0.48)] rounded-[12px] shadow-[0_0_16px_0_rgba(98,101,102,0.08)] flex items-center justify-between gap-4 py-3 px-4">
          <code className=" text-[#CFD6D8] font-darker-grotesque text-lg font-semibold truncate">
            {url}
          </code>
          <Button
            size="icon"
            variant={null}
            onClick={(e) => {
              e.preventDefault()
              handleCopy()
            }}
            className="min-w-10 h-10 w-10 rounded bg-[rgba(207,214,216,0.32)] cursor-pointer border-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M16.875 2.5H6.875C6.70924 2.5 6.55027 2.56585 6.43306 2.68306C6.31585 2.80027 6.25 2.95924 6.25 3.125V6.25H3.125C2.95924 6.25 2.80027 6.31585 2.68306 6.43306C2.56585 6.55027 2.5 6.70924 2.5 6.875V16.875C2.5 17.0408 2.56585 17.1997 2.68306 17.3169C2.80027 17.4342 2.95924 17.5 3.125 17.5H13.125C13.2908 17.5 13.4497 17.4342 13.5669 17.3169C13.6842 17.1997 13.75 17.0408 13.75 16.875V13.75H16.875C17.0408 13.75 17.1997 13.6842 17.3169 13.5669C17.4342 13.4497 17.5 13.2908 17.5 13.125V3.125C17.5 2.95924 17.4342 2.80027 17.3169 2.68306C17.1997 2.56585 17.0408 2.5 16.875 2.5ZM16.25 12.5H13.75V6.875C13.75 6.70924 13.6842 6.55027 13.5669 6.43306C13.4497 6.31585 13.2908 6.25 13.125 6.25H7.5V3.75H16.25V12.5Z" fill="white" />
            </svg>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}