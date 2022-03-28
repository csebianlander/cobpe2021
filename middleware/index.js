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
		var newNote = { ballperson: note[0], author: note[1], timestamp: note[2], category: note[3], score: note[4], note: note[5]};
		
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
      if (note.score !== "" && note.score > 0 && note.score <= 10) {
        var scoreNum = parseInt(note.score);
        scoreSum = scoreSum + scoreNum;
        scoreCount++;
      }
    });
    
    if (scoreCount > 0) { ballperson.averageScore = ((scoreSum / scoreCount) / 2); }
    else { ballperson.averageScore = -1; }
    
  });
  
	return initialDatabase;
}

middlewareObj.parseCalendar = function(data, teamCount) {
	// The calendar is the FULL dataset from the Schedule tab.
	// Used for the calendar view.

	table = [];

	data.forEach(function(row) {
		table.push(row);
	});

	return table;
}

middlewareObj.parseSchedule = function(data, teamCount) {
	// The schedule is the FILTERED data of immediate team assignments.
	// Used for ballperson and team views.

	var today = new Date();
	var teamAssignments = [];

	var currentHour = today.getHours();
	if (currentHour < 5) { currentHour += 24; }

	currentHour -= 5;


	var currentMinutes = today.getMinutes();

	console.log(currentHour + ", " + currentMinutes);

	for (i = 0; i < teamCount; i++) { teamAssignments.push("Not scheduled");	}

	data.forEach(function(row) {
		rowTime = row.shift();

		if (rowTime === "12:00 AM") { rowHour = 24; } else {
			rowHour = parseInt(rowTime.split(":")[0]);
			if (rowTime.endsWith("PM") && rowHour !== 12) { rowHour = rowHour + 12; }
		}

		console.log(rowHour);

		row.forEach(function(cell, location) {
			if (cell) {
				if (teamAssignments[cell - 1] === "Not scheduled") {
					if (currentHour === rowHour && currentMinutes <= 15) {
						teamAssignments[cell - 1] = data[0][location] + " at " + rowTime;
					}
					else if (currentHour < rowHour) {
						teamAssignments[cell - 1] = data[0][location] + " at " + rowTime;
					}
				}
			}
		});
	});

	return teamAssignments;
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