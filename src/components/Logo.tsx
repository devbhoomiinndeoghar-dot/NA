import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = "md" }) => {
  const dimensions = {
    sm: "w-10 h-10 border-2",
    md: "w-20 h-20 border-4",
    lg: "w-32 h-32 border-4",
  };

  const crownSize = {
    sm: "text-base",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      {/* Crown */}
      <div className={`text-[#FF6B35] animate-pulse duration-[3000ms] ${crownSize[size]} leading-none mb-0.5`}>
        👑
      </div>

      {/* Circle ME Logo */}
      <div
        className={`bg-white text-[#1A1A1A] flex items-center justify-center font-black font-sans ${dimensions[size]} border-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]`}
      >
        <span className={`${size === "sm" ? "text-xs" : size === "md" ? "text-xl" : "text-3xl"} tracking-tighter italic font-black`}>
          ME
        </span>
      </div>

      {/* Text logo */}
      {size !== "sm" && (
        <div className="mt-3">
          <div
            className={`font-sans font-black tracking-tighter italic leading-none text-[#1A1A1A] ${
              size === "lg" ? "text-3xl md:text-4xl" : "text-xl"
            }`}
          >
            MASALA EXPRESS
          </div>
          <div className="text-[9px] uppercase tracking-widest font-black text-[#FF6B35] mt-1">
            Deoghar • V Bazar
          </div>
        </div>
      )}
    </div>
  );
};
