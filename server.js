const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');

// Mongoose internally uses a promise-like object,
// but its better to make Mongoose use built in es6 promises
mongoose.Promise = global.Promise;

// config.js is where we control constants for entire
// app like PORT and DATABASE_URL
const {PORT, DATABASE_URL} = require('./config');
const {Restaurant} = require('./models');

const app = express();
app.use(bodyParser.json());

app.get('/restaurants', (req, res) => {
  
  // checks for query params against a list of valid queryable fields
  const queryableFields = ['cuisine', 'borough'];
  let filter = {};
  for (field in req.query) {
    if (queryableFields.indexOf(field) > -1) {
      filter[field] = req.query[field];
    }
  };

  Restaurant
    .find(filter)
    // find first 10 document
    .limit(10)
    // querying database is async so we want to return a promise
    // .exec makes our query return a promise
    .exec()
    // upon successful query we recieve an array of restaurants
    // map through array.
    // for each restaurant call apiRepr, return representation of doc w/ only props we want
    // assign array to restaurant property and return object as json in HTTP response
    .then(restaurants => {
      res.json({
        restaurants: restaurants.map(
          (restaurant) => restaurant.apiRepr())
      });
    })
    .catch(
      err => {
        console.error(err);
        res.status(500).json({message: 'Internal server error'});
    });
});

// handle requests for individual restaurants by id
app.get('/restaurants/:id', (req, res) => {
  Restaurant
    // query for restaurant by _id property in document
    .findById(req.params.id)
    // make query return a promise
    .exec()
    // recieve a single restaurant
    // call apiRepr to return representation of document w/ only props we want
    .then(restaurant =>res.json(restaurant.apiRepr()))
    .catch(err => {
      console.error(err);
        res.status(500).json({message: 'Internal server error'})
    });
});


app.post('/restaurants', (req, res) => {

  const requiredFields = ['name', 'borough', 'cuisine'];
  for (let i=0; i<requiredFields.length; i++) {
    const field = requiredFields[i];
    if (!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`
      console.error(message);
      return res.status(400).send(message);
    }
  }

  Restaurant
    .create({
      name: req.body.name,
      borough: req.body.borough,
      cuisine: req.body.cuisine,
      grades: req.body.grades,
      address: req.body.address})
    .then(
      restaurant => res.status(201).json(restaurant.apiRepr()))
    .catch(err => {
      console.error(err);
      res.status(500).json({message: 'Internal server error'});
    });
});


app.put('/restaurants/:id', (req, res) => {
  // ensure that the id in the request path and the one in request body match
  if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
    const message = (
      `Request path id (${req.params.id}) and request body id ` +
      `(${req.body.id}) must match`);
    console.error(message);
    res.status(400).json({message: message});
  }

  // we only support a subset of fields being updateable.
  // if the user sent over any of the updatableFields, we udpate those values
  // in document
  const toUpdate = {};
  const updateableFields = ['name', 'borough', 'cuisine', 'address'];

  updateableFields.forEach(field => {
    if (field in req.body) {
      toUpdate[field] = req.body[field];
    }
  });

  Restaurant
    // all key/value pairs in toUpdate will be updated -- that's what `$set` does
    .findByIdAndUpdate(req.params.id, {$set: toUpdate})
    .exec()
    .then(restaurant => res.status(202).json(restaurant.apiRepr()))
    .catch(err => res.status(500).json({message: 'Internal server error'}));
});

app.delete('/restaurants/:id', (req, res) => {
  Restaurant
    .findByIdAndRemove(req.params.id)
    .exec()
    .then(restaurant => res.status(204).end())
    .catch(err => res.status(500).json({message: 'Internal server error'}));
});

// catch-all endpoint if client makes request to non-existent endpoint
app.use('*', function(req, res) {
  res.status(404).json({message: 'Not Found'});
});

// closeServer needs access to a server object, but that only
// gets created when `runServer` runs, so we declare `server` here
// and then assign a value to it in run
let server;

// this function connects to our database, then starts the server
function runServer(databaseUrl=DATABASE_URL, port=PORT) {

  return new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, err => {
      if (err) {
        return reject(err);
      }
      server = app.listen(port, () => {
        console.log(`Your app is listening on port ${port}`);
        resolve();
      })
      .on('error', err => {
        mongoose.disconnect();
        reject(err);
      });
    });
  });
}

// this function closes the server, and returns a promise. we'll
// use it in our integration tests later.
function closeServer() {
  return mongoose.disconnect().then(() => {
     return new Promise((resolve, reject) => {
       console.log('Closing server');
       server.close(err => {
           if (err) {
               return reject(err);
           }
           resolve();
       });
     });
  });
}

// if server.js is called directly (aka, with `node server.js`), this block
// runs. but we also export the runServer command so other code (for instance, test code) can start the server as needed.
if (require.main === module) {
  runServer().catch(err => console.error(err));
};

// we export these variables and methods for other files in our app that need them, like test files
// in this cose the above if check will not pass and we call runServer from our test files instead
module.exports = {app, runServer, closeServer};
