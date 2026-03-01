import { useState, useEffect } from 'react';
import Head from './Head';
import Paw from './Paw';

const Avatar = ({ isTyping, isMain, submitted }) => {
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
    <div className={`relative flex flex-col items-center transition-transform duration-500 ${isMain ? 'scale-110' : 'scale-75'}`}>
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

      {/* Візуалізація девайсу (Клавіатура для ПК, Телефон для мобільного ) */}
      <div className="w-16 h-4 bg-zinc-800 border border-zinc-700 rounded-t-md -mt-2 flex px-1 items-center">
          <div className="w-full h-[1px] bg-zinc-600 opacity-50"></div>
      </div>
    </div>
  );
};

export default Avatar;