const { writeFile, mkdirSync, existsSync } = require('fs');
require('dotenv').config();

const envDir = './src/environments';

// 1. Crear el directorio src/environments si no existe
if (!existsSync(envDir)) {
  mkdirSync(envDir, { recursive: true });
}

const targetPathDev = `${envDir}/environment.ts`;
const targetPathProd = `${envDir}/environment.prod.ts`;

const generateEnvFile = (isProduction: boolean) => `export const environment = {
  production: ${isProduction},
  firebaseConfig: {
    apiKey: '${process.env['FIREBASE_API_KEY'] || ''}',
    authDomain: '${process.env['FIREBASE_AUTH_DOMAIN'] || ''}',
    projectId: '${process.env['FIREBASE_PROJECT_ID'] || ''}',
    storageBucket: '${process.env['FIREBASE_STORAGE_BUCKET'] || ''}',
    messagingSenderId: '${process.env['FIREBASE_MESSAGING_SENDER_ID'] || ''}',
    appId: '${process.env['FIREBASE_APP_ID'] || ''}'
  },
  weatherApiKey: '${process.env['WEATHER_API_KEY'] || ''}',
  orsKey: '${process.env['ORS_KEY'] || ''}',
  thunderforestKey: '${process.env['THUNDERFOREST_KEY'] || ''}'
};
`;

// 2. Generar environment.ts
writeFile(targetPathDev, generateEnvFile(false), (err: any) => {
  if (err) console.error('Error generando environment.ts:', err);
  else console.log('✅ Archivo environment.ts generado con éxito');
});

// 3. Generar environment.prod.ts
writeFile(targetPathProd, generateEnvFile(true), (err: any) => {
  if (err) console.error('Error generando environment.prod.ts:', err);
  else console.log('✅ Archivo environment.prod.ts generado con éxito');
});