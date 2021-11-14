var google = require('googleapis'),
		sheetsApi = google.sheets('v4'),
//     moment = require("moment"),
		googleAuth = require('../g-auth');

var middlewareObj = {};

middlewareObj.isLoggedIn = function(req, res, next){
  if (req.isAuthenticated()) {
    return next();
  }
	res.redirect("/login");
}

middlewareObj.parseInitialDatabase = function (data) {
	var initialDatabase = [];
	var idNum = 0;
	
	var bioData = data[0];
	var notes = data[1];
	
	bioData.forEach(function(row) {
		var newObj = {
			ID: idNum,
			team: row[0].trim(),
			firstName: row[1].trim(),
			lastName: row[2].trim(),
			gender: row[3],
			homeAddress: row[5],
			Phone: row[6],
			emailAddress: row[7],
			ecName: row[8],
			ecRel: row[9],
			ecPhone: row[10],
			yearsExperience: row[11],
			position: row[12],
			captain: row[13],
			age: row[14],
      headshot: row[15],
			notes: [],
      averageScore: -1
		};
		initialDatabase.push(newObj);
		idNum++;
	});
	
	initialDatabase.shift(); //removes the header row

  
	notes.forEach(function(note) {
		var newNote = { ballperson: note[0], author: note[1], timestamp: note[2], note: note[3], score: note[4]};
		
		initialDatabase.forEach(function(row) {
			if (newNote.ballperson === (row.firstName + " " + row.lastName)) {
				row.notes.push(newNote);		
			}
		});
	});

  //average scores and add to ballperson object
  initialDatabase.forEach(function(ballperson) {
    var scoreCount = 0;
    var scoreSum = 0;
    
    ballperson.notes.forEach(function(note) {
      if (note.score !== "" && note.score > 0 && note.score <= 5) {
        var scoreNum = parseInt(note.score);
        scoreSum = scoreSum + scoreNum;
        scoreCount++;
      }
    });
    
    if (scoreCount > 0) { ballperson.averageScore = (scoreSum / scoreCount); }
    else { ballperson.averageScore = -1; }
    
  });
  
	return initialDatabase;
}

middlewareObj.determineTeamCount = function(data) {
	var teamNumbers = [];
	
	data.forEach(function(ballperson) {
		if (ballperson.team) {	//sanity check: ignores blank/undefined
			teamNumbers.push(Number(ballperson.team));	
		}
	});
	
	var max = 0;
	
	teamNumbers.forEach(function(number) {
		if (number > max) { max = number;	}
	})

	return max;
}

module.exports = middlewareObj;