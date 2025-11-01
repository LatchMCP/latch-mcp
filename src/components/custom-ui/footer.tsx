"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/providers/theme-context"
import { Moon, Sun } from "lucide-react"

export default function Footer() {
    const { isDark, toggleTheme } = useTheme()

    const year = new Date().getFullYear()

    return (
        <footer
            className={`w-full relative z-3 border-t border-t-[rgba(255,255,255,0.10)] bg-[#080805] py-4 px-12 flex flex-col items-center gap-3 xl:flex-row xl:items-center xl:justify-between text-[#979797] font-darker-grotesque`}
        >
            <p className="text-lg font-semibold">© 2025 Latch. All rights reserved.</p>
            <div className="text-xl font-medium flex items-center gap-8">
                <Link href={"#"}>Docs</Link>
                <Link href={"#"}>Github</Link>
                <Link href={"#"}>Telegram</Link>
                <Link href={"#"}>X</Link>
            </div>
        </footer>
    )
}
