import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">

function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      style={{
        boxShadow: "0 2px 4px 0 rgba(40, 41, 61, 0.04), 0 8px 16px 0 rgba(96, 97, 112, 0.16)"
      }}
      className={cn(
        `${isActive ? " bg-white rounded-full text-[#2B2B13]" : ""} min-w-8 w-8 h-8 flex items-center justify-center text-lg font-bold font-darker-grotesque`,
        className
      )}
      {...props}
    />
  )
}

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      style={{
        boxShadow: "0 2px 4px 0 rgba(40, 41, 61, 0.04), 0 8px 16px 0 rgba(96, 97, 112, 0.16)"
      }}
      className={cn("gap-1 px-2.5 sm:pr-2.5 text-[#626566] cursor-pointer font-darker-grotesque text-lg font-bold flex items-center min-w-8 w-8 h-8 bg-[rgba(255,255,25,0.1)] rounded-full hover:bg-transparent", className)}
      {...props}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 12.6666L6 7.99996L10 3.33329" stroke="white" stroke-width="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      style={{
        boxShadow: "0 2px 4px 0 rgba(40, 41, 61, 0.04), 0 8px 16px 0 rgba(96, 97, 112, 0.16)"
      }}
      className={cn("gap-1 px-2.5 sm:pr-2.5 text-[#626566] cursor-pointer font-darker-grotesque text-lg font-bold flex items-center min-w-8 w-8 h-8 bg-[rgba(255,255,25,0.1)] rounded-full hover:bg-transparent", className)}
      {...props}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M6 3.33337L10 8.00004L6 12.6667" stroke="white" stroke-width="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}
