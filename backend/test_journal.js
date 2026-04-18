const axios = require('axios');
const test = async () => {
    try {
        const guestId = 'guest_' + Date.now();
        console.log('--- Testing Guest ID Retrieval (Expected empty entries, no 500) ---');
        const response = await axios.get('https://localhost:3000/api/journal/entries/' + guestId);
        console.log('Success:', response.data);
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
};
test();
