const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.send('genius car server is running');
})

app.listen(port, () => {
    console.log('server is running on port', port);
})