import { motion } from 'framer-motion';

const Head = ({ lefteye, righteye, mouth }) => {
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
      
      {/* Вуса ліворуч */}
      <line x1="10" y1="280" x2="65" y2="280" stroke="white" strokeWidth="8" strokeLinecap="round" />
      <line x1="10" y1="310" x2="65" y2="310" stroke="white" strokeWidth="8" strokeLinecap="round" />
      
      {/* Вуса праворуч */}
      <line x1="435" y1="280" x2="490" y2="280" stroke="white" strokeWidth="8" strokeLinecap="round" />
      <line x1="435" y1="310" x2="490" y2="310" stroke="white" strokeWidth="8" strokeLinecap="round" />

      {/* ОЧІ (ліве) */}
      <motion.text 
        x="200" y="290" 
        textAnchor="middle" 
        fill="white" 
        fontSize="80" 
        fontWeight="bold"
        style={{ fontFamily: 'monospace' }}
        transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
      >
        {lefteye}
      </motion.text>
      {/* ОЧІ (праве) */}
      <motion.text 
        x="300" y="290" 
        textAnchor="middle" 
        fill="white" 
        fontSize="80" 
        fontWeight="bold"
        style={{ fontFamily: 'monospace' }}
        transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
      >
        {righteye}
      </motion.text>

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