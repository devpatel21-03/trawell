// Environment variable checker for debugging
export const checkEnvironmentVariables = () => {
  const requiredVars = [
    'VITE_GOOGLE_GEMINI_AI_API_KEY',
    'VITE_GOOGLE_PLACE_API_KEY',
    'VITE_GOOGLE_AUTH_CLIENT_ID'
  ];

  const optionalVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_FIREBASE_MEASUREMENT_ID'
  ];

  const missing = [];
  const warnings = [];

  // Check required variables
  requiredVars.forEach(varName => {
    if (!import.meta.env[varName]) {
      missing.push(varName);
    }
  });

  // Check optional variables
  optionalVars.forEach(varName => {
    if (!import.meta.env[varName]) {
      warnings.push(varName);
    }
  });

  return {
    missing,
    warnings,
    isValid: missing.length === 0
  };
};

// Log environment status
export const logEnvironmentStatus = () => {
  const status = checkEnvironmentVariables();
  
  console.log('=== Environment Variables Status ===');
  
  if (status.isValid) {
    console.log('✅ All required environment variables are set');
  } else {
    console.error('❌ Missing required environment variables:', status.missing);
  }
  
  if (status.warnings.length > 0) {
    console.warn('⚠️ Missing optional environment variables:', status.warnings);
  }
  
  console.log('=====================================');
  
  return status;
};
