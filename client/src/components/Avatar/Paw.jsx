import { motion } from 'framer-motion';

const Paw = ({ isTyping, side = "left" }) => {
  return (
    <motion.div
      animate={isTyping ? {
        y: side === "left" ? [0, -10, 0] : [0, 10, 0] 
      } : { y: [0, 0, 0] }}
      transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
      className="w-12 h-12"
    >
      <svg width="50" height="50" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M 20 90 
                L 70 90
                C 80 40, 20 40, 20 75 
                Z" fill="none" stroke="white" strokeWidth="4"/>
        </svg>
    </motion.div>
  );
};

export default Paw;