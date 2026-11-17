import React from "react";
import { cn } from "@/lib/utils";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "row-span-1 rounded-3xl group/bento hover:shadow-2xl transition duration-300 p-6 bg-white border border-trailrz-grey-border/80 justify-between flex flex-col space-y-4 hover:border-trailrz-red/40 relative overflow-hidden",
        className
      )}
    >
      {header}
      <div className="group-hover/bento:translate-x-1 transition duration-200">
        {icon}
        <div className="font-bold text-trailrz-black text-lg mb-1 mt-2">
          {title}
        </div>
        <div className="font-normal text-trailrz-grey text-xs sm:text-sm leading-relaxed">
          {description}
        </div>
      </div>
    </div>
  );
};
