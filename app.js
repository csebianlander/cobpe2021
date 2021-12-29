var express         = require("express"),
		http 						= require('http'),
		enforce 				= require('express-sslify'),
    app             = express(),
    bodyParser      = require("body-parser"),
    mongoose        = require("mongoose"),
    passport        = require("passport"),
    LocalStrategy   = require("passport-local"),
    methodOverride  = require("method-override"),
    User            = require("./models/user"),
		moment					= require("moment"),
		middleware			= require("./middleware/index");

app.use(enforce.HTTPS({ trustProtoHeader: true }));

// GOOGLE API: DB PULLDOWN
require('dotenv').config();
var google = require('googleapis'),
		sheetsApi = google.sheets('v4'),
		googleAuth = require('./g-auth');

var parsedData = {},
		teamCount = Number,
        scheduleData = [],
		SPREADSHEET_ID = "16zZGQ52pmZBLnoGfJ_KTIaWIMufPZCAhZe5gVVDqUDE";

googleAuth.authorize()
    .then((auth) => {
        sheetsApi.spreadsheets.values.batchGet({
            auth: auth,
            spreadsheetId: SPREADSHEET_ID,
            ranges: ["Biographical!A:P", "Notes!A:F", "Schedule!A:G"],
        }, function (err, response) {
            if (err) {
                console.log('The API returned an error: ' + err);
                return console.log(err);
            }
			unparsedData = [response.valueRanges[0].values, response.valueRanges[1].values];
            parsedData = middleware.parseInitialDatabase(unparsedData);
			teamCount = middleware.determineTeamCount(parsedData);
            scheduleData = middleware.parseSchedule(response.valueRanges[2].values, teamCount);
            console.log("Database loaded.");
            console.log(scheduleData);
        });
    })
    .catch((err) => {
        console.log('auth error', err);
    });

// PASSING MOMENT.JS TO EJS
exports.index = function(req, res) {
    // send moment to your ejs
    res.render('index', { moment: moment });
}

// REQUIRING ROUTES
var indexRoutes			= require("./routes/index");
var authRoutes			= require("./routes/auth");

// EXPRESS CONFIG
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));

// MONGOOSE AND PASSPORT CONFIG
process.on('unhandledRejection', error => {
  // Will print "unhandledRejection err is not defined"
  console.log('unhandledRejection', error.message);
});

mongoose.Promise = global.Promise;
mongoose.connect('mongodb+srv://chuck:tangabutts@cluster0.ywpal.mongodb.net/cobpe?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true
});

app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));

