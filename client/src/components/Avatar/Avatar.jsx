import { useState, useEffect } from 'react';
import Head from './Head';
import Paw from './Paw';

const Avatar = ({ isTyping, isMain, submitted, username }) => {
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
    <div className={`relative flex flex-col items-center transition-transform duration-500 ${isMain ? 'scale-130' : 'scale-95'}`}>
      {/* Голова */}
      <div className="w-32 h-32">
        <Head 
          lefteye={expressions.lefteye} 
          righteye={expressions.righteye} 
          mouth={expressions.mouth} 
          isTyping={isTyping}
          showExclamation={showExclamation}
        />
      </div>

      {/* Лапи та девайс */}
      <div className="flex gap-1 -mt-10 z-10">
        <Paw isTyping={isTyping} side="left" />
        <Paw isTyping={isTyping} side="right" />
      </div>

      {/* KEYBOARD VISUALIZATION */}
      <div 
        className="relative -mt-3 z-0" 
        style={{ perspective: '300px' }}
      >
        <div className="w-28 h-6 bg-zinc-900 border-b-1 border-zinc-700 rounded-sm shadow-2xl origin-bottom"
          style={{
          transform: 'rotateX(15deg)', 
          background: 'linear-gradient(to bottom, #18181b 0%, #111114 40%, #09090b 100%)',
        }}>
          {/* Імітація рядів клавіш (ASCII-смужки) */}
          <div className="absolute inset-x-2 top-1 space-y-1.5 opacity-60">
            {/* Ряд 2  */}
            <div className="h-1 flex gap-2 px-4">
              <div className="flex-1 bg-zinc-700 rounded-sm border-b border-black shadow-inner opacity-70"></div>
            </div>
            {/* Ряд 1 */}
            <div className="h-1 flex gap-1">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex-1 bg-zinc-800 rounded-sm border-b border-black shadow-inner"></div>
              ))}
            </div>
          </div>

          {/* Легке внутрішнє світіння від "екрану" */}
          <div className="absolute inset-0 bg-white/5 blur-sm rounded-sm"></div>
        </div>

        {/* Тінь під клавіатурою для відриву від тла */}
        <div className="absolute -bottom-2 inset-x-4 h-4 bg-black/80 blur-md -z-10 rounded-full"></div>
      </div>

      {/* Нік */}
      <div className="mt-2 text-[10px] uppercase tracking-tighter text-zinc-600 font-mono">
        {isMain ? (
          <span className="text-white font-bold tracking-widest pb-0.5">_YOU</span>
        ) : (
          <span>{username || "Unknown Cat"}</span>
        )}
      </div>
    </div>
  );
};

export default Avatar;