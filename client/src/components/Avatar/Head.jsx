import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const Head = ({ lefteye, righteye, mouth, showExclamation }) => {
  const [blink, setBlink] = useState(false);
  const [lookDir, setLookDir] = useState(0);

  useEffect(() => {
    // Логіка випадкового кліпання та поглядів
    const interval = setInterval(() => {
      const rand = Math.random();
      if (rand < 0.2) { // 20% шанс кліпнути
        setBlink(true);
        setTimeout(() => setBlink(false), 150);
      } else if (rand < 0.4) { // 20% шанс подивитися вбік
        setLookDir(Math.random() > 0.5 ? 15 : -15);
        setTimeout(() => setLookDir(0), 1500);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);


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
      
      {/* Вуса ліворуч */}
      <line x1="10" y1="280" x2="65" y2="280" stroke="white" strokeWidth="8" strokeLinecap="round" />
      <line x1="10" y1="310" x2="65" y2="310" stroke="white" strokeWidth="8" strokeLinecap="round" />
      
      {/* Вуса праворуч */}
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
          {blink ? "_" : lefteye}
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
          {blink ? "_" : righteye}
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
        {mouth}
      </text>
    </svg>
  );
};

export default Head;