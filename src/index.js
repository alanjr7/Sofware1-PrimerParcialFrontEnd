const express = require('express');
const path = require('path');
const http = require('http');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.set('port', process.env.PORT || 5000);

app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));

server.listen(app.get('port'), () => {
    console.log('Servidor en el puerto', app.get('port'));
});
