var express 				= require("express"),
		router 					= express(),
		google 					= require('googleapis'),
		sheets 					= google.sheets('v4'),
		middleware			= require("../middleware/index");

// ROOT ROUTE
router.get("/", function(req, res) {
	res.render("index");
});

// INDIVIDUAL PLAYER ROUTE
router.get("/player/:id", middleware.isLoggedIn, function(req, res) {
	id = req.params.id - 1;
	res.render("show", {id: id});
});

// SORT BY NAME ROUTE
router.get("/list", middleware.isLoggedIn, function(req, res) {
	res.render("list-alpha");
});

// SORT BY TEAM ROUTE
router.get("/list/teams", middleware.isLoggedIn, function(req, res) {
	res.render("list-teams");
});

// RESET TEAMS ROUTE
router.get("/reset-teams", middleware.isLoggedIn, function(req, res) {
	res.render("reset-teams");
});

module.exports = router;