import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const Head = ({ lefteye, righteye, mouth, showExclamation }) => {
  const [blink, setBlink] = useState(false);
  const [lookDir, setLookDir] = useState(0);
  
  // Внутрішні стани для динамічної зміни виразу обличчя
  const [currentEyes, setCurrentEyes] = useState({ left: lefteye, right: righteye });
  const [currentMouth, setCurrentMouth] = useState(mouth);

  // Списки можливих символів для випадкової зміни
  const eyesList = ["0", "*", ">", "<", "-", "X", "U", "$", "@"];
  const mouthsList = ["u", "v", "_", "w", ".", "3"];

  // Синхронізація з пропсами, якщо вони приходять зовні (наприклад, при зміні гравця)
  useEffect(() => {
    setCurrentEyes({ left: lefteye, right: righteye });
    setCurrentMouth(mouth);
  }, [lefteye, righteye, mouth]);

  useEffect(() => {
    const interval = setInterval(() => {
      const rand = Math.random();

      // Логіка моргання
      if (rand < 0.4) { 
        setBlink(true);
        
        // З шансом 20% змінюємо стиль очей ПІСЛЯ моргання
        if (Math.random() < 0.2) {
          const newEye = eyesList[Math.floor(Math.random() * eyesList.length)];
          const changeType = Math.random();

          if (changeType < 0.33) {
            // Змінюємо тільки ліве
            setCurrentEyes(prev => ({ ...prev, left: newEye }));
          } else if (changeType < 0.66) {
            // Змінюємо тільки праве
            setCurrentEyes(prev => ({ ...prev, right: newEye }));
          } else {
            // Змінюємо обидва (синхронно)
            setCurrentEyes({ left: newEye, right: newEye });
          }
        }

        setTimeout(() => setBlink(false), 150);
      } 
      
      // Логіка зміни рота (шанс 10% незалежно від моргання)
      if (Math.random() < 0.1) {
        const newMouth = mouthsList[Math.floor(Math.random() * mouthsList.length)];
        setCurrentMouth(newMouth);
      }

      // Шанс подивитися вбік
      if (rand > 0.7) {
        setLookDir(Math.random() > 0.5 ? 15 : -15);
        setTimeout(() => setLookDir(0), 1500);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [lefteye, righteye, mouth]);

  return (
    <svg width="100%" height="100%" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
      {/* Контур голови */}
      <path 
        d="M250,110 C190,110 140,150 115,200 L80,230 L105,260 L75,300 L120,340 C160,430 340,430 380,340 L425,300 L395,260 L420,230 L385,200 C360,150 310,110 250,110 Z" 
        fill="black" stroke="white" strokeWidth="8" strokeLinejoin="round"
      />
      
      {/* Вуха */}
      <path d="M105,205 L105,80 L200,115" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M395,205 L395,80 L300,115" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
      
      {/* Ніс */}
      <path d="M235,310 L265,310 L250,335 Z" fill="white"/>

      {/* Анімаця надсилання "!" */}
      <motion.text
        x="420" y="80"
        fill="#ff9500"
        fontSize="150"
        fontWeight="bold"
        initial={{ opacity: 0, scale: 0 }}
        animate={showExclamation ? { opacity: 1, scale: 1, y: [0, -20, 0] } : { opacity: 0, scale: 0 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        !
      </motion.text>
      
      {/* Вуса */}
      <line x1="10" y1="280" x2="65" y2="280" stroke="white" strokeWidth="8" strokeLinecap="round" />
      <line x1="10" y1="310" x2="65" y2="310" stroke="white" strokeWidth="8" strokeLinecap="round" />
      <line x1="435" y1="280" x2="490" y2="280" stroke="white" strokeWidth="8" strokeLinecap="round" />
      <line x1="435" y1="310" x2="490" y2="310" stroke="white" strokeWidth="8" strokeLinecap="round" />

      {/* ОЧІ */}
      <motion.g animate={{ x: lookDir }} transition={{ type: "spring", stiffness: 100 }}>
        {/* Ліве око */}
        <text 
          x="190" y="290" 
          textAnchor="middle" 
          fill="white" 
          fontSize="80" 
          fontWeight="bold"
          style={{ fontFamily: 'monospace' }}
        >
          {blink ? "_" : currentEyes.left}
        </text>
        {/* Праве око */}
        <text 
          x="310" y="290" 
          textAnchor="middle" 
          fill="white" 
          fontSize="80" 
          fontWeight="bold"
          style={{ fontFamily: 'monospace' }}
        >
          {blink ? "_" : currentEyes.right}
        </text>
      </motion.g>

      {/* РОТ */}
      <text 
        x="250" y="380" 
        textAnchor="middle" 
        fill="white" 
        fontSize="60"
        style={{ fontFamily: 'monospace' }}
      >
        {currentMouth}
      </text>
    </svg>
  );
};

export default Head;