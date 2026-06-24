import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface GooeyNavItem {
  label: string;
  href: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export interface GooeyNavProps {
  items: GooeyNavItem[];
  animationTime?: number;
  particleCount?: number;
  particleDistances?: [number, number];
  particleR?: number;
  timeVariance?: number;
  colors?: number[];
  initialActiveIndex?: number;
  onActiveChange?: (index: number) => void;
}

const GooeyNav: React.FC<GooeyNavProps> = ({
  items,
  initialActiveIndex = 0,
  onActiveChange
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(initialActiveIndex);

  useEffect(() => {
    setActiveIndex(initialActiveIndex);
  }, [initialActiveIndex]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, index: number) => {
    setActiveIndex(index);
    if (items[index].onClick) {
      items[index].onClick!(e);
    }
    if (onActiveChange) {
      onActiveChange(index);
    }
  };

  return (
    <div className="relative bg-black/45 rounded-full p-1 border border-white/10 flex items-center shadow-lg">
      <ul className="flex items-center gap-1 list-none p-0 m-0 relative">
        {items.map((item, index) => {
          const isActive = activeIndex === index;
          return (
            <li key={index} className="relative py-1.5 px-3.5">
              {/* Sliding dynamic background pill */}
              {isActive && (
                <motion.span
                  layoutId="activePillNav"
                  className="absolute inset-0 bg-white rounded-full z-0 shadow-sm"
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                />
              )}
              {/* Clickable text label */}
              <a
                href={item.href}
                onClick={(e) => handleClick(e, index)}
                className={`relative z-10 outline-none inline-block font-semibold text-xs tracking-wide uppercase transition-colors duration-200 select-none ${
                  isActive
                    ? 'text-gray-950 font-bold'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default GooeyNav;
