$('.ui.accordion')
	.accordion()
;

$('.ui.dropdown')
	.dropdown()
;

$('.message .close')
	.on('click', function() {
		$(this)
			.closest('.message')
			.cardsansition('fade')
		;
	})
;

function searchFilter() {
  // Declare variables 
  var input, filter, table, cards, searchName, i;
  input = document.getElementById("searchInput");
  filter = input.value.toUpperCase();
  table = document.getElementById("allNames");
  cards = table.getElementsByTagName("a");

  // Loop through all table rows, and hide those who don't match the search query
  for (i = 0; i < cards.length; i++) {
    searchName = cards[i].getElementsByClassName("header")[0];
		console.log(searchName);
    if (searchName) {
      if (searchName.innerHTML.toUpperCase().indexOf(filter) > -1) {
        cards[i].style.display = "";
      } else {
        cards[i].style.display = "none";
      }
    } 
  }
}

function openAnchorAccordion() {
	var openAccordion = Number(window.location.hash.substr(1));	//will return NaN if not a number
	
	if (openAccordion) {	// NaN is false
		var titles = document.getElementsByClassName("accordionTitle");
		var contents = document.getElementsByClassName("accordionContent");
		var toggle = openAccordion - 1;	// shifting hash to match array
		
		$(titles[toggle]).addClass("active");
		$(contents[toggle]).addClass("active");
		
		$('html, body').animate({	// scrolls to active content
        scrollTop: $(titles[toggle - 1]).offset().top
    }, 1000);
				
	}
}