var mongoose = require("mongoose"),
    passportLocalMongoose = require("passport-local-mongoose");

// mongoose.Promise = global.Promise;
// mongoose.connect('mongodb://chuck:tangabutts@cluster0.ywpal.mongodb.net/cobpe', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
//   useFindAndModify: false,
//   useCreateIndex: true
// });

var userSchema = new mongoose.Schema({
  username: String,
  password: String,
  captain: Boolean
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);