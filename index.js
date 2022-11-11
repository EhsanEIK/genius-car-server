const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
require('dotenv').config();

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: '401-unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(401).send({ message: '401(2)-unauthorized access' });
        }
        req.decoded = decoded;
        next();
    })
}

// const uri = process.env.DB_LOCALHOST;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.fbieij7.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const servicesCollection = client.db('geniusCarDB').collection('services');
        const ordersCollection = client.db('geniusCarDB').collection('orders');

        // jwt
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' });
            res.send({ token });
        })

        // services api
        app.get('/services', async (req, res) => {
            let query = {};
            req.query.priceRange === 'low' ? query = { price: { $lt: 100 } } : query = {};
            const order = req.query.order === 'asc' ? 1 : -1;
            const cursor = servicesCollection.find(query).sort({ price: order });
            const services = await cursor.toArray();
            res.send(services);
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: id };
            const service = await servicesCollection.findOne(query);
            res.send(service);
        })

        // orders api
        app.get('/orders', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            if (decoded?.currentUser !== req.query.email) {
                return res.status(403).send({ messge: 'unauthorized access' });
            }
            let query = {};
            if (req.query.email) {
                query = { email: req.query.email };
            }
            const cursor = ordersCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        })

        app.post('/orders', verifyJWT, async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.send(result);
        })

        app.patch('/orders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const status = req.body.status;
            const query = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    status: status,
                }
            }
            const result = await ordersCollection.updateOne(query, updatedDoc);
            res.send(result);
        })

        app.delete('/orders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
        })
    }
    finally { }
}
run().catch(error => console.error(error));


app.get('/', (req, res) => {
    res.send('genius car server is running');
})

app.listen(port, () => {
    console.log('server is running on port', port);
})