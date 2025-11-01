import Image from 'next/image';
import React from 'react'


const features = [
    {
        title: "Turn calls into value",
        description: "Price your MCP or API calls in real time — per use, per task, or per outcome. LATCH makes every interaction measurable and payable through x402.",
        icon: "/home/tool1.png",
        iconHover: "/home/tool1-hover.png"
    },
    {
        title: "Built to fit any stack",
        description: "Add payments without touching your existing codebase. LATCH acts as a drop-in proxy layer — connect, configure, and start earning instantly.",
        icon: "/home/tool2.png",
        iconHover: "/home/tool2-hover.png"
    },
    {
        title: "Beyond payments",
        description: "Extend with analytics, access control, or on-chain proofs. The protocol is modular — payment is just the first building block.",
        icon: "/home/tool3.png",
        iconHover: "/home/tool3-hover.png"
    }
];

export default function BuildingGrid({ className }: { className?: string }) {
    return (
        <div
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl px-4 md:px-6 mx-auto ${className}`}
        >
            {features.map((feature, index) => (
                <BuildingGridCard key={index} feature={feature} />
            ))}
        </div>
    )
}

function BuildingGridCard({ feature }: { feature: typeof features[number] }) {
    return (
        <div className='font-darker-grotesque group overflow-visible'>
            <figure
                className='w-80 cursor-pointer group-hover:scale-[1.3125] transition-all ease-linear duration-200 hidden xl:block'
                style={{
                    height: '200px',
                    transformOrigin: 'left bottom'
                }}
            >
                <Image
                    src={feature.icon}
                    alt={feature.title}
                    width={0}
                    height={0}
                    sizes='100vw'
                    className='w-full h-full block group-hover:hidden'
                />
                <Image
                    src={feature.iconHover}
                    alt={feature.title}
                    width={0}
                    height={0}
                    sizes='100vw'
                    className='w-full h-full hidden group-hover:block'
                />
            </figure>

            <figure
                className='w-full h-[200px] cursor-pointer block xl:hidden'
            >
                <Image
                    src={feature.iconHover}
                    alt={feature.title}
                    width={0}
                    height={0}
                    sizes='100vw'
                    className='w-full h-full'
                />
            </figure>

            <h3 className='text-[rgba(255,255,255,0.64)] text-[32px] font-bold group-hover:text-white transition-all ease-linear duration-200'>{feature.title}</h3>
            <p className='text-[rgba(255,255,255,0.24)] text-xl font-medium group-hover:text-[rgba(255,255,255,0.64)] transition-all ease-linear duration-200'>{feature.description}</p>
        </div>
    )
}
