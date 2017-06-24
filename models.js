const mongoose = require('mongoose');

// this is our schema to represent a restaurant
const restaurantSchema = mongoose.Schema({
  name: {type: String, required: true},
  borough: {type: String, required: true},
  cuisine: {type: String, required: true},
  address: {
    building: String,
    // coord will be an array of string values

    // coord: {
    //   lat: Number,
    //   lon: Number
    // }
    coord: [String],
    street: String,
    zipcode: String
  },
  // grades will be an array of objects
  grades: [{
    date: Date,
    grade: String,
    score: Number
  }]
});

// define a virtual property getter
// we can access the addressString property on a restaurant document from within our app
restaurantSchema.virtual('addressString').get(function() {
  return `${this.address.building} ${this.address.street}`.trim()});

// this virtual grabs the most recent grade for a restaurant.
restaurantSchema.virtual('grade').get(function() {
  const gradeObj = this.grades.sort((a, b) => {return b.date - a.date})[0] || {};
  return gradeObj.grade;
});

// define an instance method available on all instances of the model
// method returns an object exposing some of the fields from the underlying data
// only the fields we want
restaurantSchema.methods.apiRepr = function() {

  return {
    id: this._id,
    name: this.name,
    cuisine: this.cuisine,
    borough: this.borough,
    grade: this.grade,
    address: this.addressString
  };
}

// we define methods and virtual properties on the restaurantSchema before the call to mongoose.model

// first arg to .model specifies which collection in our database that we will map this model to
// creating a Restaurant model that will map to the 'Restaurant' collection in our database
// using the restaurantSchemas
const Restaurant = mongoose.model('Restaurant', restaurantSchema);

module.exports = {Restaurant};
