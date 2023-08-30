const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const { AuthenticationClient, WrongUsernameOrPasswordError } = require('auth0');
const bcrypt = require('bcrypt');

const app = express();

app.use(cors());

const PORT = process.env.PORT || 3001;

// Set up Auth0 client
const auth0 = new AuthenticationClient({
  domain: 'dev-hnh8e7y3kz5xmy8s.us.auth0.com',
  clientId: '3l0byitMr64T8usgV1mita1060ZEe5gD',
});

// Set up MongoDB client and connection
const uri = 'mongodb+srv://safwanalimukaddam:0204kakwanplaza@cluster0.bzoy4t8.mongodb.net/your_database_name?retryWrites=true&w=majority';
const client = new MongoClient(uri);

// Connect to MongoDB and start the server
async function startServer() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
  }
}

// Call the function to start the server
startServer();

// Function to check password validity
function isPasswordValid(plainPassword, hashedPassword) {
  return bcrypt.compareSync(plainPassword, hashedPassword);
}

// Login function using MongoDB
async function login(email, password) {
  try {
    const db = client.db('E-Super-Shop');
    const userCollection = db.collection('users');
    
    const user = await userCollection.findOne({ email });

    if (!user) {
      throw new WrongUsernameOrPasswordError(email, 'Invalid credentials');
    }

    if (!isPasswordValid(password, user.password)) {
      throw new WrongUsernameOrPasswordError(email, 'Invalid credentials');
    }

    const profile = {
      user_id: user._id.toString(),
      email: user.email,
      name: user.name,
      // Add other user data from MongoDB
    };

    return profile;
  } catch (error) {
    throw error;
  }
}

// Auth0 authentication route
app.get('/auth', (req, res) => {
  const code = req.query.code;

  auth0.authorizationCodeGrant({
    code,
  })
  .then((tokens) => {
    res.json(tokens);
  })
  .catch((err) => {
    console.error('Error getting Auth0 tokens:', err);
    res.status(500).send('Error getting Auth0 tokens');
  });
});

// Store user data in MongoDB route
app.get('/storeUserData', async (req, res) => {
  const { sub, name, email } = req.query; // Data from Auth0 user profile

  try {
    const db = client.db('E-Super-Shop'); // Replace with your database name
    const userCollection = db.collection('users');

    await userCollection.updateOne(
      { sub },
      { $set: { name, email } },
      { upsert: true }
    );

    res.send('User data stored or updated');
  } catch (err) {
    console.error('Error storing user data:', err);
    res.status(500).send('Error storing user data');
  }
});
