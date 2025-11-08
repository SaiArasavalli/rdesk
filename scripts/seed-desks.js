/**
 * Script to seed desks into Firestore
 * 
 * Usage:
 *   node scripts/seed-desks.js
 * 
 * This script will:
 * 1. Check if desks already exist
 * 2. Create only desks that don't exist yet
 * 3. Skip desks that already exist
 * 
 * To reset all desks (delete and recreate):
 *   node scripts/seed-desks.js --reset
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnv() {
  try {
    const envPath = join(__dirname, '../.env.local');
    const envFile = readFileSync(envPath, 'utf-8');
    const envVars = {};
    
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    return envVars;
  } catch (error) {
    console.warn('Warning: Could not load .env.local file. Using defaults.');
    return {};
  }
}

const env = loadEnv();

// Firebase configuration
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "rdesk-demo.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "rdesk-demo",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "rdesk-demo.appspot.com",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DESKS_COLLECTION = 'desks';

// Define desk positions based on the layout
// Top row: y=7, Bottom row: y=28
const DESK_DEFINITIONS = [
  // Top row
  { id: 'desk-1', x: 10, y: 7, name: 'Desk 1' },
  { id: 'desk-2', x: 25, y: 7, name: 'Desk 2' },
  { id: 'desk-3', x: 40, y: 7, name: 'Desk 3' },
  { id: 'desk-4', x: 55, y: 7, name: 'Desk 4' },
  { id: 'desk-5', x: 70, y: 7, name: 'Desk 5' },
  { id: 'desk-6', x: 85, y: 7, name: 'Desk 6' },
  // Bottom row
  { id: 'desk-7', x: 10, y: 28, name: 'Desk 7' },
  { id: 'desk-8', x: 25, y: 28, name: 'Desk 8' },
  { id: 'desk-9', x: 40, y: 28, name: 'Desk 9' },
  { id: 'desk-10', x: 55, y: 28, name: 'Desk 10' },
  { id: 'desk-11', x: 70, y: 28, name: 'Desk 11' },
  { id: 'desk-12', x: 85, y: 28, name: 'Desk 12' },
];

async function initializeDesks(reset = false) {
  try {
    console.log('🚀 Starting desk initialization...');
    
    const desksRef = collection(db, DESKS_COLLECTION);
    
    if (reset) {
      console.log('⚠️  WARNING: Resetting all desks...');
      console.log('   This will delete all existing desks and their status!');
      
      const existingDesksSnapshot = await getDocs(desksRef);
      const deletePromises = existingDesksSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      console.log(`🗑️  Deleted ${existingDesksSnapshot.docs.length} existing desks\n`);
    }
    
    // Get all existing desks
    const existingDesksSnapshot = await getDocs(desksRef);
    const existingDeskIds = new Set();
    
    existingDesksSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.id) {
        existingDeskIds.add(data.id);
      }
    });
    
    console.log(`📊 Found ${existingDeskIds.size} existing desks`);
    
    // Create desks that don't exist
    let created = 0;
    let skipped = 0;
    
    for (const deskDef of DESK_DEFINITIONS) {
      if (existingDeskIds.has(deskDef.id)) {
        console.log(`⏭️  Skipping ${deskDef.id} - already exists`);
        skipped++;
        continue;
      }
      
      const deskData = {
        id: deskDef.id,
        x: deskDef.x,
        y: deskDef.y,
        name: deskDef.name,
        availability: 'available',
        heldBy: null,
        heldByUserId: null,
        heldExpiresAt: null,
        heldTimeRange: null,
        bookedBy: null,
        bookedByUserId: null,
        bookedTimeRange: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await addDoc(desksRef, deskData);
      console.log(`✅ Created ${deskDef.id} at position (${deskDef.x}, ${deskDef.y})`);
      created++;
    }
    
    console.log(`\n✨ Initialization complete!`);
    console.log(`   Created: ${created} desks`);
    console.log(`   Skipped: ${skipped} desks`);
    console.log(`   Total: ${existingDeskIds.size + created} desks in database`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing desks:', error);
    process.exit(1);
  }
}

// Check command line arguments
const reset = process.argv.includes('--reset');

// Run the initialization
initializeDesks(reset);

