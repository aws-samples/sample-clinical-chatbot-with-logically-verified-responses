// Simple Node.js script to test the facts API
const fetch = require('node-fetch');

async function testFacts() {
    try {
        console.log('Testing facts API...');
        
        // Use HTTPS in production, HTTP for local development
        const baseUrl = process.env.NODE_ENV === 'production' 
            ? 'https://localhost:8000'  // Change to your production HTTPS URL
            : 'http://localhost:8000';   // Local development server
            
        const response = await fetch(`${baseUrl}/api/facts`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Facts API Success:');
        console.log('Number of facts:', data.facts.length);
        console.log('First few facts:', data.facts.slice(0, 3));
        console.log('Timestamp:', data.timestamp);
    } catch (error) {
        console.error('❌ Facts API Error:', error.message);
    }
}

testFacts();
</text>
</invoke>