'use client';

import { motion } from 'framer-motion';

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
              className="absolute rounded-full border-2 border-tut-circuit"
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
      
      {/* Token SVG */}
      <motion.svg
        viewBox="0 0 512 512"
        width={dimension}
        height={dimension}
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
        <defs>
          <linearGradient id="coinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E5C64B" />
            <stop offset="50%" stopColor="#c9a93f" />
            <stop offset="100%" stopColor="#E5C64B" />
          </linearGradient>
          
          <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#b8942f" />
            <stop offset="50%" stopColor="#8a6f23" />
            <stop offset="100%" stopColor="#b8942f" />
          </linearGradient>
          
          <radialGradient id="innerGlow" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#f5d65b" />
            <stop offset="100%" stopColor="#c9a93f" />
          </radialGradient>
          
          <linearGradient id="ankhGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#007373" />
            <stop offset="50%" stopColor="#004D4D" />
            <stop offset="100%" stopColor="#00AFAF" />
          </linearGradient>
        </defs>
        
        {/* Coin edge (3D effect) */}
        <ellipse cx="256" cy="270" rx="220" ry="220" fill="url(#edgeGradient)" />
        
        {/* Main coin body */}
        <circle cx="256" cy="256" r="220" fill="url(#coinGradient)" />
        
        {/* Inner circle with glow */}
        <circle cx="256" cy="256" r="190" fill="url(#innerGlow)" stroke="#b8942f" strokeWidth="3" />
        
        {/* Decorative outer ring */}
        <motion.circle
          cx="256"
          cy="256"
          r="205"
          fill="none"
          stroke="#b8942f"
          strokeWidth="2"
          strokeDasharray="8 4"
          animate={animated ? { rotate: 360 } : {}}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: 'center' }}
        />
        
        {/* Circuit pattern rings */}
        <circle cx="256" cy="256" r="175" fill="none" stroke="#00AFAF" strokeWidth="1" opacity="0.3" />
        <circle cx="256" cy="256" r="165" fill="none" stroke="#00AFAF" strokeWidth="1" opacity="0.2" />
        
        {/* Ankh Symbol */}
        <g transform="translate(256, 256)">
          {/* Ankh loop */}
          <ellipse cx="0" cy="-85" rx="45" ry="55" fill="none" stroke="url(#ankhGradient)" strokeWidth="22" strokeLinecap="round" />
          
          {/* Ankh horizontal bar */}
          <rect x="-65" y="-35" width="130" height="22" rx="11" fill="url(#ankhGradient)" />
          
          {/* Ankh vertical stem */}
          <rect x="-11" y="-35" width="22" height="145" rx="11" fill="url(#ankhGradient)" />
        </g>
        
        {/* TUT text */}
        <text 
          x="256" 
          y="380" 
          textAnchor="middle" 
          fontFamily="Montserrat, Arial, sans-serif" 
          fontSize="42" 
          fontWeight="700" 
          fill="#004D4D"
        >
          TUT
        </text>
        
        {/* Decorative dots */}
        <g fill="#b8942f" opacity="0.6">
          <circle cx="256" cy="46" r="4" />
          <circle cx="256" cy="466" r="4" />
          <circle cx="46" cy="256" r="4" />
          <circle cx="466" cy="256" r="4" />
          <circle cx="108" cy="108" r="3" />
          <circle cx="404" cy="108" r="3" />
          <circle cx="108" cy="404" r="3" />
          <circle cx="404" cy="404" r="3" />
        </g>
      </motion.svg>
    </div>
  );
}

// Simple version without Framer Motion for static contexts
export function TutTokenStatic({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const dimension = sizes[size];
  
  return (
    <img 
      src="/tut-token.svg" 
      alt="TUT Token" 
      width={dimension} 
      height={dimension}
      className={className}
    />
  );
}