// PASSPORT CONFIGURATION
app.use(require("express-session")({
  secret: "Tennis, it is a game of kings",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
  res.locals.currentUser = req.user;  //adds current user info to all templates
	res.locals.database = parsedData;
    res.locals.schedule = scheduleData;
	res.locals.teamCount = teamCount;
  next();
});  

// USE ROUTES
app.use("/", indexRoutes);
app.use("/", authRoutes);


// GSHEETS ROUTES (here so the gSheets dependencies are in place and so it has quick access to the db)

// ADD COMMENT ROUTE 
app.post("/player/:id", middleware.isLoggedIn, function(req, res) {
	var newDate = new Date();
	console.log (newDate);
    var estDate = moment(newDate).utcOffset(-240);
	var noteDate = moment(estDate).format('dddd, MMMM D, h:mm a');
    var scoreInteger = parseInt(req.body.noteOverallScore);
	console.log(noteDate);
	
    var stickerCheck = parseInt(req.body.sticker);

    console.log(stickerCheck);

    if (stickerCheck === 0) {
        var newNote = {
            range: "Notes",
            majorDimension: "ROWS",
            values: [[req.body.noteBallperson, req.user.username, noteDate, "Overall", scoreInteger, req.body.noteNote]],
        };

        var newPushNote = {
            ballperson: newNote.values[0][0],
            author: newNote.values[0][1],
            timestamp: newNote.values[0][2],
            category: newNote.values[0][3],
            score: newNote.values[0][4],
            note: newNote.values[0][5]
        };

        // Category-based scoring: check for category scores, create array of category + score, then send each
        var categoryNames = ["Athleticism", "Rolling", "Awareness", "Decisionmaking", "Effort"];
        var categoryScores = [parseInt(req.body.ath), parseInt(req.body.rol), parseInt(req.body.awa),
                                 parseInt(req.body.dec), parseInt(req.body.eff)];

        console.log(categoryScores);

        categoryScores.forEach(function(category, index) {
            if (category > 0) {
                var categoryNote = {
                    ballperson: newPushNote.ballperson,
                    author: newPushNote.author,
                    timestamp: newPushNote.timestamp,
                    category: categoryNames[index],
                    score: category,
                    note: newPushNote.note
                };

                var catNoteSend = {
                    range: "Notes",
                    majorDimension: "ROWS",
                    values: [[categoryNote.ballperson, categoryNote.author, categoryNote.timestamp,
                                categoryNote.category, categoryNote.score, categoryNote.note]],
                };


                googleAuth.authorize()
                    .then((auth) => {
                        sheetsApi.spreadsheets.values.append({
                            auth: auth,
                            spreadsheetId: SPREADSHEET_ID,
                            range: ["Notes"],
                                        valueInputOption: "RAW",
                                        insertDataOption: "INSERT_ROWS",
                                        resource: catNoteSend
                        }, function (err, response) {
                            if (err) {
                                console.log('The API returned an error: ' + err);
                                return console.log(err);
                            }
                        });
                    })
                    .catch((err) => {
                        console.log('auth error', err);
                    });

                parsedData[(req.params.id - 1)].notes.push(categoryNote);
            }
        })
    	
        if (newPushNote.note.length > 0 || newPushNote.score.length > 0) {
        	googleAuth.authorize()
            .then((auth) => {
                sheetsApi.spreadsheets.values.append({
                    auth: auth,
                    spreadsheetId: SPREADSHEET_ID,
                    range: ["Notes"],
        						valueInputOption: "RAW",
        						insertDataOption: "INSERT_ROWS",
        						resource: newNote
                }, function (err, response) {
                    if (err) {
                        console.log('The API returned an error: ' + err);
                        return console.log(err);
                    }
                });
            })
            .catch((err) => {
                console.log('auth error', err);
            });

            parsedData[(req.params.id - 1)].notes.push(newPushNote);
    	}
    }

    else {
        console.log ("Submitted sticker " + stickerCheck);
    }

	
	
	res.redirect("back");
})

// REFRESH DB ROUTE
app.get("/refresh", middleware.isLoggedIn, function(req, res) {
	googleAuth.authorize()
    .then((auth) => {
        sheetsApi.spreadsheets.values.batchGet({
            auth: auth,
            spreadsheetId: SPREADSHEET_ID,
            ranges: ["Biographical!A:P", "Notes!A:F", "Schedule!A:G"],
        }, function (err, response) {
            if (err) {
                console.log('The API returned an error: ' + err);
                return console.log(err);
            }
            unparsedData = [response.valueRanges[0].values, response.valueRanges[1].values];
            parsedData = middleware.parseInitialDatabase(unparsedData);
            teamCount = middleware.determineTeamCount(parsedData);
            scheduleData = middleware.parseSchedule(response.valueRanges[2].values, teamCount);
            console.log("Database reloaded.");
            console.log(scheduleData);
        });
    })
    .catch((err) => {
        console.log('auth error', err);
    });
	res.redirect("/");
});

// CHANGE TEAM NUMBER ROUTE
app.post("/player/:id/teamset", middleware.isLoggedIn, function(req, res) {
  
  var newTeamNumber = req.body.team;
  var playerID = Number(req.params.id); playerID++;
  
  console.log(req.body.team);
  console.log(playerID);
    	
	googleAuth.authorize()
    .then((auth) => {
        sheetsApi.spreadsheets.values.update({
            auth: auth,
            spreadsheetId: SPREADSHEET_ID,
            range: "Biographical!A" + playerID,
						valueInputOption: "USER_ENTERED",
						resource: { values: [[newTeamNumber]] }
        }, function (err, response) {
            if (err) {
                console.log('The API returned an error: ' + err);
                return console.log(err);
            }
        });
    })
    .catch((err) => {
        console.log('auth error', err);
    });

  parsedData[(playerID - 2)].team = newTeamNumber;  //update local db parsedData with new team value
    
	res.redirect("back");
});


// 404 ROUTE
app.get("/*", function (req, res) {
	res.render("404");
});

app.listen(process.env.PORT, process.env.IP, function(){
	console.log("Citi Open application server has started");
});