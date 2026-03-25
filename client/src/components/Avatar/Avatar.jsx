import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Head from './Head';
import Paw from './Paw';

const Avatar = ({ isTyping, isMain, submitted, username, isMobile, isCompact }) => {
  const [expressions, setExpressions] = useState({ lefteye: "0", righteye: "0", mouth: "u" });
  const [showExclamation, setShowExclamation] = useState(false);
  
  useEffect(() => {
    if (submitted) {
      setShowExclamation(true);
      const timer = setTimeout(() => setShowExclamation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [submitted]);

  useEffect(() => {
    const eyesList = ["0", "*", ">", "<", "-", "X", "U"];
    const mouths = ["u", "v", "_", "w"];
    
    setExpressions({
      lefteye: eyesList[Math.floor(Math.random() * eyesList.length)],
      righteye: eyesList[Math.floor(Math.random() * eyesList.length)],
      mouth: mouths[Math.floor(Math.random() * mouths.length)]
    });
  }, []);

  return (
    <div className={`flex flex-col items-center transition-all duration-500 ${isCompact ? 'relative scale-100' : 'absolute bottom-22 scale-120'}`}>
      {/* Голова */}
      <div className={`${isCompact ? 'w-12 h-12' : 'w-32 h-32'} transition-all`}>
          <Head 
            lefteye={expressions.lefteye} 
            righteye={expressions.righteye} 
            mouth={expressions.mouth} 
            isTyping={isTyping}
            showExclamation={showExclamation}
          />
      </div>

      {/* Лапи та девайс */}
      {!isCompact && (
        <>
          <div className="flex gap-1 -mt-10 z-10">
            <Paw isTyping={isTyping} side="left" />
            <Paw isTyping={isTyping} side="right" />
          </div>

          {/* DEVICE VISUALIZATION */}
          <div className="relative -mt-3 z-0" style={{ perspective: '300px' }}>
            {!isMobile ? (
              /* KEYBOARD */
              <motion.div
                className="w-28 h-6 bg-zinc-900 border-b border-zinc-700 rounded-sm shadow-2xl origin-bottom"
                style={{ background: 'linear-gradient(to bottom, #18181b 0%, #111114 40%, #09090b 100%)' }}
              >
                <div className="absolute inset-x-2 top-1 space-y-1 opacity-60">
                  <div className="h-1 flex gap-1 px-4">
                    <div className="flex-1 bg-zinc-700 rounded-sm border-b border-black shadow-inner"></div>
                  </div>
                  <div className="h-1 flex gap-1">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="flex-1 bg-zinc-800 rounded-sm border-b border-black shadow-inner"></div>
                    ))}
                  </div>
                </div>
                <div className="absolute inset-0 bg-white/5 blur-sm"></div>
              </motion.div>
            ) : (
              /* SMARTPHONE */
              <motion.div
                className="w-12 h-15 bg-zinc-900 border-2 border-zinc-700 rounded-lg shadow-2xl origin-bottom overflow-hidden p-1"
                style={{ transform: 'rotateX(25deg)' }}
              >
                {/* Екран смартфона з ASCII кодом */}
                <div className="w-full h-full bg-zinc-950 rounded-md relative overflow-hidden flex flex-col justify-end p-1">
                    <div className="w-full h-[2px] bg-green-500/30 mb-1 animate-pulse"></div>
                    <div className="w-2/3 h-[1px] bg-white/20 mb-1"></div>
                    <div className="w-full h-[1px] bg-white/10"></div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-green-500/5 to-transparent"></div>
                </div>
              </motion.div>
            )}
            <div className="absolute -bottom-2 inset-x-0 h-4 bg-black/80 blur-md -z-10 rounded-full mx-auto" style={{width: isMobile ? '40px' : '100px'}}></div>
          </div>
        </>
      )}

      {/* Нік */}
      <div className={`mt-1 font-mono uppercase tracking-tighter 
        ${isCompact ? 'text-[8px]' : 'text-[10px]'} 
        ${isMain ? 'text-white font-bold' : 'text-zinc-600'}`}
      >
        {isMain ? "_YOU" : (username || "Unknown")}
      </div>
    </div>
  );
};

export default Avatar;