'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface TutTokenProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  showRings?: boolean;
  className?: string;
}

const sizes = {
  sm: 48,
  md: 80,
  lg: 120,
  xl: 200,
};

export function TutToken({ 
  size = 'md', 
  animated = true, 
  showRings = false,
  className = '' 
}: TutTokenProps) {
  const dimension = sizes[size];
  
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Animated rings */}
      {showRings && (
        <div className="absolute inset-0 flex items-center justify-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border-2 border-tut-gold"
              style={{
                width: dimension * (1.2 + i * 0.2),
                height: dimension * (1.2 + i * 0.2),
              }}
              initial={{ opacity: 0.6, scale: 0.8 }}
              animate={{ opacity: 0, scale: 1.2 }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 1,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      )}
      
      {/* Official TUT Token Logo */}
      <motion.div
        animate={animated ? {
          y: [0, -8, 0, -8, 0],
          rotateY: [0, 5, 0, -5, 0],
        } : {}}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          filter: 'drop-shadow(0 10px 25px rgba(229, 198, 75, 0.3))',
        }}
      >
        <Image
          src="/tut-token.svg"
          alt="TUT Token"
          width={dimension}
          height={dimension}
          priority
        />
      </motion.div>
    </div>
  );
}

// Simple version without Framer Motion for static contexts
export function TutTokenStatic({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const dimension = sizes[size];
  
  return (
    <Image 
      src="/tut-token.svg" 
      alt="TUT Token" 
      width={dimension} 
      height={dimension}
      className={className}
    />
  );
}
