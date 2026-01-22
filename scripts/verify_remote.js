const fetch = require('node-fetch'); // You might need to install this or use built-in fetch if node version is new enough

const API_URL = 'https://ralphy-skills-api.rajeshkumarlawyer007.workers.dev';
const TOKEN = 'ralphy-default-admin-token';

async function check() {
    console.log(`Checking ${API_URL}/api/admin/prds/categories...`);
    try {
        const res = await fetch(`${API_URL}/api/admin/prds/categories`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });

        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Body:', text.substring(0, 500)); // First 500 chars
    } catch (e) {
        console.error('Error:', e.message);
    }
}

check();
