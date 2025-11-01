"use client"

import { AccountModal } from "@/components/custom-ui/account-modal"
import { useAccountModal } from "@/components/hooks/use-account-modal"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useSession } from "@/lib/client/auth"
import { Menu, User, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

export default function Navbar() {
  const pathname = usePathname()
  const { data: session, isPending: sessionLoading } = useSession()
  const { isOpen, defaultTab, openModal, closeModal } = useAccountModal()
  const [menuOpen, setMenuOpen] = useState(false)

  const linkClasses =
    "h-8 px-2 text-lg text-white font-semibold tracking-wider  hover:text-[#F5F56B] capitalize transition-colors duration-200"
  const activeLinkClasses = "text-[#F5F56B]"

  return (
    <header>
      <nav
        className={`fixed top-4 z-40 w-[90%] left-1/2 -translate-x-1/2 transition-colors duration-200 bg-[rgba(255,255,255,0.08)] backdrop-blur-xl rounded-lg`}
      >
        <div className="w-full px-2">
          {/* Mobile: logo left, actions right. Desktop: 3-col grid to center middle links */}
          <div className="flex items-center justify-between py-2 sm:grid sm:grid-cols-3">
            {/* Left: Logo */}
            <div className="flex items-center">
              <Link href="/">
                {/* Mobile: symbol */}
                <div className="block sm:hidden">
                  <svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 23 23" fill="none">
                    <path d="M22.1532 5.51939e-05L2.57573 22.1532H22.1532C22.1532 22.1532 14.9023 21.4147 12.727 17.7226C10.5517 14.0304 22.1532 5.51939e-05 22.1532 5.51939e-05Z" fill="#F5F56B" />
                    <path d="M0 22.1531L19.5775 0H0C0 0 7.25091 0.738438 9.42618 4.43063C11.6015 8.12281 0 22.1531 0 22.1531Z" fill="#F5F56B" />
                  </svg>
                </div>
                {/* Desktop: full logo */}
                <div className="hidden sm:flex items-center gap-3 w-[147px] h-8">
                  <Image src={"/hero/Logo.svg"} alt="Lumen pay logo" width={0} height={0} sizes="100vw" className="w-full h-full" />
                </div>
              </Link>
            </div>

            {/* Center (desktop only): BUILD / BROWSE / MONETIZE */}
            <div className="hidden sm:flex justify-center items-center gap-8">
              <Button
                asChild
                variant="link"
                className={`${linkClasses} ${pathname === "/servers" ? activeLinkClasses : ""} font-darker-grotesque`}
              >
                <Link href="/servers">Browse</Link>
              </Button>
              {/* <Button
                asChild
                variant="link"
                className={`${linkClasses} ${pathname === "/explorer" ? activeLinkClasses : ""} font-darker-grotesque`}
              >
                <Link href="/explorer">Explorer</Link>
              </Button> */}

              <Button
                asChild
                variant="link"
                className={`${linkClasses} ${pathname === "/register" ? activeLinkClasses : ""} font-darker-grotesque`}
              >
                <Link href="/register">Register</Link>
              </Button>
            </div>

            {/* Right: Connect/Account + Mobile Menu */}
            <div className="flex items-center justify-end gap-1">
              <Button
                variant={null}
                onClick={() => openModal("funds")}
                disabled={sessionLoading}
                className="flex items-center gap-2 px-6 py-2 text-lg text-[#2B2B13] font-darker-grotesque capitalize font-semibold bg-[#F5F56B] hover:bg-[#FAFABB] transition-colors duration-200 cursor-pointer"
                aria-label={session?.user ? "Open account" : "Connect"}
              >
                {session?.user ? (
                  <>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center`}
                    >
                      {session.user.image ? (
                        <Image
                          src={session.user.image}
                          alt="Profile"
                          width={24}
                          height={24}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-3 w-3" />
                      )}
                    </div>
                    <span className="hidden sm:inline">
                      {session.user.name?.split(" ")[0] || "Account"}
                    </span>
                  </>
                ) : (
                  // No icon; always show "Connect" label (mobile + desktop)
                  <span>Connect</span>
                )}
              </Button>

              {/* Mobile hamburger (right aligned) */}
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>

                {/* Fullscreen sheet, hide built-in close so we can align our own */}
                <SheetContent
                  side="right"
                  className="p-0 w-screen max-w-none h-screen sm:hidden 
             bg-[rgba(255,255,255,0.08)] backdrop-blur-xl font-darker-grotesque
             [&>button.absolute.right-4.top-4]:hidden"
                >
                  {/* Header: bigger logo + our aligned close (same row, vertically centered) */}
                  <SheetHeader className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <SheetClose asChild>
                        <Button variant={null} size="icon" className="text-foreground bg-white" aria-label="Close menu">
                          <X className="h-6 w-6" />
                        </Button>
                      </SheetClose>
                    </div>
                  </SheetHeader>


                  {/* Links */}
                  <div className="px-8 pt-6 space-y-8">
                    <SheetClose asChild>
                      <Link
                        href="/servers"
                        className="block text-lg text-white font-semibold"
                      >
                        BROWSE
                      </Link>
                    </SheetClose>
                    {/* <SheetClose asChild>
                      <Link
                        href="/build"
                        className="block text-lg text-white font-semibold"
                      >
                        EXPLORER
                      </Link>
                    </SheetClose> */}

                    <SheetClose asChild>
                      <Link
                        href="/register"
                        className="block text-lg text-white font-semibold"
                      >
                        REGISTER
                      </Link>
                    </SheetClose>
                  </div>

                  {/* Bottom: centered theme + socials */}
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <div className="flex items-center justify-center gap-2">
                      <nav className="flex items-center">
                        <Button asChild variant="link" className={linkClasses}>
                          <Link href="https://github.com/your-org-or-user" target="_blank" rel="noreferrer">
                            GITHUB
                          </Link>
                        </Button>
                        <Button asChild variant="link" className={linkClasses}>
                          <Link href="https://t.me/your-handle" target="_blank" rel="noreferrer">
                            TELEGRAM
                          </Link>
                        </Button>
                        <Button asChild variant="link" className={linkClasses}>
                          <Link href="https://x.com/your-handle" target="_blank" rel="noreferrer">
                            X
                          </Link>
                        </Button>
                      </nav>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        <AccountModal isOpen={isOpen} onClose={closeModal} defaultTab={defaultTab} />
      </nav>
    </header>

  )
}
