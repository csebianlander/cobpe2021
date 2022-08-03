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
            ranges: ["Biographical!A:P", "Notes!A:J", "Schedule!A:G"],
        }, function (err, response) {
            if (err) {
                console.log('The API returned an error: ' + err);
                return console.log(err);
            }
			unparsedData = [response.valueRanges[0].values, response.valueRanges[1].values];
            parsedData = middleware.parseInitialDatabase(unparsedData);
			teamCount = middleware.determineTeamCount(parsedData);
            calendarData = middleware.parseCalendar(response.valueRanges[2].values);

            scheduleData = middleware.parseSchedule(response.valueRanges[2].values, teamCount);
            console.log("Database loaded.");
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
    res.locals.calendar = calendarData;
    next();
});  

// USE ROUTES
app.use("/", indexRoutes);
app.use("/", authRoutes);


// GSHEETS ROUTES (here so the gSheets dependencies are in place and so it has quick access to the db)

// ADD COMMENT ROUTE 
app.post("/player/:id", middleware.isLoggedIn, function(req, res) {
	var newDate = new Date();
	console.log ('newDate: ' + newDate);
    var estDate = moment(newDate).utcOffset(-240);
	var noteDate = moment(estDate).format('dddd, MMMM D, h:mm a');
	console.log('noteDate: ' + noteDate);
	
    var stickerCheck = parseInt(req.body.sticker);
    console.log('stickerCheck: ' + stickerCheck);

    var scoreOverallInt = parseInt(req.body.noteOverallScore);
    var scoreAthInt = parseInt(req.body.ath);
    var scoreRolInt = parseInt(req.body.rol);
    var scoreAwaInt = parseInt(req.body.awa);
    var scoreDecInt = parseInt(req.body.dec);
    var scoreEffInt = parseInt(req.body.eff);

    if (stickerCheck === 0) {
        var newNote = {
            range: "Notes",
            majorDimension: "ROWS",
            values: [[
                req.body.noteBallperson,
                req.user.username,
                noteDate,
                req.body.noteNote,
                scoreOverallInt,
                scoreAthInt,
                scoreRolInt,
                scoreAwaInt,
                scoreDecInt,
                scoreEffInt
            ]],
        };

        var newPushNote = {
            ballperson: newNote.values[0][0],
            author: newNote.values[0][1],
            timestamp: newNote.values[0][2],
            note: newNote.values[0][3],
            scoreOverall: newNote.values[0][4],
            scoreAthleticism: newNote.values[0][5],
            scoreRolling: newNote.values[0][6],
            scoreAwareness: newNote.values[0][7],
            scoreDecisionmaking: newNote.values[0][8],
            scoreEffort: newNote.values[0][9],
        };

        var checkForScores = 0;
        checkForScores += newPushNote.scoreOverall;
        checkForScores += newPushNote.scoreAthleticism;
        checkForScores += newPushNote.scoreRolling;
        checkForScores += newPushNote.scoreAwareness;
        checkForScores += newPushNote.scoreDecisionmaking;
        checkForScores += newPushNote.scoreEffort;

	console.log('checkForScores: ' + checkForScores);
	    
        if (newPushNote.note || checkForScores > 0) {
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
        var s = stickerCheck - 1;

        stickerValues = [
        ["Rolling", 10, "Great rolls"],
        ["Rolling", 2, "Poor rolls"],
        ["Athleticism", 10, "Great hands"],
        ["Athleticism", 2, "Poor hands"],
        ["Athleticism", 10, "Great speed"],
        ["Athleticism", 2, "Poor speed"],
        ["Effort", 10, "Great attitude"],
        ["Effort", 2, "Poor attitude"],
        ["Awareness", 10, "Great awareness"],
        ["Awareness", 2, "Poor awareness"],
        ["Effort", 10, "Great effort"],
        ["Effort", 2, "Poor effort"],
        ];

        var stickerOverall = "";
        var stickerAthleticism = "";
        var stickerRolling = "";
        var stickerAwareness = "";
        var stickerDecisionmaking = "";
        var stickerEffort = "";

        if (stickerValues[s][0] == "Overall") {
            var stickerOverall = stickerValues[s][1];
        }
        else if (stickerValues[s][0] == "Athleticism") {
            var stickerAthleticism = stickerValues[s][1];
        }
        else if (stickerValues[s][0] == "Rolling") {
            var stickerRolling = stickerValues[s][1];
        } 
        else if (stickerValues[s][0] == "Awareness") {
            var stickerAwareness = stickerValues[s][1];
        } 
        else if (stickerValues[s][0] == "Decisionmaking") {
            var stickerDecisionmaking = stickerValues[s][1];
        } 
        else if (stickerValues[s][0] == "Effort") {
            var stickerEffort = stickerValues[s][1];
        } 


        var stickerNote = {
            ballperson: req.body.noteBallperson,
            author: req.user.username,
            timestamp: noteDate,
            note: stickerValues[s][2],
            scoreOverall: stickerOverall,
            scoreAthleticism: stickerAthleticism,
            scoreRolling: stickerRolling,
            scoreAwareness: stickerAwareness,
            scoreDecisionmaking: stickerDecisionmaking,
            scoreEffort: stickerEffort,
        };

        var stkNoteSend = {
            range: "Notes",
            majorDimension: "ROWS",
            values: [[
                stickerNote.ballperson,
                stickerNote.author,
                stickerNote.timestamp,
                stickerNote.note,
                stickerNote.scoreOverall,
                stickerNote.scoreAthleticism,
                stickerNote.scoreRolling,
                stickerNote.scoreAwareness,
                stickerNote.scoreDecisionmaking,
                stickerNote.scoreEffort
            ]],
        };


        googleAuth.authorize()
            .then((auth) => {
                sheetsApi.spreadsheets.values.append({
                    auth: auth,
                    spreadsheetId: SPREADSHEET_ID,
                    range: ["Notes"],
                                valueInputOption: "RAW",
                                insertDataOption: "INSERT_ROWS",
                                resource: stkNoteSend
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

        parsedData[(req.params.id - 1)].notes.push(stickerNote);

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
            ranges: ["Biographical!A:P", "Notes!A:J", "Schedule!A:G"],
        }, function (err, response) {
            if (err) {
                console.log('The API returned an error: ' + err);
                return console.log(err);
            }
            unparsedData = [response.valueRanges[0].values, response.valueRanges[1].values];
            parsedData = middleware.parseInitialDatabase(unparsedData);
            teamCount = middleware.determineTeamCount(parsedData);
            calendarData = middleware.parseCalendar(response.valueRanges[2].values);
            scheduleData = middleware.parseSchedule(response.valueRanges[2].values, teamCount);
            console.log("Database reloaded.");
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
