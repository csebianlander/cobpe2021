var express 		= require("express"),
		router 			= express.Router(),
		passport 		= require("passport"),
		middleware	= require("../middleware/index"),
		User 				= require("../models/user");


// SHOW REGISTER FORM
router.get("/register", middleware.isLoggedIn, function(req, res){
	if (req.user.username === "Chuck") {
  	res.render("register");
	} else {
		res.redirect("/");
	}
});

// HANDLE SIGN UP LOGIC
router.post("/register", function(req, res){
  var newUser = new User({username: req.body.username, captain: req.body.captain});
  User.register(newUser, req.body.password, function(err, user) {
    if (err) {
			return res.render("register", {"error": err.message + "."});
		}
    passport.authenticate("local")(req, res, function(){
      res.redirect("/");
    });
  });
});

// SHOW LOG IN FORM
router.get("/login", function(req, res) {
  res.render("login");
});

//HANDLE LOG IN LOGIC
router.post("/login", passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/login"
  }), function(req, res) {
});

//LOG OUT ROUTE
router.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

module.exports = router;