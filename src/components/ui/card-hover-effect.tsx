"use client";
import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Heart, Users, Compass, Music, Utensils, Palette } from "lucide-react";

const ICON_MAP: Record<string, any> = {
  Heart,
  Users,
  Compass,
  Music,
  Utensils,
  Palette,
  "Date Night": Heart,
  "Friends Night": Users,
  "Something Different": Compass,
  "Music & Rhythm": Music,
  "Food Lovers": Utensils,
  "Creative Minds": Palette,
};

export const HoverEffect = ({
  items,
  className,
}: {
  items: {
    title: string;
    description: string;
    link: string;
    iconName?: string;
    image?: string;
  }[];
  className?: string;
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div
      className={cn(
        "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 py-6",
        className
      )}
    >
      {items.map((item, idx) => {
        const Icon = (item.iconName && ICON_MAP[item.iconName]) || ICON_MAP[item.title];
        return (
          <a
            href={item?.link}
            key={item?.link + idx}
            className="relative group block p-2 h-full w-full"
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <AnimatePresence>
              {hoveredIndex === idx && (
                <motion.span
                  className="absolute inset-0 h-full w-full bg-trailrz-red/15 block rounded-2xl"
                  layoutId="hoverBackground"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    transition: { duration: 0.15 },
                  }}
                  exit={{
                    opacity: 0,
                    transition: { duration: 0.15, delay: 0.2 },
                  }}
                />
              )}
            </AnimatePresence>
            <div className="rounded-2xl h-full w-full p-4 overflow-hidden bg-neutral-900 border border-white/10 group-hover:border-trailrz-red/50 relative z-20 flex flex-col justify-end aspect-[4/5] shadow-md transition-colors">
              {item.image && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                </>
              )}
              <div className="relative z-30">
                {Icon && (
                  <Icon className="w-5 h-5 text-trailrz-red mb-1 group-hover:scale-110 transition-transform" />
                )}
                <h4 className="text-white font-bold tracking-tight text-sm leading-snug">
                  {item.title}
                </h4>
                <p className="text-white/60 text-[11px] mt-0.5 line-clamp-1">
                  {item.description}
                </p>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
};
