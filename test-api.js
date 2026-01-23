
const http = require('http');

const data = JSON.stringify({
    owner: 'superdesigndev',
    repo: 'superdesign-skill'
});

const options = {
    hostname: 'localhost',
    port: 8787,
    path: '/api/skills/resolve',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let body = '';

    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        try {
            console.log(JSON.stringify(JSON.parse(body), null, 2));
        } catch (e) {
            console.log(body);
        }
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
