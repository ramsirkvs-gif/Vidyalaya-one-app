import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js';
export const app = getApps().find(app => app.name === 'cbse') || initializeApp({
  apiKey: 'AIzaSyAYh_7B1J8ziQKAaaI3DnSGXx3JvRnLDmw',
  authDomain: 'vidyalaya-one-app.firebaseapp.com',
  databaseURL: 'https://vidyalaya-one-app-default-rtdb.firebaseio.com',
  projectId: 'vidyalaya-one-app',
  storageBucket: 'vidyalaya-one-app.firebasestorage.app',
  messagingSenderId: '291644979696',
  appId: '1:291644979696:web:7b72faa797d4f6515c0535'
}, 'cbse');
export const auth=getAuth(app);
export const db=getDatabase(app);
