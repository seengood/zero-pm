#!/usr/bin/env node

/**
 * Script to copy SVAR Gantt CSS to local styles directory
 * This prevents Turbopack CSS parsing errors in Next.js
 */

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '../node_modules/@svar-ui/react-gantt/dist/index.css');
const targetFile = path.join(__dirname, '../src/styles/gantt-svar.css');
const targetDir = path.dirname(targetFile);

function copyGanttCSS() {
    try {
        // Ensure target directory exists
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
            console.log('Created styles directory:', targetDir);
        }

        // Check if source file exists
        if (!fs.existsSync(sourceFile)) {
            console.error('Source CSS file not found:', sourceFile);
            console.error('Please ensure @svar-ui/react-gantt is installed');
            process.exit(1);
        }

        // Copy the file
        fs.copyFileSync(sourceFile, targetFile);
        console.log('✅ Copied SVAR Gantt CSS to:', targetFile);
        
        // Add header comment
        const cssContent = fs.readFileSync(targetFile, 'utf8');
        const header = `/* SVAR Gantt CSS - Local Copy */
/* This file is automatically copied from node_modules/@svar-ui/react-gantt/dist/index.css */
/* Generated on: ${new Date().toISOString()} */

`;
        
        fs.writeFileSync(targetFile, header + cssContent);
        console.log('✅ Added header comment to CSS file');
        
    } catch (error) {
        console.error('❌ Error copying CSS file:', error.message);
        process.exit(1);
    }
}

// Run the script
copyGanttCSS();
