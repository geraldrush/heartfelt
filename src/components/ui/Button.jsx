import React from 'react';
import { motion } from 'framer-motion';

const Button = ({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '', 
  disabled = false,
  ...props 
}) => {
  const baseClasses = 'font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'premium-button focus:ring-rose-500',
    secondary: 'glass-card text-gray-700 hover:bg-white/90 focus:ring-gray-500',
    outline: 'border-2 border-rose-500 text-rose-600 hover:bg-rose-50 focus:ring-rose-500',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-2xl'
  };
  
  const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className} ${
    disabled ? 'opacity-50 cursor-not-allowed' : ''
  }`;

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      className={classes}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default Button;