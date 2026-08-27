const { writeFile } = require('fs');
require('dotenv').config();

const targetPath = './src/environments/environment.ts';

const envConfigFile = `export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: '${process.env['FIREBASE_API_KEY']}',
    authDomain: '${process.env['FIREBASE_AUTH_DOMAIN']}',
    projectId: '${process.env['FIREBASE_PROJECT_ID']}',
    storageBucket: '${process.env['FIREBASE_STORAGE_BUCKET']}',
    messagingSenderId: '${process.env['FIREBASE_MESSAGING_SENDER_ID']}',
    appId: '${process.env['FIREBASE_APP_ID']}'
  },
  weatherApiKey: '${process.env['WEATHER_API_KEY']}',
  orsKey: '${process.env['ORS_KEY']}',
  thunderforestKey: '${process.env['THUNDERFOREST_KEY']}'
};
`;

writeFile(targetPath, envConfigFile, (err: any) => {
  if (err) {
    console.error(err);
  } else {
    console.log('✅ Archivo environment.ts generado con éxito con todas tus claves');
  }
});