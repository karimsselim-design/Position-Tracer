import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface BootSequenceProps {
  onComplete: () => void;
}

const BOOT_MESSAGES = [
  "INITIALIZING SECURE CONNECTION...",
  "ESTABLISHING ENCRYPTED HANDSHAKE...",
  "VERIFYING INSTITUTIONAL CREDENTIALS...",
  "SYNCING GLOBAL MARKET DATA...",
  "LOADING QUANTITATIVE MODELS...",
  "ACCESS GRANTED."
];

const BootSequence: React.FC<BootSequenceProps> = ({ onComplete }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + (Math.random() * 15);
      });
    }, 200);

    // Message sequence
    const messageInterval = setInterval(() => {
      setMessageIndex(prev => {
        if (prev >= BOOT_MESSAGES.length - 1) {
          clearInterval(messageInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 400);

    // Finish boot sequence
    const bootTimeout = setTimeout(() => {
      setIsBooting(false);
      setTimeout(onComplete, 800); // Wait for fade out
    }, 2800);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
      clearTimeout(bootTimeout);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isBooting && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] bg-[#05070a] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Background Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]"></div>

          <div className="relative z-10 flex flex-col items-center w-full max-w-md px-6">
            {/* Logo Reveal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex items-center gap-4 mb-12"
            >
              <div className="size-10 rounded bg-primary flex items-center justify-center shadow-[0_0_30px_rgba(242,13,13,0.4)]">
                <span className="material-symbols-outlined text-[24px] text-white">monitoring</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[20px] font-[900] tracking-tighter text-white uppercase font-display leading-none">
                  WHITEROCK <span className="text-primary">INTELLIGENCE LAB</span>
                </span>
                <span className="text-[10px] font-black text-slate-500 tracking-[0.3em] uppercase mt-1">
                  Terminal Protocol v4.2
                </span>
              </div>
            </motion.div>

            {/* Progress Bar */}
            <div className="w-full space-y-4">
              <div className="flex justify-between items-end">
                <motion.span 
                  key={messageIndex}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest"
                >
                  {BOOT_MESSAGES[messageIndex]}
                </motion.span>
                <span className="text-[10px] font-mono font-black text-primary tabular-nums">
                  {Math.min(100, Math.floor(progress))}%
                </span>
              </div>
              
              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden relative">
                <motion.div
                  className="absolute top-0 left-0 h-full bg-primary shadow-[0_0_10px_rgba(242,13,13,0.8)]"
                  initial={{ width: "0%" }}
                  animate={{ width: `${Math.min(100, progress)}%` }}
                  transition={{ ease: "linear", duration: 0.2 }}
                />
              </div>
            </div>

            {/* Matrix-like decorative elements */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 1 }}
              className="absolute bottom-10 left-10 text-[8px] font-mono text-slate-600 uppercase leading-relaxed hidden sm:block"
            >
              <div>SYS.MEM: OK</div>
              <div>NET.LATENCY: 12MS</div>
              <div>ENC.KEY: VALIDATED</div>
              <div>NODE: WRC-LDN-01</div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BootSequence;
